const mongoose  = require('mongoose');
const dotenv    = require('dotenv');
const fs        = require('fs').promises;
const fsSync    = require('fs');
const path      = require('path');

dotenv.config({ path: path.join(__dirname, '../.env') });

const { generateEmbedding }  = require('../utils/embeddings');
const {
  createCollection,
  deleteCollection,
  insertDocuments,
  getCollectionInfo,
} = require('../utils/qdrant');
const KnowledgeSource = require('../models/KnowledgeSource');

// ── Config ────────────────────────────────────────────────
const DATA_FILE      = path.join(__dirname, '../data/processed_islamic_data.json');
const PROGRESS_FILE  = path.join(__dirname, '../data/load_progress.json');
const BATCH_SIZE     = 25;

// ── Helpers ──────────────────────────────────────────────
const delay = ms => new Promise(r => setTimeout(r, ms));

function formatTime(ms) {
  const s = Math.floor(ms / 1000);
  const m = Math.floor(s / 60);
  const h = Math.floor(m / 60);
  if (h > 0) return `${h}h ${m % 60}m ${s % 60}s`;
  if (m > 0) return `${m}m ${s % 60}s`;
  return `${s}s`;
}

// Clean a document - handle missing/null fields
function sanitizeDoc(doc) {
  return {
    source_type:  doc.source_type  || 'Hadith',
    reference:    doc.reference    || 'Unknown Reference',
    arabic_text:  doc.arabic_text  || '',
    english_text: doc.english_text || doc.arabic_text || doc.reference || '',
    context:      doc.context      || '',
    tags:         Array.isArray(doc.tags) ? doc.tags : [],
  };
}

// Check if document has valid text for embedding
function hasValidText(doc) {
  const text = doc.english_text || doc.arabic_text || '';
  return text.trim().length > 5; // At least 5 characters
}

// Save progress so we can resume if crashed
function saveProgress(index) {
  fsSync.writeFileSync(PROGRESS_FILE, JSON.stringify({ lastIndex: index }), 'utf8');
}

// Load progress to resume from where we left off
function loadProgress() {
  try {
    if (fsSync.existsSync(PROGRESS_FILE)) {
      const data = JSON.parse(fsSync.readFileSync(PROGRESS_FILE, 'utf8'));
      return data.lastIndex || 0;
    }
  } catch {
    // ignore
  }
  return 0;
}

// Clear progress file after successful load
function clearProgress() {
  try {
    if (fsSync.existsSync(PROGRESS_FILE)) {
      fsSync.unlinkSync(PROGRESS_FILE);
    }
  } catch { /* ignore */ }
}

// ── Main ─────────────────────────────────────────────────
async function loadData() {
  console.log('╔═══════════════════════════════════════════════════════╗');
  console.log('║      Loading Islamic Data → MongoDB + Vector DB       ║');
  console.log('╚═══════════════════════════════════════════════════════╝\n');

  const startTime = Date.now();

  try {
    // ── 1. Connect MongoDB ───────────────────────────────
    console.log('🔌 Connecting to MongoDB...');
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('   ✅ MongoDB connected\n');

    // ── 2. Load processed JSON ───────────────────────────
    console.log('📂 Reading processed data file...');
    let allDocuments;
    try {
      const raw = await fs.readFile(DATA_FILE, 'utf8');
      allDocuments = JSON.parse(raw);
    } catch (e) {
      console.error('   ❌ Could not read data file:', e.message);
      console.error('   → Run "npm run process-data" first!');
      process.exit(1);
    }

    // ── 3. Filter out invalid documents ─────────────────
    console.log(`   📊 Total documents in file: ${allDocuments.length}`);
    const validDocs = allDocuments.filter(hasValidText);
    const skipped   = allDocuments.length - validDocs.length;
    console.log(`   ✅ Valid documents: ${validDocs.length}`);
    if (skipped > 0) {
      console.log(`   ⚠️  Skipped ${skipped} documents with empty text\n`);
    } else {
      console.log();
    }

    // ── 4. Check for resume progress ────────────────────
    const resumeFrom = loadProgress();

    if (resumeFrom > 0) {
      console.log(`♻️  Resuming from document ${resumeFrom} (previous run was interrupted)\n`);
    } else {
      // Fresh start - setup databases
      console.log('🔌 Setting up Vector DB...');
      await deleteCollection();
      await createCollection();
      console.log('   ✅ Vector DB ready\n');

      console.log('🗑️  Clearing existing MongoDB data...');
      await KnowledgeSource.deleteMany({});
      console.log('   ✅ MongoDB cleared\n');
    }

    // ── 5. Process in batches ────────────────────────────
    const docs         = validDocs.slice(resumeFrom);
    const totalBatches = Math.ceil(docs.length / BATCH_SIZE);
    let   loaded       = resumeFrom;
    let   qdrantId     = resumeFrom + 1;
    let   errorCount   = 0;

    console.log(`🚀 Processing ${docs.length} documents in ${totalBatches} batches (${BATCH_SIZE}/batch)\n`);

    for (let i = 0; i < docs.length; i += BATCH_SIZE) {
      const batchNum    = Math.floor(i / BATCH_SIZE) + 1;
      const batch       = docs.slice(i, i + BATCH_SIZE);
      const progress    = ((i / docs.length) * 100).toFixed(1);
      const elapsed     = Date.now() - startTime;
      const rate        = loaded / (elapsed / 1000) || 0;
      const remaining   = docs.length - i;
      const eta         = rate > 0 ? formatTime((remaining / rate) * 1000) : 'calculating...';

      process.stdout.write(
        `   📦 Batch ${batchNum}/${totalBatches} [${progress}%] ETA: ${eta} ...`
      );

      const withEmbeddings = [];
      let   batchErrors    = 0;

      for (const rawDoc of batch) {
        try {
          // Sanitize the document
          const doc = sanitizeDoc(rawDoc);

          // Get the text to embed (prefer English, fallback to reference)
          const textToEmbed = doc.english_text || doc.arabic_text || doc.reference;

          // Save to MongoDB
          await KnowledgeSource.create(doc);

          // Generate embedding
          const embedding = await generateEmbedding(textToEmbed);

          withEmbeddings.push({
            text:        doc.english_text,
            source_type: doc.source_type,
            reference:   doc.reference,
            embedding,
          });

        } catch (docError) {
          batchErrors++;
          errorCount++;
          // Skip this document and continue
          if (docError.name === 'ValidationError') {
            // Silently skip validation errors
          } else {
            console.error(`\n   ⚠️  Doc error: ${docError.message}`);
          }
        }
      }

      // Insert valid docs into vector DB
      if (withEmbeddings.length > 0) {
        await insertDocuments(withEmbeddings, qdrantId);
      }

      qdrantId += withEmbeddings.length;
      loaded   += batch.length;

      // Save progress after each batch
      saveProgress(resumeFrom + i + batch.length);

      const errStr = batchErrors > 0 ? ` (${batchErrors} skipped)` : '';
      process.stdout.write(` ✓${errStr} [${loaded}/${validDocs.length}]\n`);

      // Pause every 20 batches to avoid memory issues
      if (batchNum % 20 === 0) {
        await delay(500);
      }
    }

    // ── 6. Verify ────────────────────────────────────────
    console.log('\n🔍 Verifying databases...');
    const mongoCount = await KnowledgeSource.countDocuments();
    console.log(`   ✅ MongoDB documents : ${mongoCount}`);
    await getCollectionInfo();

    // ── 7. Clear progress file ───────────────────────────
    clearProgress();

    // ── 8. Summary ───────────────────────────────────────
    const totalTime = formatTime(Date.now() - startTime);

    console.log('\n╔═══════════════════════════════════════════════════════╗');
    console.log('║              LOADING COMPLETE! 🎉                    ║');
    console.log('╚═══════════════════════════════════════════════════════╝\n');
    console.log('📊 Final Statistics:');
    console.log(`   • Valid documents  : ${validDocs.length}`);
    console.log(`   • Skipped (empty)  : ${skipped}`);
    console.log(`   • Errors skipped   : ${errorCount}`);
    console.log(`   • MongoDB count    : ${mongoCount}`);
    console.log(`   • Time taken       : ${totalTime}`);
    console.log('\n✅ Run "npm run dev" to start the server!\n');

    await mongoose.connection.close();

  } catch (error) {
    console.error('\n❌ Fatal error:', error.message);
    console.log('💡 Progress saved. Run "npm run load-data" again to resume.\n');
    process.exit(1);
  }
}

loadData();
const fs = require('fs').promises;
const path = require('path');

// ═══════════════════════════════════════════════════════════
// DATA PROCESSING & FORMATTING
// ═══════════════════════════════════════════════════════════

const INPUT_DIR = path.join(__dirname, '../data/raw');
const OUTPUT_FILE = path.join(__dirname, '../data/processed_islamic_data.json');

// Extract keywords for better tagging
function extractKeywords(text) {
  const keywordMap = {
    prayer: ['pray', 'prayer', 'salah', 'salat', 'namaz', 'prostration', 'rakat'],
    fasting: ['fast', 'fasting', 'ramadan', 'sawm', 'siyam', 'iftar', 'suhoor'],
    zakat: ['zakat', 'charity', 'alms', 'sadaqah', 'zakah'],
    hajj: ['hajj', 'pilgrimage', 'kaaba', 'mecca', 'umrah', 'tawaf', 'safa', 'marwah'],
    faith: ['faith', 'believe', 'belief', 'iman', 'conviction'],
    prophet: ['prophet', 'messenger', 'muhammad', 'rasul', 'nabiy'],
    allah: ['allah', 'god', 'lord', 'creator', 'rabb'],
    quran: ['quran', 'koran', 'revelation', 'book', 'scripture'],
    death: ['death', 'grave', 'afterlife', 'judgment', 'paradise', 'hell'],
    family: ['marriage', 'divorce', 'wife', 'husband', 'children', 'family'],
    halal: ['halal', 'haram', 'permissible', 'forbidden', 'lawful'],
    ethics: ['honesty', 'truthful', 'kindness', 'mercy', 'justice', 'character'],
    knowledge: ['knowledge', 'learn', 'study', 'education', 'wisdom'],
    purification: ['wudu', 'ghusl', 'ablution', 'purification', 'clean']
  };
  
  const tags = [];
  const lowerText = text.toLowerCase();
  
  for (const [category, keywords] of Object.entries(keywordMap)) {
    if (keywords.some(keyword => lowerText.includes(keyword))) {
      tags.push(category);
    }
  }
  
  return tags.length > 0 ? tags : ['general'];
}

// Process Quran verses
async function processQuranData() {
  console.log('📖 Processing Quran data...');
  
  try {
    const filepath = path.join(INPUT_DIR, 'quran_verses_complete.json');
    const rawData = await fs.readFile(filepath, 'utf8');
    const verses = JSON.parse(rawData);
    
    const processed = verses.map(verse => ({
      source_type: 'Quran',
      reference: `Surah ${verse.chapter_name} ${verse.chapter_id}:${verse.verse_number}`,
      arabic_text: verse.arabic_text,
      english_text: verse.english_text,
      context: `Verse ${verse.verse_number} from Surah ${verse.chapter_name} (Chapter ${verse.chapter_id})`,
      tags: [
        'Quran',
        verse.chapter_name,
        `Chapter${verse.chapter_id}`,
        `Juz${verse.juz}`,
        ...extractKeywords(verse.english_text)
      ],
      metadata: {
        chapter_id: verse.chapter_id,
        verse_number: verse.verse_number,
        juz: verse.juz,
        page: verse.page
      }
    }));
    
    console.log(`   ✅ Processed ${processed.length} Quran verses`);
    return processed;
    
  } catch (error) {
    console.error('   ❌ Error processing Quran data:', error.message);
    return [];
  }
}

// Process Hadith collections
async function processHadithData() {
  console.log('📚 Processing Hadith data...');
  
  const collections = [
    { file: 'hadith_bukhari.json', name: 'Sahih Bukhari' },
    { file: 'hadith_muslim.json', name: 'Sahih Muslim' },
    { file: 'hadith_abudawud.json', name: 'Abu Dawud' },
    { file: 'hadith_tirmidhi.json', name: 'Tirmidhi' },
    { file: 'hadith_nasai.json', name: "Nasa'i" },
    { file: 'hadith_ibnmajah.json', name: 'Ibn Majah' }
  ];
  
  const allHadiths = [];
  
  for (const collection of collections) {
    try {
      const filepath = path.join(INPUT_DIR, collection.file);
      const rawData = await fs.readFile(filepath, 'utf8');
      const hadiths = JSON.parse(rawData);
      
      const processed = hadiths.map(hadith => ({
        source_type: 'Hadith',
        reference: `${collection.name} ${hadith.hadithnumber}`,
        english_text: hadith.text,
        arabic_text: hadith.arabictext || '',
        context: `Hadith from ${collection.name}`,
        tags: [
          'Hadith',
          collection.name,
          ...extractKeywords(hadith.text)
        ],
        metadata: {
          hadith_number: hadith.hadithnumber,
          collection: collection.name
        }
      }));
      
      allHadiths.push(...processed);
      console.log(`   ✅ Processed ${processed.length} hadiths from ${collection.name}`);
      
    } catch (error) {
      console.error(`   ⚠️  Could not process ${collection.name}:`, error.message);
    }
  }
  
  console.log(`   ✅ Total hadiths processed: ${allHadiths.length}`);
  return allHadiths;
}

// Main processing function
async function processAllData() {
  console.log('╔═══════════════════════════════════════════════════════╗');
  console.log('║      Data Processing - Preparing for Database         ║');
  console.log('╚═══════════════════════════════════════════════════════╝\n');
  
  try {
    // Process both datasets
    const quranData = await processQuranData();
    const hadithData = await processHadithData();
    
    // Combine
    const allData = [...quranData, ...hadithData];
    
    // Save processed data
    await fs.writeFile(OUTPUT_FILE, JSON.stringify(allData, null, 2), 'utf8');
    
    console.log('\n╔═══════════════════════════════════════════════════════╗');
    console.log('║           PROCESSING COMPLETE!                        ║');
    console.log('╚═══════════════════════════════════════════════════════╝\n');
    console.log(`📊 Summary:`);
    console.log(`   • Quran verses: ${quranData.length}`);
    console.log(`   • Hadiths: ${hadithData.length}`);
    console.log(`   • Total documents: ${allData.length}`);
    console.log(`   • Output file: ${OUTPUT_FILE}`);
    console.log(`   • File size: ${(JSON.stringify(allData).length / 1024 / 1024).toFixed(2)} MB\n`);
    
    console.log('✅ Next step: Run "npm run load-data" to upload to databases\n');
    
  } catch (error) {
    console.error('❌ Processing error:', error);
    process.exit(1);
  }
}

if (require.main === module) {
  processAllData();
}

module.exports = { processAllData };
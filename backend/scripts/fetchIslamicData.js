const fs = require('fs').promises;
const path = require('path');

// ═══════════════════════════════════════════════════════════
// CONFIGURATION
// ═══════════════════════════════════════════════════════════

const CONFIG = {
  OUTPUT_DIR: path.join(__dirname, '../data/raw'),

  HADITH_COLLECTIONS: [
    { name: 'bukhari',   displayName: 'Sahih Bukhari', filename: 'eng-bukhari'  },
    { name: 'muslim',    displayName: 'Sahih Muslim',  filename: 'eng-muslim'   },
    { name: 'abudawud',  displayName: 'Abu Dawud',     filename: 'eng-abudawud' },
    { name: 'tirmidhi',  displayName: 'Tirmidhi',      filename: 'eng-tirmidhi' },
    { name: 'nasai',     displayName: "Nasa'i",         filename: 'eng-nasai'    },
    { name: 'ibnmajah',  displayName: 'Ibn Majah',     filename: 'eng-ibnmajah' }
  ]
};

// ═══════════════════════════════════════════════════════════
// UTILITY FUNCTIONS
// ═══════════════════════════════════════════════════════════

const delay = ms => new Promise(resolve => setTimeout(resolve, ms));

async function ensureOutputDir() {
  await fs.mkdir(CONFIG.OUTPUT_DIR, { recursive: true });
  console.log(`✅ Output directory ready: ${CONFIG.OUTPUT_DIR}\n`);
}

async function saveToFile(filename, data) {
  const filepath = path.join(CONFIG.OUTPUT_DIR, filename);
  await fs.writeFile(filepath, JSON.stringify(data, null, 2), 'utf8');
  console.log(`   💾 Saved: ${filename}`);
}

// Safe fetch with retry logic
async function safeFetch(url, retries = 3) {
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      const response = await fetch(url);
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      return await response.json();
    } catch (error) {
      if (attempt === retries) throw error;
      console.log(`      ⚠️  Retry ${attempt}/${retries}...`);
      await delay(1000 * attempt); // 1s, 2s, 3s backoff
    }
  }
}

// ═══════════════════════════════════════════════════════════
// QURAN DATA FETCHING - USING ALTERNATIVE FREE API
// Uses: https://cdn.jsdelivr.net/gh/fawazahmed0/quran-api@1
// This CDN has no rate limits and works reliably
// ═══════════════════════════════════════════════════════════

async function fetchQuranData() {
  console.log('📖 Fetching Complete Quran Data...\n');

  try {
    // ── Option A: Try the CDN first (fastest, most reliable) ──
    console.log('   Trying CDN source (fawazahmed0/quran-api)...');

    const CDN_BASE = 'https://cdn.jsdelivr.net/gh/fawazahmed0/quran-api@1/editions';

    // Fetch English translation
    console.log('   Downloading English translation...');
    const engData = await safeFetch(`${CDN_BASE}/eng-kquran.json`);

    // Fetch Arabic text
    console.log('   Downloading Arabic text...');
    const araData = await safeFetch(`${CDN_BASE}/ara-quran.json`);

    if (!engData || !engData.chapter) {
      throw new Error('Invalid response from CDN');
    }

    const allVerses = [];
    let verseCount = 0;

    // Chapter names mapping
    const chapterNames = [
      "Al-Fatihah", "Al-Baqarah", "Ali 'Imran", "An-Nisa", "Al-Ma'idah",
      "Al-An'am", "Al-A'raf", "Al-Anfal", "At-Tawbah", "Yunus",
      "Hud", "Yusuf", "Ar-Ra'd", "Ibrahim", "Al-Hijr",
      "An-Nahl", "Al-Isra", "Al-Kahf", "Maryam", "Ta-Ha",
      "Al-Anbya", "Al-Hajj", "Al-Mu'minun", "An-Nur", "Al-Furqan",
      "Ash-Shu'ara", "An-Naml", "Al-Qasas", "Al-'Ankabut", "Ar-Rum",
      "Luqman", "As-Sajdah", "Al-Ahzab", "Saba", "Fatir",
      "Ya-Sin", "As-Saffat", "Sad", "Az-Zumar", "Ghafir",
      "Fussilat", "Ash-Shura", "Az-Zukhruf", "Ad-Dukhan", "Al-Jathiyah",
      "Al-Ahqaf", "Muhammad", "Al-Fath", "Al-Hujurat", "Qaf",
      "Adh-Dhariyat", "At-Tur", "An-Najm", "Al-Qamar", "Ar-Rahman",
      "Al-Waqi'ah", "Al-Hadid", "Al-Mujadila", "Al-Hashr", "Al-Mumtahanah",
      "As-Saf", "Al-Jumu'ah", "Al-Munafiqun", "At-Taghabun", "At-Talaq",
      "At-Tahrim", "Al-Mulk", "Al-Qalam", "Al-Haqqah", "Al-Ma'arij",
      "Nuh", "Al-Jinn", "Al-Muzzammil", "Al-Muddaththir", "Al-Qiyamah",
      "Al-Insan", "Al-Mursalat", "An-Naba", "An-Nazi'at", "Abasa",
      "At-Takwir", "Al-Infitar", "Al-Mutaffifin", "Al-Inshiqaq", "Al-Buruj",
      "At-Tariq", "Al-A'la", "Al-Ghashiyah", "Al-Fajr", "Al-Balad",
      "Ash-Shams", "Al-Layl", "Ad-Duha", "Ash-Sharh", "At-Tin",
      "Al-'Alaq", "Al-Qadr", "Al-Bayyinah", "Az-Zalzalah", "Al-'Adiyat",
      "Al-Qari'ah", "At-Takathur", "Al-'Asr", "Al-Humazah", "Al-Fil",
      "Quraysh", "Al-Ma'un", "Al-Kawthar", "Al-Kafirun", "An-Nasr",
      "Al-Masad", "Al-Ikhlas", "Al-Falaq", "An-Nas"
    ];

    // Process each chapter
    for (const [chapterIdStr, verses] of Object.entries(engData.chapter)) {
      const chapterId = parseInt(chapterIdStr);
      const chapterName = chapterNames[chapterId - 1] || `Chapter ${chapterId}`;
      const arabicChapter = araData.chapter[chapterIdStr] || {};

      process.stdout.write(`   [${((chapterId / 114) * 100).toFixed(1)}%] Chapter ${chapterId}/114: ${chapterName} (${Object.keys(verses).length} verses)\r`);

      for (const [verseNumStr, engText] of Object.entries(verses)) {
        const verseNum = parseInt(verseNumStr);
        const arabicText = arabicChapter[verseNumStr] || '';

        allVerses.push({
          chapter_id:        chapterId,
          chapter_name:      chapterName,
          verse_number:      verseNum,
          verse_key:         `${chapterId}:${verseNum}`,
          arabic_text:       arabicText,
          english_text:      engText,
        });

        verseCount++;
      }
    }

    console.log(`\n   ✅ Successfully fetched ${verseCount} Quran verses from CDN`);
    await saveToFile('quran_verses_complete.json', allVerses);
    console.log();
    return allVerses;

  } catch (cdnError) {
    console.log(`\n   ⚠️  CDN failed: ${cdnError.message}`);
    console.log('   🔄 Trying backup source (quran.com API)...\n');

    // ── Option B: Fallback to quran.com API ──
    return await fetchQuranFromQuranCom();
  }
}

// Backup: Fetch from quran.com API
async function fetchQuranFromQuranCom() {
  const QURAN_API = 'https://api.quran.com/api/v4';
  const allVerses = [];

  // First get all chapter names
  console.log('   Fetching chapter list from quran.com...');
  const chaptersRes = await safeFetch(`${QURAN_API}/chapters?language=en`);
  const chapters = chaptersRes.chapters;
  console.log(`   ✅ Got ${chapters.length} chapters\n`);

  for (const chapter of chapters) {
    let page = 1;
    let hasMore = true;
    const chapterVerses = [];

    while (hasMore) {
      try {
        // Fetch page by page
        const url = `${QURAN_API}/verses/by_chapter/${chapter.id}?language=en&translations=131&fields=text_uthmani&page=${page}&per_page=50`;
        const data = await safeFetch(url);

        if (!data || !data.verses || data.verses.length === 0) {
          hasMore = false;
          break;
        }

        data.verses.forEach(verse => {
          // Get translation safely
          const translation = verse.translations && verse.translations.length > 0
            ? verse.translations[0].text.replace(/<[^>]*>/g, '').trim()
            : '';

          chapterVerses.push({
            chapter_id:    chapter.id,
            chapter_name:  chapter.name_simple,
            verse_number:  verse.verse_number,
            verse_key:     verse.verse_key,
            arabic_text:   verse.text_uthmani || '',
            english_text:  translation,
          });
        });

        // Check if there are more pages
        hasMore = data.meta && data.meta.current_page < data.meta.total_pages;
        page++;

        await delay(200); // Respect rate limits

      } catch (error) {
        console.error(`\n   ❌ Error on Chapter ${chapter.id} page ${page}: ${error.message}`);
        hasMore = false;
      }
    }

    process.stdout.write(`   Chapter ${chapter.id}/114: ${chapter.name_simple} - ${chapterVerses.length} verses fetched\r`);
    allVerses.push(...chapterVerses);

    await delay(300); // Between chapters
  }

  console.log(`\n   ✅ Fetched ${allVerses.length} verses from quran.com`);
  return allVerses;
}

// ═══════════════════════════════════════════════════════════
// HADITH DATA FETCHING
// ═══════════════════════════════════════════════════════════

async function fetchHadithCollection(collection) {
  const HADITH_CDN = 'https://cdn.jsdelivr.net/gh/fawazahmed0/hadith-api@1';
  const url = `${HADITH_CDN}/editions/${collection.filename}.json`;

  try {
    process.stdout.write(`   📚 Fetching ${collection.displayName}...`);
    const data = await safeFetch(url);
    const hadiths = data.hadiths || [];

    console.log(` ✅ ${hadiths.length} hadiths`);
    await saveToFile(`hadith_${collection.name}.json`, hadiths);

    return { ...collection, count: hadiths.length, hadiths };

  } catch (error) {
    console.log(` ❌ Failed: ${error.message}`);
    return { ...collection, count: 0, hadiths: [], error: error.message };
  }
}

async function fetchAllHadiths() {
  console.log('📚 Fetching Hadith Collections...\n');

  const results = [];

  for (const collection of CONFIG.HADITH_COLLECTIONS) {
    const result = await fetchHadithCollection(collection);
    results.push(result);
    await delay(500);
  }

  const total = results.reduce((s, r) => s + r.count, 0);
  const ok    = results.filter(r => !r.error).length;

  console.log(`\n   📊 Summary: ${ok}/${CONFIG.HADITH_COLLECTIONS.length} collections, ${total} total hadiths`);
  await saveToFile('hadith_summary.json', {
    fetchedAt: new Date().toISOString(),
    collections: results.map(r => ({ name: r.displayName, count: r.count, error: r.error || null })),
    totalHadiths: total
  });

  console.log();
  return results;
}

// ═══════════════════════════════════════════════════════════
// MAIN EXECUTION
// ═══════════════════════════════════════════════════════════

async function fetchAllData() {
  console.log('╔═══════════════════════════════════════════════════════╗');
  console.log('║   Islamic Knowledge Base - Data Fetching Tool         ║');
  console.log('╚═══════════════════════════════════════════════════════╝\n');

  const startTime = Date.now();

  await ensureOutputDir();

  // Fetch Quran
  const quranVerses = await fetchQuranData();

  // Fetch Hadiths
  const hadithResults = await fetchAllHadiths();
  const totalHadiths  = hadithResults.reduce((s, r) => s + r.count, 0);

  const duration = ((Date.now() - startTime) / 60000).toFixed(2);

  console.log('╔═══════════════════════════════════════════════════════╗');
  console.log('║              FETCHING COMPLETE!                       ║');
  console.log('╚═══════════════════════════════════════════════════════╝\n');
  console.log(`📊 Final Statistics:`);
  console.log(`   • Quran verses : ${quranVerses.length}`);
  console.log(`   • Hadiths      : ${totalHadiths}`);
  console.log(`   • Total docs   : ${quranVerses.length + totalHadiths}`);
  console.log(`   • Time taken   : ${duration} minutes`);
  console.log(`   • Saved to     : ${CONFIG.OUTPUT_DIR}\n`);
  console.log('✅ Next step: Run "npm run process-data"\n');
}

fetchAllData();
const axios = require('axios');
const dotenv = require('dotenv');
dotenv.config();

const QDRANT_URL     = (process.env.QDRANT_URL || '').trim().replace(/\/$/, '');
const QDRANT_API_KEY = (process.env.QDRANT_API_KEY || '').trim();
const COLLECTION     = 'islamic_knowledge';

// ── Validate env vars on startup ──────────────────────────
if (!QDRANT_URL) {
  console.error('❌ QDRANT_URL is missing in .env');
  process.exit(1);
}
if (!QDRANT_API_KEY) {
  console.error('❌ QDRANT_API_KEY is missing in .env');
  process.exit(1);
}

console.log('🔗 Qdrant Base URL:', QDRANT_URL);

// ── Axios instance ─────────────────────────────────────────
const client = axios.create({
  baseURL: QDRANT_URL,
  timeout: 60000,
  headers: {
    'api-key':      QDRANT_API_KEY,
    'Content-Type': 'application/json',
  },
});

// ── Helper: log qdrant errors clearly ────────────────────
function qdrantError(label, error) {
  const status  = error.response?.status;
  const body    = JSON.stringify(error.response?.data);
  const message = error.message;
  console.error(`❌ ${label}: HTTP ${status} | ${body || message}`);
}

// ══════════════════════════════════════════════════════════
// 1. CHECK IF COLLECTION EXISTS
// ══════════════════════════════════════════════════════════
async function collectionExists() {
  try {
    const res = await client.get(`/collections/${COLLECTION}`);
    return res.status === 200;
  } catch {
    return false;
  }
}

// ══════════════════════════════════════════════════════════
// 2. DELETE COLLECTION (for fresh re-load)
// ══════════════════════════════════════════════════════════
async function deleteCollection() {
  try {
    await client.delete(`/collections/${COLLECTION}`);
    console.log('🗑️  Qdrant collection deleted');
  } catch (error) {
    if (error.response?.status !== 404) {
      qdrantError('deleteCollection', error);
    }
  }
}

// ══════════════════════════════════════════════════════════
// 3. CREATE COLLECTION
// ══════════════════════════════════════════════════════════
async function createCollection() {
  try {
    const exists = await collectionExists();

    if (exists) {
      console.log('ℹ️  Qdrant collection already exists — skipping creation');
      return;
    }

    await client.put(`/collections/${COLLECTION}`, {
      vectors: {
        size:     384,      // all-MiniLM-L6-v2 dimension
        distance: 'Cosine',
      },
    });

    console.log('✅ Qdrant collection created');
  } catch (error) {
    qdrantError('createCollection', error);
    throw error;
  }
}

// ══════════════════════════════════════════════════════════
// 4. GET CURRENT POINT COUNT (to generate unique IDs)
// ══════════════════════════════════════════════════════════
async function getCurrentPointCount() {
  try {
    const res = await client.get(`/collections/${COLLECTION}`);
    return res.data?.result?.points_count || 0;
  } catch {
    return 0;
  }
}

// ══════════════════════════════════════════════════════════
// 5. INSERT DOCUMENTS (with auto ID offset)
// ══════════════════════════════════════════════════════════
async function insertDocuments(documents, startId = 1) {
  if (!documents || documents.length === 0) return;

  try {
    const points = documents.map((doc, idx) => ({
      id:      startId + idx,
      vector:  doc.embedding,
      payload: {
        text:        doc.text,
        source_type: doc.source_type,
        reference:   doc.reference,
      },
    }));

    // Qdrant uses PUT /collections/{name}/points  (upsert)
    const res = await client.put(`/collections/${COLLECTION}/points`, {
      points,
    });

    if (res.data?.status !== 'ok' && res.data?.result?.status !== 'acknowledged') {
      console.warn('⚠️  Unexpected Qdrant response:', JSON.stringify(res.data));
    }

  } catch (error) {
    qdrantError('insertDocuments', error);
    throw error;
  }
}

// ══════════════════════════════════════════════════════════
// 6. SEARCH SIMILAR DOCUMENTS
// ══════════════════════════════════════════════════════════
async function searchSimilar(queryEmbedding, limit = 5) {
  try {
    const res = await client.post(`/collections/${COLLECTION}/points/search`, {
      vector:       queryEmbedding,
      limit,
      with_payload: true,
    });

    return res.data?.result || [];
  } catch (error) {
    qdrantError('searchSimilar', error);
    throw error;
  }
}

// ══════════════════════════════════════════════════════════
// 7. GET COLLECTION INFO (for debugging)
// ══════════════════════════════════════════════════════════
async function getCollectionInfo() {
  try {
    const res = await client.get(`/collections/${COLLECTION}`);
    const info = res.data?.result;
    console.log('📊 Qdrant Collection Info:');
    console.log(`   • Points count : ${info?.points_count}`);
    console.log(`   • Status       : ${info?.status}`);
    return info;
  } catch (error) {
    qdrantError('getCollectionInfo', error);
  }
}

module.exports = {
  createCollection,
  deleteCollection,
  insertDocuments,
  searchSimilar,
  getCollectionInfo,
  getCurrentPointCount,
};
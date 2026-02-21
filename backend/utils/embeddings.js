const { pipeline } = require('@xenova/transformers');

let extractor = null;

async function initializeExtractor() {
  if (!extractor) {
    console.log('Loading embedding model (first time only)...');
    extractor = await pipeline('feature-extraction', 'Xenova/all-MiniLM-L6-v2');
    console.log('✅ Embedding model loaded');
  }
  return extractor;
}

async function generateEmbedding(text) {
  try {
    const model = await initializeExtractor();
    
    // Generate embedding
    const output = await model(text, { pooling: 'mean', normalize: true });
    
    // Convert to regular array
    const embedding = Array.from(output.data);
    
    return embedding;
  } catch (error) {
    console.error('Error generating embedding:', error);
    throw error;
  }
}

module.exports = { generateEmbedding };
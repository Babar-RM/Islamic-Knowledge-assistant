const mongoose = require('mongoose');
const dotenv = require('dotenv');
const path = require('path');

// Load environment variables
dotenv.config({ path: path.join(__dirname, '../.env') });

const { generateEmbedding } = require('../utils/embeddings');
const { createCollection, insertDocuments } = require('../utils/qdrant');
const KnowledgeSource = require('../models/KnowledgeSource');
const sampleData = require('../data/sample_data.json');

async function loadData() {
  try {
    console.log('Starting data loading process...');
    
    // Connect to MongoDB
    console.log('Connecting to MongoDB...');
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected to MongoDB');

    // Create Qdrant collection
    console.log('Creating Qdrant collection...');
    await createCollection();
    console.log('✅ Qdrant collection ready');

    // Clear existing data from MongoDB
    await KnowledgeSource.deleteMany({});
    console.log('✅ Cleared existing data from MongoDB');

    // Prepare documents with embeddings
    const documentsWithEmbeddings = [];

    console.log(`Processing ${sampleData.length} documents...`);

    for (let i = 0; i < sampleData.length; i++) {
      const item = sampleData[i];
      
      console.log(`\n[${i + 1}/${sampleData.length}] Processing: ${item.reference}`);
      
      // Save to MongoDB
      const doc = await KnowledgeSource.create(item);
      console.log('  ✅ Saved to MongoDB');

      // Generate embedding (this might take a few seconds per document)
      console.log('  🔄 Generating embedding...');
      const embedding = await generateEmbedding(item.english_text);
      console.log('  ✅ Embedding generated');
      
      documentsWithEmbeddings.push({
        text: item.english_text,
        source_type: item.source_type,
        reference: item.reference,
        embedding: embedding,
      });
    }

    // Insert into Qdrant
    console.log('\n🔄 Inserting documents into Qdrant...');
    await insertDocuments(documentsWithEmbeddings);
    console.log('✅ All documents inserted into Qdrant');

    console.log('\n🎉 Data loaded successfully!');
    console.log(`📊 Total documents: ${sampleData.length}`);
    
    mongoose.connection.close();
    console.log('✅ MongoDB connection closed');
    
    process.exit(0);
  } catch (error) {
    console.error('\n❌ Error loading data:', error);
    process.exit(1);
  }
}

loadData();
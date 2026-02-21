const mongoose = require('mongoose');

const knowledgeSourceSchema = new mongoose.Schema({
  source_type: {
    type: String,
    enum: ['Quran', 'Hadith', 'Tafsir', 'Fiqh', 'Seerah', 'Dua'],
    required: true,
  },
  reference: {
    type: String,
    required: true,
  },
  arabic_text: {
    type: String,
    default: '',
  },
  english_text: {
    type: String,
    default: '', // ← Remove required, add default empty string
  },
  context: {
    type: String,
    default: '',
  },
  tags: {
    type: [String],
    default: [],
  },
  created_at: {
    type: Date,
    default: Date.now,
  },
});

module.exports = mongoose.model('KnowledgeSource', knowledgeSourceSchema);
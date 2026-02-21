const { generateEmbedding } = require('../utils/embeddings');
const { searchSimilar } = require('../utils/qdrant');
const { GoogleGenerativeAI } = require('@google/generative-ai');

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

// Generate intelligent answer using Gemini AI
async function generateAnswerWithAI(question, context, language = 'english') {
  try {
    if (context.length === 0) {
      return language === 'urdu' 
        ? 'معاف کیجئے، میں آپ کے سوال کا جواب اسلامی ذرائع میں نہیں ڈھونڈ سکا۔ براہ کرم اپنا سوال دوبارہ لکھیں یا کوئی اور سوال پوچھیں۔'
        : 'I could not find relevant information in the Islamic sources for your question. Please try rephrasing or ask a different question about Islam.';
    }

    // Build context from retrieved sources
    const contextText = context
      .map((doc, idx) => {
        return `Source ${idx + 1} - ${doc.payload.source_type} (${doc.payload.reference}):\n${doc.payload.text}`;
      })
      .join('\n\n');

    let prompt;
    
    if (language === 'urdu') {
      // URDU PROMPT - Very explicit instructions
      prompt = `آپ ایک اسلامی عالم ہیں جو لوگوں کی مدد کرتے ہیں۔

بہت ضروری: آپ کو صرف اور صرف اردو زبان میں جواب دینا ہے۔ انگریزی میں بالکل نہیں۔

اصول:
1. جواب مکمل طور پر اردو میں لکھیں (انگریزی کا ایک لفظ بھی نہیں)
2. سوال کا براہ راست جواب دیں
3. آسان اور صاف اردو استعمال کریں
4. نمبر والی فہرست استعمال کریں اگر ضرورت ہو
5. ذرائع کا حوالہ دیں (مثال: صحیح بخاری کے مطابق...)

اسلامی ذرائع:
${contextText}

سوال: ${question}

اب اردو میں واضح جواب دیں:`;
    } else {
      // ENGLISH PROMPT
      prompt = `You are an Islamic scholar helping people understand Islam.

CRITICAL: Answer in ENGLISH language only.

INSTRUCTIONS:
1. Answer the SPECIFIC question asked - don't just list sources
2. Be direct and practical - if they ask "when", tell them WHEN
3. Start with the direct answer, then provide details
4. Write like a teacher explaining to a student
5. Use bullet points or numbered lists when appropriate
6. Always cite sources naturally (e.g., "According to Sahih Bukhari...")

Islamic Sources:
${contextText}

Question: ${question}

Provide a clear, helpful answer in English:`;
    }

    const model = genAI.getGenerativeModel({ 
      model: "gemini-2.5-flash",
      generationConfig: {
        temperature: 0.3,
        topP: 0.9,
        topK: 40,
        maxOutputTokens: 1200,
      }
    });
    
    const result = await model.generateContent(prompt);
    const response = await result.response;
    let answer = response.text();

    // If Urdu mode but still getting English, translate key terms
    if (language === 'urdu' && /[a-zA-Z]{10,}/.test(answer)) {
      console.warn('⚠️ Gemini returned English instead of Urdu, applying fallback...');
      
      // Fallback: Create a proper Urdu answer
      answer = `اسلامی ذرائع کی بنیاد پر:\n\n`;
      
      if (question.toLowerCase().includes('روزہ') || question.toLowerCase().includes('fasting')) {
        answer += `قرآن (سورہ البقرہ 2:183) کے مطابق، رمضان کے مہینے میں روزہ رکھنا فرض ہے۔ آیت میں فرمایا گیا ہے:\n\n`;
        answer += `"اے ایمان والو! تم پر روزے فرض کیے گئے ہیں جیسے تم سے پہلے لوگوں پر فرض کیے گئے تھے تاکہ تم متقی بن جاؤ۔"\n\n`;
        answer += `روزہ اسلام کے پانچ ستونوں میں سے ایک ہے (صحیح بخاری 1:2)۔\n\n`;
        answer += `مسلمانوں کو رمضان کے پورے مہینے میں، صبح (فجر) سے غروب آفتاب (مغرب) تک ہر روز روزہ رکھنا چاہیے۔`;
      } else if (question.includes('ارکان') || question.toLowerCase().includes('pillars')) {
        answer += `صحیح بخاری (1:2) میں نبی کریم ﷺ نے فرمایا:\n\n`;
        answer += `اسلام کی بنیاد پانچ چیزوں پر ہے:\n`;
        answer += `1. شہادت - کہ اللہ کے سوا کوئی معبود نہیں اور محمد ﷺ اللہ کے رسول ہیں\n`;
        answer += `2. نماز - پانچ وقت کی نماز ادا کرنا\n`;
        answer += `3. زکوٰۃ - غریبوں کو مال دینا\n`;
        answer += `4. روزہ - رمضان میں روزے رکھنا\n`;
        answer += `5. حج - مکہ کا حج کرنا (جو استطاعت رکھتا ہو)`;
      } else {
        context.forEach((doc, idx) => {
          answer += `${idx + 1}. ${doc.payload.source_type} (${doc.payload.reference}) کے مطابق:\n${doc.payload.text}\n\n`;
        });
      }
    }

    return answer || (language === 'urdu' ? 'جواب بنانے میں خرابی۔' : 'Failed to generate answer.');
  } catch (error) {
    console.error('❌ Error generating AI answer:', error.message);
    
    // Smart fallback based on question type
    let fallbackAnswer = '';
    
    if (language === 'urdu') {
      fallbackAnswer = 'اسلامی ذرائع کی بنیاد پر:\n\n';
      context.forEach((doc, idx) => {
        fallbackAnswer += `${idx + 1}. ${doc.payload.source_type} (${doc.payload.reference}) کے مطابق:\n${doc.payload.text}\n\n`;
      });
    } else {
      fallbackAnswer = 'Based on authentic Islamic sources:\n\n';
      context.forEach((doc, idx) => {
        fallbackAnswer += `${idx + 1}. According to ${doc.payload.source_type} (${doc.payload.reference}):\n${doc.payload.text}\n\n`;
      });
    }
    
    return fallbackAnswer;
  }
}

async function askQuestion(req, res) {
  try {
    const { question, language = 'english' } = req.body;
    
    if (!question || !question.trim()) {
      return res.status(400).json({ 
        error: language === 'urdu' ? 'سوال ضروری ہے' : 'Question is required' 
      });
    }

    console.log(`\n📝 Question received (${language}): ${question}`);

    // Step 1: Generate embedding for the question
    console.log('🔄 Generating question embedding...');
    const questionEmbedding = await generateEmbedding(question);
    console.log('✅ Question embedding generated');

    // Step 2: Search for similar documents in Qdrant
    console.log('🔍 Searching for similar documents...');
    const similarDocs = await searchSimilar(questionEmbedding, 5);
    console.log(`✅ Found ${similarDocs.length} relevant documents`);

    if (similarDocs.length === 0) {
      return res.json({
        answer: language === 'urdu'
          ? 'معاف کیجئے، میں آپ کے سوال کا جواب اسلامی ذرائع میں نہیں ڈھونڈ سکا۔'
          : 'I could not find relevant information in the Islamic sources for your question.',
        sources: [],
      });
    }

    // Step 3: Generate intelligent answer using Gemini AI
    console.log(`🤖 Generating ${language} AI answer...`);
    const answer = await generateAnswerWithAI(question, similarDocs, language);
    console.log('✅ AI answer generated');

    // Step 4: Format sources
    const sources = similarDocs.map((doc) => ({
      type: doc.payload.source_type,
      reference: doc.payload.reference,
      text: doc.payload.text,
      score: Math.round(doc.score * 100) / 100,
    }));

    console.log('✅ Response prepared successfully\n');

    res.json({
      answer,
      sources,
      language,
    });
  } catch (error) {
    console.error('❌ Error processing question:', error);
    res.status(500).json({ 
      error: 'Failed to process question. Please try again.',
      message: error.message 
    });
  }
}

module.exports = { askQuestion };
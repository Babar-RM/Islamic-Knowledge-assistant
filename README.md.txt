🕌 Islamic Knowledge Assistant
✨ AI-Powered Quran & Hadith Guidance (English + Urdu)

An intelligent Islamic Q&A assistant built with the MERN Stack that provides authentic answers from the Quran, Hadith, and Tafsir with proper source citations.

Designed for accuracy, transparency, and real-time performance.

🌍 Live Features

📖 Ask Islamic questions in English or Urdu

📚 Searches through 34,000+ verified Islamic sources

🔎 Returns answers with exact Quran & Hadith references

🌓 Dark / Light Mode

🌐 Language Toggle (EN / اردو)

🔐 Secure Authentication (Email + Google)

🕘 Question History for logged-in users

📋 One-click answer copy

⚡ Fast real-time API responses

🧠 How It Works

User submits a question

Backend processes and retrieves relevant sources

AI generates a structured answer

Verified citations are attached

User history is saved securely in MongoDB

🏗️ Tech Stack (MERN)
Layer	Technology
Frontend	React.js + Tailwind CSS
Backend	Node.js + Express.js
Database	MongoDB
Authentication	Firebase Authentication
AI Engine	LLM API + Retrieval System
Icons	Lucide React
📁 Project Structure
Islamic-Knowledge-Assistant/
│
├── client/                     # React Frontend
│   ├── src/
│   │   ├── components/
│   │   │   ├── IslamicKnowledgeAssistant.jsx
│   │   │   └── AuthModal.jsx
│   │   ├── firebase.js
│   │   └── App.js
│   └── package.json
│
├── server/                     # Node + Express Backend
│   ├── routes/
│   │   └── ask.js
│   ├── models/
│   │   └── Question.js
│   ├── controllers/
│   ├── config/
│   └── server.js
│
└── README.md

⚙️ Installation & Setup
1️⃣ Clone Repository
git clone https://github.com/your-username/islamic-knowledge-assistant.git
cd islamic-knowledge-assistant
2️⃣ Install Dependencies
Install Frontend
cd client
npm install
Install Backend
cd ../server
npm install
3️⃣ Environment Variables

Create a .env file inside the server folder:

PORT=5000
MONGO_URI=your_mongodb_connection_string
LLM_API_KEY=your_llm_api_key
4️⃣ Run the Application
Start Backend
cd server
npm run dev

Backend runs at:

http://localhost:5000
Start Frontend
cd client
npm start

Frontend runs at:

http://localhost:3000
🔐 Authentication

This project uses Firebase Authentication for:

Email & Password Sign Up

Email & Password Login

Google Sign-In

Auth State Listener

Secure Logout

Users must be logged in to save question history.

📡 Backend API
Endpoint
POST /api/ask
Request
{
  "question": "What are the five pillars of Islam?",
  "language": "english"
}
Response
{
  "answer": "The five pillars of Islam are...",
  "sources": [
    {
      "type": "Quran",
      "reference": "2:183",
      "text": "...",
      "score": 0.95
    }
  ]
}
🗄️ Database Schema (MongoDB)
Question Model Example
{
  userId: String,
  question: String,
  answer: String,
  sources: Array,
  language: String,
  createdAt: Date
}
🛠 Core Functionalities
✔ Question Processing Pipeline

Input validation

Retrieval from 34k+ sources

AI contextual reasoning

Citation scoring

Structured response formatting

✔ Frontend UI Capabilities

Clean chat interface

Loading animation

Scrollable history

Responsive design

Dark/Light theme toggle

Language switch (EN / اردو)

🚀 Future Improvements

📷 Image-based Islamic question support

🎙 Voice question input

📚 Advanced Tafsir filtering

🌎 Multi-language expansion (Arabic, Turkish, etc.)

📱 Mobile App Version (React Native)

🧠 Fine-tuned Islamic LLM

🎯 Vision

To build a globally accessible AI assistant that provides:

Authentic Islamic Knowledge

Transparent Source Citation

Multilingual Accessibility

Real-time AI Reasoning

Ethical & Responsible AI Usage

🤝 Contributing

Pull requests are welcome. For major changes, please open an issue first to discuss what you would like to change.


👨‍💻 Author

Babar Rahim
MERN Stack Developer | AI Enthusiast | Building Ethical AI Solutions
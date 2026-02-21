import React, { useState, useRef, useEffect } from 'react';
import { Send, BookOpen, Moon, Sun, Loader2, FileText, Book, Sparkles, History, Copy, Check, Globe, LogIn, LogOut, User } from 'lucide-react';
import { auth, onAuthStateChanged, logOut } from './firebase';
import AuthModal from './AuthModal';

export default function IslamicKnowledgeAssistant() {
  const [question, setQuestion] = useState('');
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(false);
  const [isDark, setIsDark] = useState(true);
  const [language, setLanguage] = useState('english');
  const [searchHistory, setSearchHistory] = useState([]);
  const [showHistory, setShowHistory] = useState(false);
  const [copiedIndex, setCopiedIndex] = useState(null);
  const [currentUser, setCurrentUser] = useState(null);
  const [showAuthModal, setShowAuthModal] = useState(false);
  const messagesEndRef = useRef(null);

  // ✅ Correct: import auth from firebase config, onAuthStateChanged from firebase config (which re-exports it)
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setCurrentUser(user);
    });
    return () => unsubscribe();
  }, []);

  const translations = {
    english: {
      title: 'Islamic Knowledge Assistant',
      subtitle: 'Powered by Quran, Hadith & Tafsir',
      greeting: 'As-Salamu Alaykum',
      welcome: 'Your Trusted Islamic Knowledge Companion',
      description: 'Ask any question about Islam and receive authentic answers from Quran, Hadith, and Tafsir with AI-powered explanations',
      placeholder: 'Ask your question about Islam...',
      askButton: 'Ask',
      searching: 'Searching Islamic sources...',
      sources: 'Authentic Sources',
      relevance: 'Relevance',
      history: 'Recent Questions',
      copy: 'Copy Answer',
      copied: 'Copied!',
      signIn: 'Sign In',
      signOut: 'Sign Out',
      examples: [
        { icon: '🕌', title: 'Five Pillars', desc: "Islam's foundation", q: "What are the five pillars of Islam?" },
        { icon: '📖', title: 'Ayat al-Kursi', desc: 'The Throne Verse', q: "Tell me about Ayat al-Kursi" },
        { icon: '❤️', title: 'Good Character', desc: 'Islamic ethics', q: "What is the importance of good character in Islam?" },
        { icon: '🌙', title: 'Fasting', desc: 'Ramadan guidance', q: "When should I fast?" },
        { icon: '💰', title: 'Zakat', desc: 'Charity rules', q: "How to calculate Zakat?" },
        { icon: '🤲', title: 'Prayer', desc: 'Daily worship', q: "How many times should I pray daily?" }
      ]
    },
    urdu: {
      title: 'اسلامی علم کا معاون',
      subtitle: 'قرآن، حدیث اور تفسیر سے',
      greeting: 'السلام علیکم',
      welcome: 'آپ کا قابل اعتماد اسلامی علم کا ساتھی',
      description: 'اسلام کے بارے میں کوئی بھی سوال پوچھیں اور قرآن، حدیث اور تفسیر سے مستند جوابات حاصل کریں',
      placeholder: 'اسلام کے بارے میں اپنا سوال پوچھیں...',
      askButton: 'پوچھیں',
      searching: 'اسلامی ذرائع تلاش کر رہے ہیں...',
      sources: 'مستند ذرائع',
      relevance: 'مطابقت',
      history: 'حالیہ سوالات',
      copy: 'نقل کریں',
      copied: 'نقل ہو گیا!',
      signIn: 'سائن ان',
      signOut: 'سائن آؤٹ',
      examples: [
        { icon: '🕌', title: 'ارکان اسلام', desc: 'اسلام کی بنیادیں', q: "اسلام کے پانچ ستون کیا ہیں؟" },
        { icon: '📖', title: 'آیت الکرسی', desc: 'تخت کی آیت', q: "آیت الکرسی کے بارے میں بتائیں" },
        { icon: '❤️', title: 'اچھا کردار', desc: 'اسلامی اخلاقیات', q: "اسلام میں اچھے کردار کی کیا اہمیت ہے؟" },
        { icon: '🌙', title: 'روزہ', desc: 'رمضان کی رہنمائی', q: "روزہ کب رکھنا چاہیے؟" },
        { icon: '💰', title: 'زکوٰۃ', desc: 'خیرات کے قوانین', q: "زکوٰۃ کا حساب کیسے لگائیں؟" },
        { icon: '🤲', title: 'نماز', desc: 'روزانہ کی عبادت', q: "دن میں کتنی بار نماز پڑھنی چاہیے؟" }
      ]
    }
  };

  const t = translations[language];
  const isUrdu = language === 'urdu';

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, loading]);

  const handleSubmit = async () => {
    if (!question.trim() || loading) return;

    const userMessage = { type: 'user', text: question };
    setMessages(prev => [...prev, userMessage]);
    setSearchHistory(prev => [question, ...prev.filter(q => q !== question)].slice(0, 5));

    const currentQuestion = question;
    setQuestion('');
    setLoading(true);

    try {
      const response = await fetch('http://localhost:5000/api/ask', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ question: currentQuestion, language })
      });

      const data = await response.json();

      const botMessage = {
        type: 'bot',
        text: data.answer,
        sources: data.sources || [],
        timestamp: new Date()
      };

      setMessages(prev => [...prev, botMessage]);
    } catch (error) {
      const errorMessage = {
        type: 'bot',
        text: isUrdu
          ? 'معاف کیجئے، آپ کے سوال پر کارروائی میں خرابی۔ براہ کرم دوبارہ کوشش کریں۔'
          : 'I apologize, but I encountered an error processing your question. Please try again.',
        sources: []
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setLoading(false);
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  const copyAnswer = (text, index) => {
    navigator.clipboard.writeText(text);
    setCopiedIndex(index);
    setTimeout(() => setCopiedIndex(null), 2000);
  };

  const handleSignOut = async () => {
    try {
      await logOut();
    } catch (err) {
      console.error('Sign out error:', err);
    }
  };

  const bgColor = isDark
    ? 'bg-gradient-to-br from-slate-900 via-emerald-950 to-slate-900'
    : 'bg-gradient-to-br from-emerald-50 via-white to-teal-50';
  const cardBg = isDark ? 'bg-slate-800/70 backdrop-blur-xl' : 'bg-white/90 backdrop-blur-xl';
  const textColor = isDark ? 'text-gray-100' : 'text-gray-900';
  const subTextColor = isDark ? 'text-gray-400' : 'text-gray-600';
  const accentColor = isDark ? 'text-emerald-400' : 'text-emerald-600';
  const borderColor = isDark ? 'border-emerald-900/30' : 'border-emerald-200';

  return (
    <div className={`min-h-screen ${bgColor} transition-all duration-300`} dir={isUrdu ? 'rtl' : 'ltr'}>
      {/* Header */}
      <header className={`${cardBg} border-b ${borderColor} shadow-2xl sticky top-0 z-50`}>
        <div className="max-w-7xl mx-auto px-4 py-5 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className={`p-3 rounded-2xl ${isDark ? 'bg-emerald-900/40' : 'bg-emerald-100'} shadow-xl`}>
              <BookOpen className={`w-8 h-8 ${accentColor}`} />
            </div>
            <div>
              <h1 className={`text-2xl font-bold ${textColor} flex items-center gap-2`}>
                {t.title}
                <Sparkles className={`w-5 h-5 ${accentColor} animate-pulse`} />
              </h1>
              <p className={`text-sm ${subTextColor} flex items-center gap-2`}>
                <span>{t.subtitle}</span>
                <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs ${isDark ? 'bg-emerald-900/50' : 'bg-emerald-100'} ${accentColor}`}>
                  34,156 sources
                </span>
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {/* Language Selector */}
            <div className={`flex items-center gap-1 p-1 rounded-xl ${isDark ? 'bg-slate-700/50' : 'bg-gray-200/50'} shadow-lg`}>
              <button
                onClick={() => setLanguage('english')}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 flex items-center gap-2 ${
                  language === 'english'
                    ? 'bg-gradient-to-r from-emerald-600 to-emerald-500 text-white shadow-lg scale-105'
                    : `${textColor} hover:bg-slate-600/30`
                }`}
              >
                <Globe className="w-4 h-4" />
                EN
              </button>
              <button
                onClick={() => setLanguage('urdu')}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 flex items-center gap-2 ${
                  language === 'urdu'
                    ? 'bg-gradient-to-r from-emerald-600 to-emerald-500 text-white shadow-lg scale-105'
                    : `${textColor} hover:bg-slate-600/30`
                }`}
              >
                <Globe className="w-4 h-4" />
                اردو
              </button>
            </div>

            {/* History Button */}
            {searchHistory.length > 0 && (
              <button
                onClick={() => setShowHistory(!showHistory)}
                className={`p-3 rounded-xl ${isDark ? 'bg-slate-700/50 hover:bg-slate-600/50' : 'bg-gray-200/50 hover:bg-gray-300/50'} transition-all duration-200 shadow-lg relative`}
              >
                <History className="w-5 h-5" />
                <span className="absolute -top-1 -right-1 w-5 h-5 bg-emerald-600 text-white text-xs rounded-full flex items-center justify-center">
                  {searchHistory.length}
                </span>
              </button>
            )}

            {/* Auth Button */}
            {currentUser ? (
              <div className="flex items-center gap-2">
                <div className={`flex items-center gap-2 px-3 py-2 rounded-xl ${isDark ? 'bg-slate-700/50' : 'bg-gray-200/50'}`}>
                  <User className={`w-4 h-4 ${accentColor}`} />
                  <span className={`text-sm font-medium ${textColor} hidden sm:inline`}>
                    {currentUser.displayName || currentUser.email?.split('@')[0]}
                  </span>
                </div>
                <button
                  onClick={handleSignOut}
                  className={`p-3 rounded-xl ${isDark ? 'bg-slate-700/50 hover:bg-slate-600/50' : 'bg-gray-200/50 hover:bg-gray-300/50'} transition-all duration-200 shadow-lg`}
                  title={t.signOut}
                >
                  <LogOut className="w-5 h-5" />
                </button>
              </div>
            ) : (
              <button
                onClick={() => setShowAuthModal(true)}
                className="px-4 py-2 bg-gradient-to-r from-emerald-600 to-emerald-500 hover:from-emerald-700 hover:to-emerald-600 text-white rounded-xl font-medium transition-all duration-200 shadow-lg flex items-center gap-2 hover:scale-105"
              >
                <LogIn className="w-4 h-4" />
                <span className="hidden sm:inline">{t.signIn}</span>
              </button>
            )}

            {/* Theme Toggle */}
            <button
              onClick={() => setIsDark(!isDark)}
              className={`p-3 rounded-xl ${isDark ? 'bg-slate-700/50 hover:bg-slate-600/50' : 'bg-gray-200/50 hover:bg-gray-300/50'} transition-all duration-200 shadow-lg hover:scale-110`}
            >
              {isDark ? <Sun className="w-5 h-5 text-yellow-400" /> : <Moon className="w-5 h-5 text-slate-700" />}
            </button>
          </div>
        </div>

        {/* History Dropdown */}
        {showHistory && searchHistory.length > 0 && (
          <div className={`${cardBg} border-t ${borderColor} p-4 animate-slideDown`}>
            <div className="max-w-7xl mx-auto">
              <h3 className={`text-sm font-semibold ${textColor} mb-3 flex items-center gap-2`}>
                <History className="w-4 h-4" />
                {t.history}
              </h3>
              <div className="space-y-2">
                {searchHistory.map((q, i) => (
                  <button
                    key={i}
                    onClick={() => { setQuestion(q); setShowHistory(false); }}
                    className={`w-full text-left px-4 py-2 rounded-lg ${isDark ? 'bg-slate-700/30 hover:bg-slate-700/50' : 'bg-gray-100 hover:bg-gray-200'} transition-all text-sm ${textColor}`}
                  >
                    {q}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 py-8">
        <div className={`${cardBg} rounded-3xl shadow-2xl border ${borderColor} overflow-hidden`}>
          {/* Messages Area */}
          <div className="h-[600px] overflow-y-auto p-8 space-y-6">
            {messages.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-center px-4">
                <div className="relative mb-8">
                  <div className={`absolute inset-0 ${isDark ? 'bg-emerald-500/20' : 'bg-emerald-400/20'} rounded-full blur-3xl animate-pulse`}></div>
                  <div className={`relative p-8 rounded-full ${isDark ? 'bg-emerald-900/30' : 'bg-emerald-100'} shadow-2xl`}>
                    <Book className={`w-20 h-20 ${accentColor} animate-float`} />
                  </div>
                </div>

                <h2 className={`text-3xl font-bold ${textColor} mb-3 animate-fadeIn`}>
                  {t.greeting} 👋
                </h2>
                <h3 className={`text-xl font-semibold ${accentColor} mb-4 animate-fadeIn`}>
                  {t.welcome}
                </h3>
                <p className={`${subTextColor} max-w-2xl mb-12 text-lg leading-relaxed animate-fadeIn`}>
                  {t.description}
                </p>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 w-full max-w-5xl">
                  {t.examples.map((example, idx) => (
                    <button
                      key={idx}
                      onClick={() => setQuestion(example.q)}
                      className={`group p-5 rounded-2xl ${isDark ? 'bg-slate-700/50 hover:bg-slate-700' : 'bg-emerald-50 hover:bg-emerald-100'} text-left transition-all duration-300 hover:scale-105 hover:shadow-2xl border ${borderColor} animate-fadeIn`}
                    >
                      <div className="flex items-start gap-3">
                        <span className="text-3xl group-hover:scale-125 transition-transform duration-300">
                          {example.icon}
                        </span>
                        <div className="flex-1">
                          <p className={`text-base font-semibold ${textColor} mb-1`}>
                            {example.title}
                          </p>
                          <p className={`text-xs ${subTextColor}`}>
                            {example.desc}
                          </p>
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            ) : (
              <>
                {messages.map((msg, idx) => (
                  <div
                    key={idx}
                    className={`flex ${msg.type === 'user' ? (isUrdu ? 'justify-start' : 'justify-end') : (isUrdu ? 'justify-end' : 'justify-start')} animate-fadeIn`}
                  >
                    <div className={`group max-w-[85%] ${
                      msg.type === 'user'
                        ? 'bg-gradient-to-r from-emerald-600 to-emerald-500 text-white shadow-emerald-500/30'
                        : isDark ? 'bg-slate-700/90' : 'bg-gray-100'
                    } rounded-2xl p-6 shadow-xl hover:shadow-2xl transition-all duration-300 border ${msg.type === 'user' ? 'border-emerald-400/30' : borderColor}`}>

                      <div className="flex items-start justify-between gap-4 mb-3">
                        <p className={`text-base leading-relaxed flex-1 ${msg.type === 'user' ? 'text-white' : textColor}`}>
                          {msg.text}
                        </p>

                        {msg.type === 'bot' && (
                          <button
                            onClick={() => copyAnswer(msg.text, idx)}
                            className={`p-2 rounded-lg ${isDark ? 'hover:bg-slate-600' : 'hover:bg-gray-200'} transition-all`}
                            title={copiedIndex === idx ? t.copied : t.copy}
                          >
                            {copiedIndex === idx ? (
                              <Check className="w-4 h-4 text-emerald-500" />
                            ) : (
                              <Copy className="w-4 h-4" />
                            )}
                          </button>
                        )}
                      </div>

                      {msg.sources && msg.sources.length > 0 && (
                        <div className={`mt-4 pt-4 border-t ${msg.type === 'user' ? 'border-emerald-400/30' : isDark ? 'border-slate-600' : 'border-gray-200'}`}>
                          <p className={`text-xs font-bold mb-3 flex items-center gap-2 ${msg.type === 'user' ? 'text-emerald-100' : accentColor}`}>
                            <FileText className="w-4 h-4" />
                            {t.sources}
                          </p>
                          <div className="space-y-3">
                            {msg.sources.map((source, i) => (
                              <div key={i} className={`p-4 rounded-xl ${isDark ? 'bg-slate-800/50' : 'bg-white/50'} border ${borderColor} hover:scale-[1.02] transition-transform`}>
                                <div className={`font-semibold text-sm ${accentColor} mb-2 flex items-center justify-between`}>
                                  <span>📚 {source.type}: {source.reference}</span>
                                  {source.score && (
                                    <span className={`text-xs px-2 py-1 rounded-full ${isDark ? 'bg-emerald-900/50' : 'bg-emerald-100'}`}>
                                      {(source.score * 100).toFixed(0)}%
                                    </span>
                                  )}
                                </div>
                                <div className={`${subTextColor} text-xs leading-relaxed`}>
                                  {source.text}
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                ))}

                {loading && (
                  <div className={`flex ${isUrdu ? 'justify-end' : 'justify-start'} animate-fadeIn`}>
                    <div className={`${isDark ? 'bg-slate-700' : 'bg-gray-100'} rounded-2xl p-6 shadow-xl flex items-center gap-3`}>
                      <Loader2 className={`w-5 h-5 ${accentColor} animate-spin`} />
                      <span className={`text-sm ${subTextColor}`}>{t.searching}</span>
                    </div>
                  </div>
                )}
                <div ref={messagesEndRef} />
              </>
            )}
          </div>

          {/* Input Area */}
          <div className={`border-t ${borderColor} ${isDark ? 'bg-slate-800/50' : 'bg-gray-50/80'} p-6`}>
            <div className="flex gap-3">
              <input
                type="text"
                value={question}
                onChange={(e) => setQuestion(e.target.value)}
                onKeyPress={handleKeyPress}
                placeholder={t.placeholder}
                className={`flex-1 px-6 py-4 rounded-2xl ${
                  isDark
                    ? 'bg-slate-700 text-gray-100 placeholder-gray-400 border-slate-600'
                    : 'bg-white text-gray-900 placeholder-gray-500 border-gray-300'
                } border-2 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-all duration-200 text-base shadow-lg`}
                disabled={loading}
              />
              <button
                onClick={handleSubmit}
                disabled={loading || !question.trim()}
                className="px-8 py-4 bg-gradient-to-r from-emerald-600 to-emerald-500 hover:from-emerald-700 hover:to-emerald-600 disabled:from-gray-600 disabled:to-gray-600 text-white rounded-2xl font-semibold transition-all duration-200 flex items-center gap-2 shadow-xl hover:scale-105 hover:shadow-emerald-500/50 disabled:hover:scale-100 disabled:cursor-not-allowed"
              >
                {loading ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : (
                  <>
                    <Send className="w-5 h-5" />
                    <span className="hidden sm:inline">{t.askButton}</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className={`mt-6 text-center text-sm ${subTextColor} flex items-center justify-center gap-3 flex-wrap animate-fadeIn`}>
          <div className="flex items-center gap-2">
            <div className={`w-2 h-2 rounded-full ${isDark ? 'bg-emerald-400' : 'bg-emerald-600'} animate-pulse`}></div>
            <span>34,156 authentic sources</span>
          </div>
          <span>•</span>
          <span>Always cited & verified</span>
          <span>•</span>
          <span>Powered by AI</span>
        </div>
      </main>

      {/* Auth Modal */}
      <AuthModal
        isOpen={showAuthModal}
        onClose={() => setShowAuthModal(false)}
        onSuccess={() => setShowAuthModal(false)}
      />

      <style>{`
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(10px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes slideDown {
          from { opacity: 0; transform: translateY(-10px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes float {
          0%, 100% { transform: translateY(0px); }
          50% { transform: translateY(-20px); }
        }
        .animate-fadeIn {
          animation: fadeIn 0.5s ease-out forwards;
          opacity: 0;
        }
        .animate-slideDown {
          animation: slideDown 0.3s ease-out;
        }
        .animate-float {
          animation: float 3s ease-in-out infinite;
        }
      `}</style>
    </div>
  );
}
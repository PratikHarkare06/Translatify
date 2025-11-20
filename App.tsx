import React, { useState } from 'react';
import { useLiveSession } from './hooks/useLiveSession';
import { type ConversationEntry, SessionStatus } from './types';
import StatusIndicator from './components/StatusIndicator';
import ConversationBubble from './components/ConversationBubble';
import HistoryView from './components/HistoryView';
import TranslatorView from './components/TranslatorView';

const LANGUAGES = ['English', 'Spanish', 'French', 'German', 'Japanese', 'Italian', 'Hindi', 'Bengali', 'Tamil', 'Telugu', 'Marathi'];
const VOICES = [
  { value: 'Zephyr', label: 'Zephyr (Friendly)' },
  { value: 'Puck', label: 'Puck (Upbeat)' },
  { value: 'Charon', label: 'Charon (Deep)' },
  { value: 'Kore', label: 'Kore (Calm)' },
  { value: 'Fenrir', label: 'Fenrir (Serious)' },
];


const App: React.FC = () => {
  const [view, setView] = useState<'practice' | 'history' | 'translate'>('practice');
  const [language, setLanguage] = useState('Spanish');
  const [nativeLanguage, setNativeLanguage] = useState('English');
  const [voice, setVoice] = useState('Zephyr');
  const [isTranslating, setIsTranslating] = useState(false);

  const {
    sessionStatus,
    startSession,
    endSession,
    transcriptionHistory,
    currentTranscription,
  } = useLiveSession(language, nativeLanguage, voice, isTranslating, setIsTranslating);

  const handleStart = () => {
    if (language === nativeLanguage) {
      alert("Please select a different language to learn than your native language.");
      return;
    }
    startSession();
  };
  
  const handleStop = () => {
    endSession();
  };

  const handleNativeLanguageChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newNativeLang = e.target.value;
    if (newNativeLang === language) {
      setLanguage(nativeLanguage); // swap
    }
    setNativeLanguage(newNativeLang);
  };

  const handleLanguageChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newTargetLang = e.target.value;
    if (newTargetLang === nativeLanguage) {
      setNativeLanguage(language); // swap
    }
    setLanguage(newTargetLang);
  };

  const handleVoiceChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setVoice(e.target.value);
  };

  const NavButton: React.FC<{
    targetView: 'practice' | 'history' | 'translate';
    currentView: 'practice' | 'history' | 'translate';
    onClick: (view: 'practice' | 'history' | 'translate') => void;
    children: React.ReactNode;
  }> = ({ targetView, currentView, onClick, children }) => {
    const isActive = targetView === currentView;
    return (
      <button
        onClick={() => onClick(targetView)}
        className={`font-medium py-2 px-4 rounded-md transition-colors duration-200 ${
          isActive
            ? 'bg-cyan-500 text-slate-900'
            : 'bg-slate-700 hover:bg-slate-600 text-slate-200'
        }`}
      >
        {children}
      </button>
    );
  };


  return (
    <div className="bg-slate-900 text-white min-h-screen font-sans flex flex-col">
      <header className="sticky top-0 bg-slate-900/80 backdrop-blur-md z-10 border-b border-slate-700 shadow-lg">
        <div className="container mx-auto px-4 py-3 flex justify-between items-center">
          <div className="flex items-center space-x-3">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-cyan-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 21a9.004 9.004 0 008.716-6.747M12 21a9.004 9.004 0 01-8.716-6.747M12 21c2.485 0 4.5-4.03 4.5-9S14.485 3 12 3m0 18c-2.485 0-4.5-4.03-4.5-9S9.515 3 12 3m0 0a9.004 9.004 0 00-4.784 1.573M12 3a9.004 9.004 0 014.784 1.573m0 0A12.943 12.943 0 0112 15c-1.423 0-2.802-.31-4.016-.872" />
              <path strokeLinecap="round" strokeLinejoin="round" d="M7 8h10M7 12h4m1 8l-4-4H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v4a2 2 0 01-2 2h-5l-4 4z" />
            </svg>
            <h1 className="text-2xl font-bold tracking-tight text-slate-100">Translatify</h1>
          </div>
          <div className="flex items-center gap-4">
             {view === 'practice' && sessionStatus !== SessionStatus.IDLE && <StatusIndicator status={sessionStatus} />}
            <div className="flex items-center gap-2">
              <NavButton targetView="practice" currentView={view} onClick={setView}>Practice</NavButton>
              <NavButton targetView="history" currentView={view} onClick={setView}>History</NavButton>
              <NavButton targetView="translate" currentView={view} onClick={setView}>Translate</NavButton>
            </div>
          </div>
        </div>
      </header>
      
      <main className="flex-grow container mx-auto px-4 py-8 flex flex-col">
        {view === 'practice' && (sessionStatus === SessionStatus.IDLE || sessionStatus === SessionStatus.ERROR || sessionStatus === SessionStatus.API_KEY_MISSING ? (
          <div className="flex flex-col items-center justify-center text-center flex-grow">
            <h2 className="text-4xl font-bold text-slate-100">Practice Speaking a New Language</h2>
            <p className="mt-4 text-lg text-slate-400 max-w-2xl">
              Choose your languages and click 'Start Practicing' to have a real-time conversation with your AI language partner, Sofia.
            </p>
            
            <div className="mt-8 flex flex-col sm:flex-row items-start justify-center gap-6 w-full max-w-4xl">
              <div className="flex-1 w-full sm:w-auto flex flex-col items-center gap-2">
                <label htmlFor="native-lang" className="text-slate-400 font-medium">I speak</label>
                <div className="relative w-full">
                  <select
                    id="native-lang"
                    value={nativeLanguage}
                    onChange={handleNativeLanguageChange}
                    className="w-full bg-slate-800 border border-slate-600 rounded-md py-3 pl-4 pr-10 text-white appearance-none focus:outline-none focus:ring-2 focus:ring-cyan-500"
                  >
                    {LANGUAGES.map(lang => <option key={lang} value={lang}>{lang}</option>)}
                  </select>
                  <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-slate-400">
                    <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"></path></svg>
                  </div>
                </div>
              </div>

              <div className="flex-1 w-full sm:w-auto flex flex-col items-center gap-2">
                <label htmlFor="target-lang" className="text-slate-400 font-medium">I want to learn</label>
                <div className="relative w-full">
                  <select
                    id="target-lang"
                    value={language}
                    onChange={handleLanguageChange}
                    className="w-full bg-slate-800 border border-slate-600 rounded-md py-3 pl-4 pr-10 text-white appearance-none focus:outline-none focus:ring-2 focus:ring-cyan-500"
                  >
                    {LANGUAGES.map(lang => <option key={lang} value={lang}>{lang}</option>)}
                  </select>
                  <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-slate-400">
                    <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"></path></svg>
                  </div>
                </div>
              </div>

              <div className="flex-1 w-full sm:w-auto flex flex-col items-center gap-2">
                <label htmlFor="voice-select" className="text-slate-400 font-medium">Sofia's Voice</label>
                <div className="relative w-full">
                  <select
                    id="voice-select"
                    value={voice}
                    onChange={handleVoiceChange}
                    className="w-full bg-slate-800 border border-slate-600 rounded-md py-3 pl-4 pr-10 text-white appearance-none focus:outline-none focus:ring-2 focus:ring-cyan-500"
                  >
                    {VOICES.map(v => <option key={v.value} value={v.value}>{v.label}</option>)}
                  </select>
                  <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-slate-400">
                    <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"></path></svg>
                  </div>
                </div>
              </div>

            </div>

            <div className="mt-8">
              <button
                onClick={handleStart}
                className="bg-cyan-500 hover:bg-cyan-600 text-slate-900 font-bold py-3 px-8 rounded-md transition-transform duration-200 ease-in-out transform hover:scale-105 shadow-lg shadow-cyan-500/20"
              >
                Start Practicing
              </button>
            </div>
             <p className="mt-6 text-sm text-slate-500 max-w-md">
              Pro-tip: During your session, click 'Translate Phrase' to get a real-time translation from {nativeLanguage} to {language}.
            </p>
            {sessionStatus === SessionStatus.ERROR && (
              <p className="mt-6 text-red-400">An error occurred. Please try again.</p>
            )}
            {sessionStatus === SessionStatus.API_KEY_MISSING && (
              <p className="mt-6 text-red-400 font-bold">API Key Not Configured: Please ensure your Gemini API key is set in your environment.</p>
            )}
          </div>
        ) : view === 'practice' && (
          <div className="flex-grow flex flex-col">
            <div id="conversation-container" className="flex-grow space-y-6 overflow-y-auto pr-2 mb-4">
              {transcriptionHistory.map((entry, index) => (
                <ConversationBubble key={index} entry={entry} />
              ))}
            </div>
            <div className="min-h-[6rem] text-slate-400 italic p-4 border-t border-slate-700">
              {isTranslating ? (
                <p className="text-cyan-400 font-semibold animate-pulse">Speak the phrase to translate from {nativeLanguage}...</p>
              ) : (
                <>
                  {currentTranscription.user && <p>You: {currentTranscription.user}</p>}
                  {currentTranscription.ai && <p>Sofia: {currentTranscription.ai}</p>}
                </>
              )}
            </div>
            <div className="mt-4 flex justify-center items-center gap-4">
              <button
                onClick={() => setIsTranslating(true)}
                disabled={isTranslating}
                className="bg-sky-600 hover:bg-sky-700 text-white font-bold py-3 px-6 rounded-md transition-all duration-200 ease-in-out disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-sky-600/20"
              >
                Translate Phrase
              </button>
              <button
                onClick={handleStop}
                className="bg-red-600 hover:bg-red-700 text-white font-bold py-3 px-8 rounded-md transition-transform duration-200 ease-in-out transform hover:scale-105 shadow-lg shadow-red-600/20"
              >
                Stop Session
              </button>
            </div>
          </div>
        ))}

        {view === 'history' && <HistoryView />}
        
        {view === 'translate' && (
          <TranslatorView 
            defaultSourceLang={nativeLanguage} 
            defaultTargetLang={language}
            languages={LANGUAGES}
          />
        )}
      </main>
    </div>
  );
};

export default App;
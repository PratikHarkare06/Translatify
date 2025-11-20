
import React, { useState, useCallback, useEffect } from 'react';
import { useSpeechToText } from '../hooks/useSpeechToText';
import { translateText, textToSpeech } from '../utils/gemini';
import { type TranslationRecord } from '../types';

const TRANSLATION_HISTORY_KEY = 'translatify-translation-history';

interface TranslatorViewProps {
  defaultSourceLang: string;
  defaultTargetLang: string;
  languages: string[];
}

const TranslatorView: React.FC<TranslatorViewProps> = ({
  defaultSourceLang,
  defaultTargetLang,
  languages,
}) => {
  const [sourceLang, setSourceLang] = useState(defaultSourceLang);
  const [targetLang, setTargetLang] = useState(defaultTargetLang);
  const [inputText, setInputText] = useState('');
  const [translatedText, setTranslatedText] = useState('');
  const [isTranslating, setIsTranslating] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [error, setError] = useState('');
  const [history, setHistory] = useState<TranslationRecord[]>([]
  );

  useEffect(() => {
    try {
      const savedHistory = localStorage.getItem(TRANSLATION_HISTORY_KEY);
      if (savedHistory) {
        setHistory(JSON.parse(savedHistory));
      }
    } catch (error) {
      console.error("Failed to load translation history:", error);
    }
  }, []);
  
  const handleTranslate = useCallback(async (textToTranslate?: string) => {
    const text = textToTranslate ?? inputText;
    if (!text.trim()) {
      setError('');
      return;
    }

    setIsTranslating(true);
    setError('');
    setTranslatedText('');
    try {
      const result = await translateText(text, sourceLang, targetLang);
      setTranslatedText(result);
      
      const newRecord: TranslationRecord = {
        id: Date.now(),
        sourceLang,
        targetLang,
        inputText: text,
        translatedText: result,
      };

      setHistory(prevHistory => {
        const updatedHistory = [newRecord, ...prevHistory].slice(0, 20); // Keep last 20
        localStorage.setItem(TRANSLATION_HISTORY_KEY, JSON.stringify(updatedHistory));
        return updatedHistory;
      });

    } catch (err: any) {
      console.error("Translation failed:", err);
      if (err.message.includes("API key is not configured")) {
        setError("API Key Not Configured: Please ensure your Gemini API key is set in your environment.");
      } else {
        setError("Sorry, translation failed. Please try again.");
      }
    } finally {
      setIsTranslating(false);
    }
  }, [inputText, sourceLang, targetLang]);

  const onTranscriptFinal = useCallback((transcript: string, sttError?: string) => {
    if (sttError) {
      setError(sttError);
      setInputText('');
      setTranslatedText('');
      return;
    }
    setInputText(transcript);
    handleTranslate(transcript);
  }, [handleTranslate]);

  const { isListening, startListening, stopListening } = useSpeechToText(onTranscriptFinal);

  const handleSpeak = async () => {
    if (!translatedText.trim() || isSpeaking) return;
    setIsSpeaking(true);
    setError(''); // Clear previous errors
    try {
      await textToSpeech(translatedText);
    } catch (err: any) {
      console.error("TTS failed:", err);
      if (err.message.includes("API key is not configured")) {
        setError("API Key Not Configured: Please ensure your Gemini API key is set in your environment.");
      } else {
        setError("Sorry, could not play audio. Please try again.");
      }
    } finally {
      setIsSpeaking(false);
    }
  };

  const handleSwapLanguages = () => {
    const currentSource = sourceLang;
    setSourceLang(targetLang);
    setTargetLang(currentSource);
    setInputText(translatedText);
    setTranslatedText(inputText);
    setError(''); // Clear errors on swap
  };

  const handleMicClick = () => {
    if (isListening) {
      stopListening();
    } else {
      setInputText('');
      setTranslatedText('');
      setError(''); // Clear errors before starting to listen
      startListening();
    }
  };

  const handleHistoryClick = (record: TranslationRecord) => {
    setSourceLang(record.sourceLang);
    setTargetLang(record.targetLang);
    setInputText(record.inputText);
    setTranslatedText(record.translatedText);
    setError(''); // Clear errors on history load
  };

  const handleClearHistory = () => {
    setHistory([]);
    localStorage.removeItem(TRANSLATION_HISTORY_KEY);
  };


  return (
    <div className="flex flex-col items-center justify-center text-center flex-grow animate-fade-in">
      <h2 className="text-4xl font-bold text-slate-100">Language Translator</h2>
      <p className="mt-4 text-lg text-slate-400 max-w-2xl">
        Translate text or your voice between languages.
      </p>

      <div className="mt-8 w-full max-w-3xl space-y-4">
        {/* Source Language Panel */}
        <div className="bg-slate-800 p-4 rounded-lg border border-slate-700">
          <select
            value={sourceLang}
            onChange={(e) => {setSourceLang(e.target.value); setError('');}}
            className="w-full bg-slate-700 border border-slate-600 rounded-md py-2 px-3 text-white mb-3"
          >
            {languages.map(lang => <option key={`source-${lang}`} value={lang}>{lang}</option>)}
          </select>
          <div className="relative">
            <textarea
              value={inputText}
              onChange={(e) => {setInputText(e.target.value); setError('');}}
              placeholder="Enter text or use the mic..."
              className="w-full h-32 bg-slate-900/50 p-3 rounded-md resize-none text-lg text-slate-200"
            />
            <button
              onClick={handleMicClick}
              className={`absolute bottom-3 right-3 p-2 rounded-full transition-colors ${
                isListening ? 'bg-red-500 animate-pulse' : 'bg-cyan-500 hover:bg-cyan-600'
              }`}
              title={isListening ? 'Stop Listening' : 'Start Listening'}
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-slate-900" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M7 4a3 3 0 016 0v4a3 3 0 11-6 0V4zm4 10.93A7.001 7.001 0 0017 8a1 1 0 10-2 0A5 5 0 015 8a1 1 0 00-2 0 7.001 7.001 0 006 6.93V17H6a1 1 0 100 2h8a1 1 0 100-2h-3v-2.07z" clipRule="evenodd" />
              </svg>
            </button>
          </div>
        </div>

        {/* Swap Button */}
        <div className="flex justify-center">
          <button
            onClick={handleSwapLanguages}
            className="p-2 bg-slate-700 hover:bg-slate-600 rounded-full"
            title="Swap Languages"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-cyan-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
            </svg>
          </button>
        </div>

        {/* Target Language Panel */}
        <div className="bg-slate-800 p-4 rounded-lg border border-slate-700">
          <select
            value={targetLang}
            onChange={(e) => {setTargetLang(e.target.value); setError('');}}
            className="w-full bg-slate-700 border border-slate-600 rounded-md py-2 px-3 text-white mb-3"
          >
            {languages.map(lang => <option key={`target-${lang}`} value={lang}>{lang}</option>)}
          </select>
          <div className="relative w-full h-32 bg-slate-900/50 p-3 rounded-md text-left overflow-y-auto">
            {isTranslating ? (
              <div className="flex items-center justify-center h-full text-slate-400">
                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-slate-300 mr-3"></div>
                Translating...
              </div>
            ) : (
              <p className="text-lg text-slate-200 whitespace-pre-wrap">{translatedText}</p>
            )}
            {translatedText && !isTranslating && (
              <button
                onClick={handleSpeak}
                disabled={isSpeaking}
                className="absolute bottom-3 right-3 p-2 rounded-full bg-purple-500 hover:bg-purple-600 disabled:bg-slate-600"
                title="Read Aloud"
              >
                 {isSpeaking ? (
                   <div className="h-6 w-6 flex items-center justify-center">
                      <div className="w-1 h-3 bg-slate-900 animate-pulse rounded-full mx-0.5"></div>
                      <div className="w-1 h-5 bg-slate-900 animate-pulse rounded-full mx-0.5" style={{animationDelay: '0.1s'}}></div>
                      <div className="w-1 h-3 bg-slate-900 animate-pulse rounded-full mx-0.5" style={{animationDelay: '0.2s'}}></div>
                   </div>
                 ) : (
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-slate-900" viewBox="0 0 20 20" fill="currentColor">
                    <path d="M10 2a6 6 0 00-6 6v3.586l-.707.707A1 1 0 004 14h12a1 1 0 00.707-1.707L16 11.586V8a6 6 0 00-6-6zM10 18a3 3 0 01-3-3h6a3 3 0 01-3 3z" />
                  </svg>
                 )}
              </button>
            )}
          </div>
        </div>
      </div>

      <div className="mt-8">
        <button
          onClick={() => handleTranslate()}
          disabled={isTranslating || !inputText.trim()}
          className="bg-cyan-500 hover:bg-cyan-600 text-slate-900 font-bold py-3 px-8 rounded-md transition-all duration-200 ease-in-out transform hover:scale-105 shadow-lg shadow-cyan-500/20 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          Translate
        </button>
      </div>
      {error && <p className="mt-4 text-red-400 font-bold">{error}</p>}
      
      {/* Translation History */}
      {history.length > 0 && (
        <div className="mt-12 w-full max-w-3xl text-left">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-2xl font-bold text-slate-200">History</h3>
            <button onClick={handleClearHistory} className="text-sm text-slate-400 hover:text-red-400">Clear History</button>
          </div>
          <div className="space-y-3 max-h-60 overflow-y-auto pr-2">
            {history.map(item => (
              <div key={item.id} onClick={() => handleHistoryClick(item)} className="bg-slate-800 p-3 rounded-lg cursor-pointer hover:bg-slate-700/50 border border-slate-700">
                <p className="text-xs text-slate-400">{item.sourceLang} &rarr; {item.targetLang}</p>
                <p className="text-slate-200 truncate">{item.inputText}</p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default TranslatorView;
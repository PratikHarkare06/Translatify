
import React, { useState, useEffect } from 'react';
import { GoogleGenAI, Type } from '@google/genai';
import { type SessionRecord, type Feedback } from '../types';
import ConversationBubble from './ConversationBubble';
import FeedbackReport from './FeedbackReport';

const HISTORY_STORAGE_KEY = 'translatify-history';

const HistoryView: React.FC = () => {
  const [history, setHistory] = useState<SessionRecord[]>([]);
  const [selectedSession, setSelectedSession] = useState<SessionRecord | null>(null);
  const [feedback, setFeedback] = useState<Feedback | null>(null);
  const [isFetchingFeedback, setIsFetchingFeedback] = useState(false);
  const [feedbackError, setFeedbackError] = useState<string | null>(null);

  useEffect(() => {
    try {
      const savedHistoryJSON = localStorage.getItem(HISTORY_STORAGE_KEY);
      if (savedHistoryJSON) {
        setHistory(JSON.parse(savedHistoryJSON));
      }
    } catch (error) {
      console.error("Failed to load session history:", error);
      setHistory([]);
    }
  }, []);
  
  const handleSelectSession = (session: SessionRecord) => {
    setSelectedSession(session);
    // Reset feedback states when a new session is selected
    setFeedback(null);
    setFeedbackError(null);
    setIsFetchingFeedback(false);
  };
  
  const handleBackToHistory = () => {
    setSelectedSession(null);
  };

  const handleClearHistory = () => {
    if (window.confirm("Are you sure you want to delete all your saved sessions? This action cannot be undone.")) {
      try {
        localStorage.removeItem(HISTORY_STORAGE_KEY);
        setHistory([]);
        setSelectedSession(null);
      } catch (error) {
        console.error("Failed to clear history:", error);
        alert("Could not clear history. Please try again.");
      }
    }
  };

  const handleGetFeedback = async (session: SessionRecord) => {
    setIsFetchingFeedback(true);
    setFeedback(null);
    setFeedbackError(null);
    
    const conversationText = session.conversation
      .map(entry => `${entry.speaker === 'user' ? 'Student' : 'Tutor'}: ${entry.text}`)
      .join('\n');

    const prompt = `You are an expert language tutor. Analyze the following conversation between a student learning ${session.targetLanguage} and a tutor. The student's native language is ${session.nativeLanguage}.

    Focus ONLY on the student's messages (labeled "Student:"). Provide constructive feedback on their grammar, phrasing, and vocabulary.

    Conversation:
    ${conversationText}

    Provide your feedback in a JSON format. The JSON object must match this schema:
    - summary (string): A brief, encouraging summary of the student's performance.
    - corrections (array of objects): Each object must have 'original' (the student's phrase with an error), 'corrected' (the corrected phrase), and 'explanation' (a simple explanation of the error). If there are no corrections, provide an empty array.
    - suggestions (array of strings): Provide tips for more natural phrasing or alternative ways to say things. If there are no suggestions, provide an empty array.
    - fluencyScore (number): A score from 1 to 10 for the student's fluency in this conversation, where 1 is a beginner and 10 is native-like.

    Do not include any text, markdown, or formatting outside of the JSON object.`;

    try {
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
      const response = await ai.models.generateContent({
        model: 'gemini-2.5-pro',
        contents: prompt,
        config: {
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              summary: { type: Type.STRING },
              corrections: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    original: { type: Type.STRING },
                    corrected: { type: Type.STRING },
                    explanation: { type: Type.STRING },
                  },
                  required: ['original', 'corrected', 'explanation'],
                },
              },
              suggestions: {
                type: Type.ARRAY,
                items: { type: Type.STRING },
              },
              fluencyScore: { type: Type.NUMBER },
            },
            required: ['summary', 'corrections', 'suggestions', 'fluencyScore'],
          },
        },
      });
      
      const feedbackJson = JSON.parse(response.text);
      setFeedback(feedbackJson);
    } catch (error) {
      console.error("Failed to get feedback from Gemini:", error);
      setFeedbackError("Sorry, I couldn't get feedback for this session. Please try again.");
    } finally {
      setIsFetchingFeedback(false);
    }
  };


  if (selectedSession) {
    return (
      <div className="flex flex-col h-full">
        <div className="flex justify-between items-center mb-4">
          <button 
            onClick={handleBackToHistory}
            className="bg-slate-700 hover:bg-slate-600 text-slate-200 font-medium py-2 px-4 rounded-md transition-colors duration-200"
          >
            &larr; Back to History
          </button>
          <div className="text-right">
            <h3 className="text-xl font-bold text-slate-100">{selectedSession.targetLanguage} Practice</h3>
            <p className="text-sm text-slate-400">({selectedSession.nativeLanguage} speaker) - {selectedSession.date}</p>
          </div>
        </div>
        <div className="flex-grow space-y-6 overflow-y-auto pr-2 pb-4 border-b border-slate-700">
          {selectedSession.conversation.map((entry, index) => (
            <ConversationBubble key={index} entry={entry} />
          ))}
        </div>
        <div className="pt-6">
          {!feedback && !isFetchingFeedback && (
            <div className="text-center">
              <button
                onClick={() => handleGetFeedback(selectedSession)}
                className="bg-purple-600 hover:bg-purple-700 text-white font-bold py-3 px-6 rounded-md transition-transform duration-200 ease-in-out transform hover:scale-105 shadow-lg shadow-purple-600/20 flex items-center gap-2 mx-auto"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M11.25 2.25c.341 0 .681.04 1.013.118l.375.088c.326.076.638.18.932.312.294.132.57.294.825.48.255.186.488.402.69.648.202.246.368.514.492.796.124.282.206.582.243.888.037.306.058.618.058.925v.5c0 .307-.021.619-.058.925-.037.306-.119.604-.243.888a3.954 3.954 0 01-.492.796c-.202.246-.435.462-.69.648-.255.186-.53.348-.825.48-.294.132-.606.236-.932.312l-.375.088A7.476 7.476 0 0111.25 12v2.543l-2.025 1.518a.75.75 0 01-.975-1.116l.9-1.201A5.962 5.962 0 018 12.25a6 6 0 01-1.22-11.892A6.012 6.012 0 0111.25 2.25zM4.75 5.5c.341 0 .681.04 1.013.118l.375.088c.326.076.638.18.932.312.294.132.57.294.825.48.255.186.488.402.69.648.202.246.368.514.492.796.124.282.206.582.243.888.037.306.058.618.058.925v.5c0 .307-.021.619-.058.925-.037.306-.119.604-.243.888a3.954 3.954 0 01-.492.796c-.202.246-.435.462-.69.648-.255.186-.53.348-.825.48-.294.132-.606.236-.932.312l-.375.088A7.476 7.476 0 014.75 16v-2.543l2.025-1.518a.75.75 0 01.975 1.116l-.9 1.201A5.962 5.962 0 018 11.75a6 6 0 011.22 11.892A6.012 6.012 0 014.75 5.5z" clipRule="evenodd" /></svg>
                Get Feedback from Gemini
              </button>
            </div>
          )}
          {isFetchingFeedback && (
            <div className="flex justify-center items-center gap-3 text-lg text-slate-400 py-4">
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-purple-400"></div>
              Analyzing your conversation...
            </div>
          )}
          {feedbackError && <p className="text-center text-red-400 py-4">{feedbackError}</p>}
          {feedback && <FeedbackReport feedback={feedback} />}
        </div>
      </div>
    );
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-3xl font-bold text-slate-100">Session History</h2>
        {history.length > 0 && (
          <button
            onClick={handleClearHistory}
            className="bg-red-800 hover:bg-red-700 text-white font-bold py-2 px-4 rounded-md transition-colors duration-200"
          >
            Clear History
          </button>
        )}
      </div>

      {history.length === 0 ? (
        <div className="text-center py-16">
          <p className="text-slate-400 text-lg">You have no saved sessions yet.</p>
          <p className="text-slate-500 mt-2">Complete a practice session to see it here.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {history.map(session => (
            <div
              key={session.id}
              onClick={() => handleSelectSession(session)}
              className="bg-slate-800 p-4 rounded-lg cursor-pointer hover:bg-slate-700/50 border border-slate-700 transition-all duration-200"
            >
              <div className="flex justify-between items-center">
                <div>
                  <h3 className="font-bold text-cyan-400 text-lg">
                    {session.targetLanguage}
                  </h3>
                  <p className="text-sm text-slate-400">
                    vs. {session.nativeLanguage}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-sm text-slate-300">{session.date}</p>
                  <p className="text-xs text-slate-500">{session.conversation.length} messages</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default HistoryView;


export enum SessionStatus {
  IDLE = 'Idle',
  CONNECTING = 'Connecting...',
  LISTENING = 'Listening...',
  SPEAKING = 'Sofia is speaking...',
  ERROR = 'Error',
  API_KEY_MISSING = 'API Key Missing',
}

export interface ConversationEntry {
  speaker: 'user' | 'ai';
  text: string;
}

export interface SessionRecord {
  id: number;
  date: string;
  nativeLanguage: string;
  targetLanguage: string;
  conversation: ConversationEntry[];
}

export interface Feedback {
  summary: string;
  corrections: {
    original: string;
    corrected: string;
    explanation: string;
  }[];
  suggestions: string[];
  fluencyScore: number;
}

export interface TranslationRecord {
  id: number;
  sourceLang: string;
  targetLang: string;
  inputText: string;
  translatedText: string;
}
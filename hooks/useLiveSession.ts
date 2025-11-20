import { useState, useRef, useCallback } from 'react';
import { GoogleGenAI, LiveSession, LiveServerMessage, Modality } from '@google/genai';
import { SessionStatus, type ConversationEntry, type SessionRecord } from '../types';
import { decode, decodeAudioData, createBlob } from '../utils/audioUtils';

const HISTORY_STORAGE_KEY = 'translatify-history';

export const useLiveSession = (
  language: string, 
  nativeLanguage: string, 
  voice: string, 
  isTranslating: boolean,
  setIsTranslating: (isTranslating: boolean) => void
) => {
  const [sessionStatus, setSessionStatus] = useState<SessionStatus>(SessionStatus.IDLE);
  const [transcriptionHistory, setTranscriptionHistory] = useState<ConversationEntry[]>([]);
  const [currentTranscription, setCurrentTranscription] = useState<{ user: string; ai: string }>({ user: '', ai: '' });
  
  const sessionRef = useRef<LiveSession | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const inputAudioContextRef = useRef<AudioContext | null>(null);
  const outputAudioContextRef = useRef<AudioContext | null>(null);
  const scriptProcessorRef = useRef<ScriptProcessorNode | null>(null);
  const audioSourcesRef = useRef<Set<AudioBufferSourceNode>>(new Set());
  const nextStartTimeRef = useRef<number>(0);
  
  const currentInputTranscriptionRef = useRef('');
  const currentOutputTranscriptionRef = useRef('');

  const endSession = useCallback(() => {
    // Save session to history before cleaning up
    if (transcriptionHistory.length > 0) {
      const newSession: SessionRecord = {
        id: Date.now(),
        date: new Date().toLocaleString(),
        nativeLanguage,
        targetLanguage: language,
        conversation: transcriptionHistory,
      };
      try {
        const existingHistoryJSON = localStorage.getItem(HISTORY_STORAGE_KEY);
        const existingHistory: SessionRecord[] = existingHistoryJSON ? JSON.parse(existingHistoryJSON) : [];
        const updatedHistory = [newSession, ...existingHistory];
        localStorage.setItem(HISTORY_STORAGE_KEY, JSON.stringify(updatedHistory));
      } catch (error) {
        console.error("Failed to save session history:", error);
      }
    }

    // FIX: Immediately nullify the session reference to prevent race conditions.
    const sessionToClose = sessionRef.current;
    sessionRef.current = null;

    if (scriptProcessorRef.current) {
      scriptProcessorRef.current.disconnect();
      scriptProcessorRef.current = null;
    }
    if (mediaStreamRef.current) {
      mediaStreamRef.current.getTracks().forEach(track => track.stop());
      mediaStreamRef.current = null;
    }
    if (sessionToClose) {
      sessionToClose.close();
    }
    if (inputAudioContextRef.current && inputAudioContextRef.current.state !== 'closed') {
      inputAudioContextRef.current.close();
    }
    if (outputAudioContextRef.current && outputAudioContextRef.current.state !== 'closed') {
      outputAudioContextRef.current.close();
    }
    audioSourcesRef.current.forEach(source => source.stop());
    audioSourcesRef.current.clear();
    setSessionStatus(SessionStatus.IDLE);
  }, [transcriptionHistory, language, nativeLanguage]);

  const startSession = useCallback(async () => {
    setSessionStatus(SessionStatus.CONNECTING);
    setTranscriptionHistory([]);
    setCurrentTranscription({ user: '', ai: '' });
    currentInputTranscriptionRef.current = '';
    currentOutputTranscriptionRef.current = '';

    if (!process.env.API_KEY) {
      console.error("Gemini API Key is not configured. Please set process.env.API_KEY.");
      setSessionStatus(SessionStatus.API_KEY_MISSING);
      return;
    }

    try {
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
      
      outputAudioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });
      nextStartTimeRef.current = 0;

      const sessionPromise = ai.live.connect({
        model: 'gemini-2.5-flash-native-audio-preview-09-2025',
        callbacks: {
          onopen: async () => {
            try {
              mediaStreamRef.current = await navigator.mediaDevices.getUserMedia({ audio: true });
              inputAudioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 16000 });
              const source = inputAudioContextRef.current.createMediaStreamSource(mediaStreamRef.current);
              scriptProcessorRef.current = inputAudioContextRef.current.createScriptProcessor(4096, 1, 1);
              
              scriptProcessorRef.current.onaudioprocess = (audioProcessingEvent) => {
                const inputData = audioProcessingEvent.inputBuffer.getChannelData(0);
                const pcmBlob = createBlob(inputData);
                sessionPromise.then(session => {
                  if (sessionRef.current) {
                    session.sendRealtimeInput({ media: pcmBlob });
                  }
                });
              };

              source.connect(scriptProcessorRef.current);
              scriptProcessorRef.current.connect(inputAudioContextRef.current.destination);
              setSessionStatus(SessionStatus.LISTENING);
            } catch (err) {
              console.error('Microphone access denied or error:', err);
              setSessionStatus(SessionStatus.ERROR);
              endSession();
            }
          },
          onmessage: async (message: LiveServerMessage) => {
            if (message.serverContent?.inputTranscription) {
              currentInputTranscriptionRef.current += message.serverContent.inputTranscription.text;
              setCurrentTranscription(prev => ({ ...prev, user: currentInputTranscriptionRef.current }));
            }
            if (message.serverContent?.outputTranscription) {
              currentOutputTranscriptionRef.current += message.serverContent.outputTranscription.text;
              setCurrentTranscription(prev => ({...prev, ai: currentOutputTranscriptionRef.current}));
              setSessionStatus(SessionStatus.SPEAKING);
            }
            
            if(message.serverContent?.turnComplete) {
              const fullInput = currentInputTranscriptionRef.current;
              const fullOutput = currentOutputTranscriptionRef.current;

              const historyToAdd: ConversationEntry[] = [];
              if (fullInput.trim()) {
                historyToAdd.push({
                  speaker: 'user',
                  text: isTranslating ? `(Translate): ${fullInput}` : fullInput
                });
              }
              if (fullOutput.trim()) {
                historyToAdd.push({
                  speaker: 'ai', 
                  text: fullOutput
                });
              }
              if (historyToAdd.length > 0) {
                 setTranscriptionHistory(prev => [...prev, ...historyToAdd]);
              }
              
              if (isTranslating) {
                setIsTranslating(false);
              }
              
              currentInputTranscriptionRef.current = '';
              currentOutputTranscriptionRef.current = '';
              setCurrentTranscription({user: '', ai: ''});
            }

            const base64Audio = message.serverContent?.modelTurn?.parts[0]?.inlineData?.data;
            if (base64Audio) {
                const outputAudioContext = outputAudioContextRef.current;
                if (!outputAudioContext) return;
                
                nextStartTimeRef.current = Math.max(nextStartTimeRef.current, outputAudioContext.currentTime);

                const audioBuffer = await decodeAudioData(decode(base64Audio), outputAudioContext, 24000, 1);
                const source = outputAudioContext.createBufferSource();
                source.buffer = audioBuffer;
                source.connect(outputAudioContext.destination);
                source.addEventListener('ended', () => {
                    audioSourcesRef.current.delete(source);
                    if (audioSourcesRef.current.size === 0) {
                        setSessionStatus(SessionStatus.LISTENING);
                    }
                });

                source.start(nextStartTimeRef.current);
                nextStartTimeRef.current += audioBuffer.duration;
                audioSourcesRef.current.add(source);
            }
          },
          onerror: (e: ErrorEvent) => {
            console.error('Session error:', e);
            setSessionStatus(SessionStatus.ERROR);
            endSession();
          },
          onclose: () => {
            // This can be called when the session ends gracefully.
          },
        },
        config: {
          responseModalities: [Modality.AUDIO],
          inputAudioTranscription: {},
          outputAudioTranscription: {},
          speechConfig: { voiceConfig: { prebuiltVoiceConfig: { voiceName: voice } } },
          systemInstruction: `You are a friendly and patient ${language} language tutor named Sofia. Your goal is to help me practice my spoken ${language}. Converse with me primarily in ${language}. If I speak in ${nativeLanguage}, assume I am asking for a translation, as I have indicated this through the app's interface. Provide the translation in ${language}, explain it briefly if necessary, and then seamlessly continue our conversation in ${language}. You can also offer gentle corrections or suggestions if I make a significant mistake. Keep your responses relatively short to encourage a back-and-forth conversation.`,
        },
      });

      sessionRef.current = await sessionPromise;

    } catch (error) {
      console.error('Failed to start session:', error);
      setSessionStatus(SessionStatus.ERROR);
      endSession();
    }
  }, [endSession, language, nativeLanguage, voice, isTranslating, setIsTranslating]);

  return { sessionStatus, startSession, endSession, transcriptionHistory, currentTranscription };
};
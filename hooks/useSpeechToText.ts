import { useState, useRef, useCallback } from 'react';
import { GoogleGenAI, LiveSession, Modality } from '@google/genai';
import { createBlob } from '../utils/audioUtils';

export const useSpeechToText = (onTranscriptFinal: (transcript: string, error?: string) => void) => {
  const [isListening, setIsListening] = useState(false);
  const sessionRef = useRef<LiveSession | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const scriptProcessorRef = useRef<ScriptProcessorNode | null>(null);
  const transcriptRef = useRef('');
  const inactivityTimeoutRef = useRef<number | null>(null);

  const stopListening = useCallback((error?: string) => {
    if (!isListening) return;

    if (inactivityTimeoutRef.current) {
      clearTimeout(inactivityTimeoutRef.current);
      inactivityTimeoutRef.current = null;
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
    if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
      audioContextRef.current.close();
    }
    
    setIsListening(false);

    if (transcriptRef.current.trim() || error) {
        onTranscriptFinal(transcriptRef.current.trim(), error);
    }
    transcriptRef.current = '';
  }, [onTranscriptFinal, isListening]);

  const startListening = useCallback(async () => {
    if (isListening) return;
    
    setIsListening(true);
    transcriptRef.current = '';

    if (!process.env.API_KEY) {
      console.error("Gemini API Key is not configured. Please set process.env.API_KEY.");
      stopListening("Gemini API Key is not configured.");
      return;
    }

    try {
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
      const sessionPromise = ai.live.connect({
        model: 'gemini-2.5-flash-native-audio-preview-09-2025',
        callbacks: {
          onopen: async () => {
            try {
              mediaStreamRef.current = await navigator.mediaDevices.getUserMedia({ audio: true });
              audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 16000 });
              const source = audioContextRef.current.createMediaStreamSource(mediaStreamRef.current);
              scriptProcessorRef.current = audioContextRef.current.createScriptProcessor(4096, 1, 1);
              
              scriptProcessorRef.current.onaudioprocess = (event) => {
                const inputData = event.inputBuffer.getChannelData(0);
                sessionPromise.then(session => {
                  if (sessionRef.current) {
                    session.sendRealtimeInput({ media: createBlob(inputData) });
                  }
                });
              };
              source.connect(scriptProcessorRef.current);
              scriptProcessorRef.current.connect(audioContextRef.current.destination);
            } catch (err) {
                console.error("Microphone access denied for STT:", err);
                stopListening("Microphone access denied or error.");
            }
          },
          onmessage: (message) => {
            if (inactivityTimeoutRef.current) {
              clearTimeout(inactivityTimeoutRef.current);
            }
            // Set a timer to stop if no new messages arrive.
            inactivityTimeoutRef.current = window.setTimeout(() => {
              stopListening();
            }, 1500); // 1.5 seconds of silence.

            if (message.serverContent?.inputTranscription) {
              transcriptRef.current += message.serverContent.inputTranscription.text;
            }
            if (message.serverContent?.turnComplete) {
              // This is a definitive end, so stop immediately.
              stopListening();
            }
          },
          onerror: (e) => {
            console.error('STT Session error:', e);
            stopListening("An error occurred during speech recognition.");
          },
          onclose: () => {
            // Session closed, could be from stopListening call.
          },
        },
        config: {
          inputAudioTranscription: {},
          // The native audio model requires responseModalities to be set,
          // even if we are only using it for speech-to-text.
          responseModalities: [Modality.AUDIO],
        },
      });
      sessionRef.current = await sessionPromise;
    } catch (err) {
      console.error('STT setup error:', err);
      setIsListening(false);
      stopListening("Failed to start speech recognition session.");
    }
  }, [isListening, stopListening]);

  return { isListening, startListening, stopListening };
};
import { GoogleGenAI, Modality } from '@google/genai';
import { decode, decodeAudioData } from './audioUtils';

export const translateText = async (text: string, from: string, to: string): Promise<string> => {
  if (!text.trim()) return '';

  if (!process.env.API_KEY) {
    console.error("Gemini API Key is not configured. Please set process.env.API_KEY.");
    throw new Error("Gemini API key is not configured.");
  }

  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  const prompt = `Translate the following text from ${from} to ${to}. Provide only the translation, without any additional comments or explanations.\n\nText: "${text}"`;
  
  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
    });
    return response.text.trim();
  } catch (error) {
    console.error("Gemini translation API error:", error);
    throw new Error("Failed to translate text.");
  }
};

export const textToSpeech = async (text: string): Promise<void> => {
  if (!text.trim()) return;

  if (!process.env.API_KEY) {
    console.error("Gemini API Key is not configured. Please set process.env.API_KEY.");
    throw new Error("Gemini API key is not configured.");
  }

  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

  // FIX: The TTS model works more reliably when given an explicit instruction.
  const prompt = `Please read the following text aloud: ${text}`;

  try {
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash-preview-tts",
      contents: [{ parts: [{ text: prompt }] }],
      config: {
        responseModalities: [Modality.AUDIO],
        speechConfig: {
          voiceConfig: {
            prebuiltVoiceConfig: { voiceName: 'Zephyr' }, // Using a default, pleasant voice
          },
        },
      },
    });

    const base64Audio = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
    if (base64Audio) {
      const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });
      const audioBuffer = await decodeAudioData(decode(base64Audio), audioContext, 24000, 1);
      const source = audioContext.createBufferSource();
      source.buffer = audioBuffer;
      source.connect(audioContext.destination);
      source.start();

      // Return a promise that resolves when the audio finishes playing
      return new Promise(resolve => {
        source.onended = () => {
          audioContext.close();
          resolve();
        };
      });
    } else {
        throw new Error("No audio data received from API.");
    }
  } catch (error) {
    console.error("Gemini TTS API error:", error);
    throw new Error("Failed to generate speech.");
  }
};
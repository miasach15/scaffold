import { useEffect, useRef, useState } from "react";

// Wraps the browser's native SpeechRecognition — Chrome/Safari/Edge ship it, Firefox
// doesn't, so `supported` lets a caller hide its mic button entirely rather than show
// one that'll error the moment it's clicked. Each finalized phrase is handed to
// `onPhrase` as its own chunk (not accumulated here) so a caller can decide how to lay
// multiple phrases out — appended as new lines, inserted at a cursor, etc.
export function useSpeechToText(onPhrase) {
  const [listening, setListening] = useState(false);
  const recognitionRef = useRef(null);
  const onPhraseRef = useRef(onPhrase);
  onPhraseRef.current = onPhrase;

  const SpeechRecognitionCtor = typeof window !== "undefined" ? (window.SpeechRecognition || window.webkitSpeechRecognition) : null;

  useEffect(() => () => recognitionRef.current?.stop(), []);

  const start = () => {
    if (!SpeechRecognitionCtor || recognitionRef.current) return;
    const rec = new SpeechRecognitionCtor();
    rec.continuous = true;
    rec.interimResults = false;
    rec.lang = "en-US";
    rec.onresult = (e) => {
      for (let i = e.resultIndex; i < e.results.length; i++) {
        if (e.results[i].isFinal) {
          const phrase = e.results[i][0].transcript.trim();
          if (phrase) onPhraseRef.current?.(phrase);
        }
      }
    };
    rec.onend = () => { recognitionRef.current = null; setListening(false); };
    rec.onerror = () => { recognitionRef.current = null; setListening(false); };
    recognitionRef.current = rec;
    rec.start();
    setListening(true);
  };

  const stop = () => recognitionRef.current?.stop();
  const toggle = () => (listening ? stop() : start());

  return { supported: !!SpeechRecognitionCtor, listening, toggle };
}

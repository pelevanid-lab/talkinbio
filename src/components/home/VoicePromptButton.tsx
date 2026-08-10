'use client';

import { useCallback, useEffect, useState } from 'react';
import { Volume2 } from 'lucide-react';
import styles from './home.module.css';

const PROMPT_SEGMENTS = ['So.', 'What brought you here?'];

function playInterfaceTone(kind: 'boot' | 'step' = 'boot') {
  if (typeof window === 'undefined') return;
  const AudioContextClass =
    window.AudioContext ||
    (window as typeof window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!AudioContextClass) return;

  const context = new AudioContextClass();
  const oscillator = context.createOscillator();
  const oscillatorTwo = context.createOscillator();
  const gain = context.createGain();

  oscillator.type = 'square';
  oscillatorTwo.type = 'sine';
  oscillator.frequency.setValueAtTime(kind === 'boot' ? 186 : 280, context.currentTime);
  oscillator.frequency.exponentialRampToValueAtTime(kind === 'boot' ? 740 : 520, context.currentTime + 0.09);
  oscillatorTwo.frequency.setValueAtTime(kind === 'boot' ? 1480 : 960, context.currentTime);
  gain.gain.setValueAtTime(0.0001, context.currentTime);
  gain.gain.exponentialRampToValueAtTime(kind === 'boot' ? 0.024 : 0.018, context.currentTime + 0.012);
  gain.gain.exponentialRampToValueAtTime(0.0001, context.currentTime + 0.13);

  oscillator.connect(gain);
  oscillatorTwo.connect(gain);
  gain.connect(context.destination);
  oscillator.start();
  oscillatorTwo.start();
  oscillator.stop(context.currentTime + 0.14);
  oscillatorTwo.stop(context.currentTime + 0.1);
  window.setTimeout(() => void context.close(), 240);
}

function pickCyberFemaleVoice(voices: SpeechSynthesisVoice[]) {
  const preferred = [
    'Microsoft Aria',
    'Microsoft Jenny',
    'Microsoft Zira',
    'Samantha',
    'Google US English',
    'Google UK English Female',
  ];

  return (
    preferred.map((name) => voices.find((voice) => voice.name.includes(name))).find(Boolean) ||
    voices.find((voice) => voice.lang.toLowerCase().startsWith('en') && /female|aria|jenny|zira|samantha/i.test(voice.name)) ||
    voices.find((voice) => voice.lang.toLowerCase().startsWith('en')) ||
    null
  );
}

export default function VoicePromptButton({ onSpeakingChange }: { onSpeakingChange?: (speaking: boolean) => void }) {
  const [supported, setSupported] = useState(false);
  const [speaking, setSpeaking] = useState(false);

  useEffect(() => {
    onSpeakingChange?.(speaking);
  }, [onSpeakingChange, speaking]);

  const speak = useCallback(() => {
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) return;

    window.speechSynthesis.cancel();
    playInterfaceTone();
    const voice = pickCyberFemaleVoice(window.speechSynthesis.getVoices());

    setSpeaking(true);
    PROMPT_SEGMENTS.forEach((segment, index) => {
      const utterance = new SpeechSynthesisUtterance(segment);
      utterance.lang = 'en-US';
      utterance.rate = index === 0 ? 0.62 : 0.7;
      utterance.pitch = index === 0 ? 0.82 : 0.9;
      utterance.volume = 0.76;
      if (voice) utterance.voice = voice;

      utterance.onstart = () => {
        if (index > 0) playInterfaceTone('step');
      };
      utterance.onend = () => {
        if (index === PROMPT_SEGMENTS.length - 1) setSpeaking(false);
      };
      utterance.onerror = () => setSpeaking(false);

      window.speechSynthesis.speak(utterance);
    });
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) return;

    const primeVoices = () => window.speechSynthesis.getVoices();
    primeVoices();
    window.speechSynthesis.addEventListener('voiceschanged', primeVoices);

    const supportTimer = window.setTimeout(() => setSupported(true), 0);

    return () => {
      window.clearTimeout(supportTimer);
      window.speechSynthesis.cancel();
      window.speechSynthesis.removeEventListener('voiceschanged', primeVoices);
    };
  }, []);

  if (!supported) return null;

  return (
    <button
      type="button"
      className={styles.voicePromptButton}
      data-speaking={speaking}
      onClick={speak}
      aria-label="Play the English voice prompt"
    >
      <Volume2 size={15} aria-hidden="true" />
      <span>{speaking ? 'VOICE: SPEAKING' : 'VOICE: EN-US'}</span>
    </button>
  );
}

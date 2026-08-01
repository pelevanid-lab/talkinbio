'use client';

import { useState, useRef, useEffect } from 'react';
import { useChat, UIMessage } from '@ai-sdk/react';
import { DefaultChatTransport } from 'ai';
import { motion, AnimatePresence } from 'framer-motion';
import { SauleIcon } from './AgentIcons';
import { Send, X, MessageCircle, User, RotateCcw, Mic, Volume2, Loader2, Square } from 'lucide-react';
import { useTranslations } from 'next-intl';
import Image from 'next/image';
import AgentMarkdown from './AgentMarkdown';
import { useOptionalPublicPageRuntime } from './PublicPageRuntime';

type LegacyMessage = { id: string; role: string; content: string };

function toUIMessage(m: LegacyMessage): UIMessage {
  return { id: m.id, role: m.role as UIMessage['role'], parts: [{ type: 'text', text: m.content }] };
}

function getMessageText(m: UIMessage): string {
  return m.parts.filter((p) => p.type === 'text').map((p) => (p as { text: string }).text).join('');
}

type LocalizedGreeting = Partial<Record<'tr' | 'en' | 'ru', string>>;

// Saule, sohbeti sesli okurken sözleşme/randevu/iletişim gibi kritik bilgileri metinden
// ayırabilsin diye bu iki işaretin arasına sarıyor (bkz. agents/saule/prompt.ts). Görünürde
// metinden çıkarılır (visitor bunları normal yazı olarak görür), ama TTS'e hiç gönderilmez —
// onun yerine kısa bir "şimdi yazıyorum" cümlesiyle değiştirilir.
const INFO_MARKER_START = '§§INFO§§';
const INFO_MARKER_END = '§§/INFO§§';
const ACTION_MARKER_START = '§§ACTION§§';
const ACTION_MARKER_END = '§§/ACTION§§';

function stripInfoMarkers(text: string): string {
  return text
    .replace(new RegExp(INFO_MARKER_START, 'g'), '')
    .replace(new RegExp(INFO_MARKER_END, 'g'), '')
    .replace(new RegExp(`${ACTION_MARKER_START}[\\s\\S]*?${ACTION_MARKER_END}`, 'g'), '');
}

function hasInfoBlock(text: string): boolean {
  return text.includes(INFO_MARKER_START);
}

function shouldOpenWrittenAnswer(text: string): boolean {
  const clean = stripInfoMarkers(text).trim();
  if (!clean || parsePageAction(text)) return false;
  const lineCount = clean.split('\n').filter((line) => line.trim()).length;
  return (
    hasInfoBlock(text) ||
    clean.length > 140 ||
    lineCount >= 3 ||
    /e-?posta|email|telefon|whatsapp|adres|ula[şs]abil|ileti[şs]im|randevu|erken eri[şs]im/i.test(clean)
  );
}

// Panel yazıyla önemli bilgiyi gösterirken TTS aynı anda o mesajın geri kalanını da sesli
// okumasın — biri yazıyı okuyorsa aynı anda konuşulmasını istemiyoruz. Bu yüzden işaretli bir
// mesajda konuşulan tek şey kısa "şimdi yazıyorum" cümlesi; mesajın metni SADECE yazıyla kalır.
function buildSpokenText(text: string, filler: string): string {
  return hasInfoBlock(text) ? filler : text;
}

function parsePageAction(text: string): { type: 'open_block'; blockId: string; itemId?: string | null } | null {
  const start = text.indexOf(ACTION_MARKER_START);
  const end = text.indexOf(ACTION_MARKER_END);
  if (start === -1 || end === -1 || end <= start) return null;
  const raw = text.slice(start + ACTION_MARKER_START.length, end).trim();
  try {
    const parsed = JSON.parse(raw);
    if (parsed?.type === 'open_block' && typeof parsed.blockId === 'string') {
      return {
        type: 'open_block',
        blockId: parsed.blockId,
        itemId: typeof parsed.itemId === 'string' ? parsed.itemId : null,
      };
    }
  } catch {
    return null;
  }
  return null;
}

function MicButton({ isRecording, isTranscribing, disabled, onPressStart, onPressEnd, title }: {
  isRecording: boolean;
  isTranscribing: boolean;
  disabled?: boolean;
  onPressStart: () => void;
  onPressEnd: () => void;
  title: string;
}) {
  return (
    <button
      type="button"
      onClick={(e) => e.stopPropagation()}
      onPointerDown={(e) => { e.stopPropagation(); onPressStart(); }}
      onPointerUp={(e) => { e.stopPropagation(); onPressEnd(); }}
      onPointerLeave={(e) => { e.stopPropagation(); onPressEnd(); }}
      onPointerCancel={(e) => { e.stopPropagation(); onPressEnd(); }}
      onContextMenu={(e) => e.preventDefault()}
      disabled={isTranscribing || disabled}
      title={title}
      className={`touch-none w-11 h-11 rounded-full flex items-center justify-center shrink-0 transition-all shadow-sm ${
        isRecording
          ? 'bg-red-500 text-white animate-pulse ring-4 ring-red-200'
          : isTranscribing
          ? 'bg-amber-100 text-amber-600'
          : 'bg-[var(--paper)] text-[var(--ink-soft)] hover:bg-[var(--coral-tint)] hover:text-[var(--coral)]'
      }`}
    >
      {isTranscribing ? (
        <Loader2 className="w-5 h-5 animate-spin" />
      ) : isRecording ? (
        <Square className="w-4 h-4 fill-white" />
      ) : (
        <Mic className="w-5 h-5" />
      )}
    </button>
  );
}

export default function ChatWidget({ businessId, businessName, locale, initialMessages = [], customGreeting, sauleSettings, variant = 'sheet', preview = false, initialCreditsExhausted = false }: { businessId: string, businessName: string, locale: string, initialMessages?: LegacyMessage[], customGreeting?: LocalizedGreeting | null, sauleSettings?: any, variant?: 'sheet' | 'inline', preview?: boolean, initialCreditsExhausted?: boolean }) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [input, setInput] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const t = useTranslations('ChatWidget');
  const pageRuntime = useOptionalPublicPageRuntime();

  // Voice messaging state
  // The old voiceEnabled flag used live STT + per-answer TTS. The new product direction keeps
  // voice as cached cue packs, so dynamic visitor voice stays off unless a separate emergency flag
  // is deliberately enabled while the cue system is being built.
  const isVoiceEnabled = !!sauleSettings?.voiceEnabled && !!sauleSettings?.dynamicVoiceEnabled;
  const [isRecording, setIsRecording] = useState(false);
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [isPlayingAudio, setIsPlayingAudio] = useState(false);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const currentAudioRef = useRef<HTMLAudioElement | null>(null);
  // Basılı tutma jesti (mousedown/pointerdown -> ... -> pointerup) ile mikrofon izni istemi
  // arasında yarış var: izin ilk kez isteniyorsa tarayıcının native izin kutusu senkron
  // JS akışını durdurur, ziyaretçi "İzin Ver"e tıklarken parmağı/mouse'u zaten düğmeden
  // kalkmış olur. pressActiveRef, getUserMedia çözüldüğünde basmanın hâlâ sürüp sürmediğini
  // kontrol etmemizi sağlıyor — sürmüyorsa kaydı hemen durduruyoruz (bkz. startRecording).
  const pressActiveRef = useRef(false);
  // Karşılama + her yeni asistan cevabı, sohbet paneli AÇILMADAN sesli okunsun isteniyor —
  // ama tarayıcılar kullanıcı jesti olmadan sesli audio.play()'e izin vermiyor. Sayfadaki
  // İLK dokunuşta (chat ile ilgili olması gerekmiyor) kilidi açıyoruz; o ana kadar okunacak
  // metni burada bekletiyoruz.
  const audioUnlockedRef = useRef(false);
  const pendingSpeechTextRef = useRef<string | null>(null);
  const spokenMessageIdRef = useRef<string | null>(
    initialMessages.length > 0 ? initialMessages[initialMessages.length - 1].id : null
  );
  const handledActionRef = useRef<string | null>(null);
  const handledWrittenAnswerRef = useRef<string | null>(null);

  // Play audio response from TTS API
  const speakText = async (text: string) => {
    if (!isVoiceEnabled || !text) return;
    try {
      setIsPlayingAudio(true);
      const res = await fetch('/api/chat/voice/speak', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text, businessId }),
      });
      if (!res.ok) throw new Error('Speech failed');
      const data = await res.json();
      if (data.audioUrl) {
        if (currentAudioRef.current) {
          currentAudioRef.current.pause();
        }
        const audio = new Audio(data.audioUrl);
        currentAudioRef.current = audio;
        audio.onended = () => setIsPlayingAudio(false);
        audio.onerror = () => setIsPlayingAudio(false);
        await audio.play();
      } else {
        setIsPlayingAudio(false);
      }
    } catch (err) {
      console.error('Audio play error:', err);
      setIsPlayingAudio(false);
    }
  };

  // Start recording voice
  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      // iOS Safari'de "audio/webm" desteklenmiyor (varsayılan olarak audio/mp4 üretiyor) —
      // sabit "audio/webm" kullanmak, gerçekte kaydedilen formatla dosya uzantısı/tipi
      // uyuşmadığı için fal.ai Wizper'ın sesi hiç çözemeyip sessizce boş metin dönmesine yol
      // açıyordu (basılı tut çalışıyor gibi görünüyor ama hiçbir zaman cevap gelmiyordu).
      const supportedMimeType = ['audio/webm', 'audio/mp4', 'audio/ogg'].find(
        (type) => typeof MediaRecorder.isTypeSupported === 'function' && MediaRecorder.isTypeSupported(type)
      );
      const mediaRecorder = supportedMimeType ? new MediaRecorder(stream, { mimeType: supportedMimeType }) : new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = async () => {
        const usedMimeType = mediaRecorder.mimeType || 'audio/webm';
        const audioBlob = new Blob(audioChunksRef.current, { type: usedMimeType });
        const extension = usedMimeType.includes('mp4') ? 'm4a' : usedMimeType.includes('ogg') ? 'ogg' : 'webm';
        stream.getTracks().forEach((track) => track.stop());
        setIsRecording(false);
        setIsTranscribing(true);

        try {
          const formData = new FormData();
          formData.append('audio', audioBlob, `recording.${extension}`);
          formData.append('businessId', businessId);

          const res = await fetch('/api/chat/voice/transcribe', {
            method: 'POST',
            body: formData,
          });

          if (!res.ok) throw new Error('Transcription failed');
          const { text } = await res.json();

          if (text?.trim()) {
            sendMessage({ text: text.trim() });
          }
        } catch (err) {
          console.error('Transcription error:', err);
        } finally {
          setIsTranscribing(false);
        }
      };

      mediaRecorder.start();
      setIsRecording(true);
      // Basma ilk mikrofon izni istemi sırasında (yukarıdaki await) zaten bırakılmışsa
      // pressActiveRef false'tur — kaydı hemen durdur, yoksa parmak/mouse kalktığı halde
      // kayıt süresiz sürer (bkz. pressActiveRef tanımı).
      if (!pressActiveRef.current) {
        stopRecording();
      }
    } catch (err) {
      console.error('Mic access denied or error:', err);
      alert('Mikrofon erişimi izni gerekli.');
    }
  };

  // Stop recording voice
  const stopRecording = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();
    }
  };

  const handleMicPressStart = () => {
    pressActiveRef.current = true;
    startRecording();
  };

  const handleMicPressEnd = () => {
    pressActiveRef.current = false;
    stopRecording();
  };

  // Mobil klavye düzeltmesi: bazı tarayıcılarda (örn. Instagram in-app WebView)
  // klavye açılınca layout viewport küçülmüyor, sadece visual viewport küçülüyor.
  // "fixed bottom-0" ve "dvh" bu durumda klavyenin arkasında kalıyor — giriş alanı
  // görünmez oluyor. VisualViewport API ile gerçek görünür alanı takip edip sheet'i
  // buna göre konumlandırıyoruz.
  const [keyboardGap, setKeyboardGap] = useState(0);
  useEffect(() => {
    if (typeof window === 'undefined' || !window.visualViewport) return;
    const vv = window.visualViewport;
    const update = () => {
      const gap = window.innerHeight - vv.height - vv.offsetTop;
      setKeyboardGap(Math.max(0, Math.round(gap)));
    };
    update();
    vv.addEventListener('resize', update);
    vv.addEventListener('scroll', update);
    return () => {
      vv.removeEventListener('resize', update);
      vv.removeEventListener('scroll', update);
    };
  }, []);

  const pendingNewConversationRef = useRef(false);

  // Faz 4.3: kredi bitince (fiili ücretsiz katman) sohbet yerine LLM'siz bir
  // isim/iletişim/mesaj formuna dönülür — sohbet kapanmaz, ziyaretçi duvara çarpmaz.
  const [creditsExhausted, setCreditsExhausted] = useState(initialCreditsExhausted);
  const [exhaustedMessage, setExhaustedMessage] = useState<string | null>(null);
  const [formName, setFormName] = useState('');
  const [formContact, setFormContact] = useState('');
  const [formMessage, setFormMessage] = useState('');
  const [formSubmitting, setFormSubmitting] = useState(false);
  const [formSubmitted, setFormSubmitted] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const submitDirectCapture = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!formName.trim() || !formContact.trim() || formSubmitting) return;
    setFormSubmitting(true);
    setFormError(null);
    try {
      const res = await fetch('/api/leads/direct-capture', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ businessId, name: formName.trim(), contact: formContact.trim(), message: formMessage.trim() }),
      });
      if (!res.ok) throw new Error(await res.text());
      setFormSubmitted(true);
    } catch {
      setFormError(t('formErrorGeneric'));
    } finally {
      setFormSubmitting(false);
    }
  };

  const welcomeMessage = (): UIMessage => ({
    id: `welcome-${Date.now()}`,
    role: 'assistant',
    parts: [{ type: 'text', text: customGreeting?.[locale as 'tr' | 'en' | 'ru'] || t('welcome', { name: businessName }) }],
  });

  const { messages, sendMessage, status, setMessages } = useChat({
    transport: new DefaultChatTransport({
      api: '/api/chat',
      prepareSendMessagesRequest: ({ id, messages }) => {
        // Bayrak burada okunup burada sıfırlanmalı: prepareSendMessagesRequest,
        // sendMessage() çağrısından SONRA (asenkron gönderim akışının içinde)
        // çalışıyor. Sıfırlamayı onFormSubmit'e koymak bayrağı okunmadan önce
        // false'a çekiyordu — "Yeni sohbet" butonu sunucuya hiç ulaşmıyor, sadece
        // ekranı temizliyordu; Saule aynı konuşmadan devam edip önceki ziyaretçiyi
        // hatırlamaya devam ediyordu.
        const isNewConversation = pendingNewConversationRef.current;
        pendingNewConversationRef.current = false;
        return {
          body: {
            id,
            messages,
            businessId,
            locale,
            preview,
            newConversation: isNewConversation,
          },
        };
      },
    }),
    messages: initialMessages.length > 0 ? initialMessages.map(toUIMessage) : [welcomeMessage()],
    // Faz 4.1: sert kalkanlar (flood/oturum açma/günlük tavan) 429 + düz metin döner;
    // bunu normal bir Saule balonu gibi göster (LLM streami yok, tek seferlik metin).
    // Faz 4.3: kredi bitince sunucu 402 + JSON payload döner — form moduna geç.
    onError: (error) => {
      try {
        const parsed = JSON.parse(error.message);
        if (parsed && parsed.code === 'credits_exhausted') {
          setCreditsExhausted(true);
          setExhaustedMessage(parsed.message);
          return;
        }
      } catch {
        // Not a credits_exhausted payload — fall through to the plain-text bubble below.
      }
      setMessages((prev) => [
        ...prev,
        { id: `error-${Date.now()}`, role: 'assistant', parts: [{ type: 'text', text: error.message }] },
      ]);
    },
  });

  const isLoading = status === 'streaming' || status === 'submitted';

  const handleNewChat = () => {
    setMessages([welcomeMessage()]);
    pendingNewConversationRef.current = true;
  };

  const onFormSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!input.trim() || isLoading) return;
    sendMessage({ text: input });
    setInput('');
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    if (isExpanded) {
      scrollToBottom();
    }
  }, [messages, isExpanded]);

  // Tarayıcılar kullanıcı jesti olmadan sesli audio.play()'e izin vermiyor. Sohbet paneli
  // hiç açılmadan (bkz. aşağıdaki karşılama/cevap efekti) sesin çalabilmesi için sayfadaki
  // İLK dokunuşta (Saule ile ilgisi olması gerekmiyor — herhangi bir tıklama/dokunuş) kilidi
  // açıyoruz; o ana kadar bekleyen bir metin varsa hemen ardından okunuyor.
  useEffect(() => {
    if (!isVoiceEnabled) return;
    const unlock = () => {
      audioUnlockedRef.current = true;
      if (pendingSpeechTextRef.current) {
        const pending = pendingSpeechTextRef.current;
        pendingSpeechTextRef.current = null;
        speakText(pending);
      }
    };
    document.addEventListener('pointerdown', unlock, { once: true });
    return () => document.removeEventListener('pointerdown', unlock);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isVoiceEnabled]);

  // Karşılama + her yeni asistan cevabı sesli okunur — panel açık olsun olmasın (ziyaretçi
  // sohbet penceresine hiç tıklamadan sesli konuşabilsin diye). Panel yalnızca cevap "önemli
  // bilgi" (§§INFO§§ işaretli — bkz. agents/saule/prompt.ts) içeriyorsa otomatik açılır; o
  // bilgi hiçbir zaman sesli okunmaz, yerine kısa bir "şimdi yazıyorum" cümlesi söylenir.
  useEffect(() => {
    if (!isVoiceEnabled || isLoading) return;
    const last = messages[messages.length - 1];
    if (!last || last.role !== 'assistant' || last.id === spokenMessageIdRef.current) return;
    spokenMessageIdRef.current = last.id;

    const isWelcome = last.id.startsWith('welcome-');
    let spoken: string;
    if (isWelcome) {
      spoken =
        sauleSettings?.voiceWelcomeMessage?.[locale as 'tr' | 'en' | 'ru'] ||
        customGreeting?.[locale as 'tr' | 'en' | 'ru'] ||
        t('welcome', { name: businessName });
    } else {
      const rawText = getMessageText(last);
      if (hasInfoBlock(rawText)) queueMicrotask(() => setIsExpanded(true));
      spoken = buildSpokenText(rawText, t('voiceInfoFiller'));
    }
    if (!spoken) return;

    if (audioUnlockedRef.current) {
      speakText(spoken);
    } else {
      pendingSpeechTextRef.current = spoken;
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [messages, isLoading, isVoiceEnabled]);

  useEffect(() => {
    const handleSendToChat = (e: any) => {
      setIsExpanded(true);
      sendMessage({ text: e.detail });
    };
    window.addEventListener('sendToChat', handleSendToChat);
    return () => window.removeEventListener('sendToChat', handleSendToChat);
  }, [sendMessage]);

  useEffect(() => {
    if (!pageRuntime) return;
    const last = messages[messages.length - 1];
    if (!last || last.role !== 'assistant') return;
    const action = parsePageAction(getMessageText(last));
    if (!action) return;
    const actionKey = `${last.id}:${action.blockId}:${action.itemId || ''}`;
    if (handledActionRef.current === actionKey) return;
    handledActionRef.current = actionKey;
    const result = pageRuntime.openBlock(action.blockId, action.itemId);
    if (result.ok) setIsExpanded(false);
  }, [messages, pageRuntime]);

  useEffect(() => {
    const last = messages[messages.length - 1];
    if (!last || last.role !== 'assistant' || last.id.startsWith('welcome-')) return;
    const rawText = getMessageText(last);
    if (!shouldOpenWrittenAnswer(rawText)) return;
    if (handledWrittenAnswerRef.current === last.id) return;
    handledWrittenAnswerRef.current = last.id;
    queueMicrotask(() => setIsExpanded(true));
  }, [messages]);

  const toggleExpand = () => {
    setIsExpanded(!isExpanded);
  };

  return (
    <>
      {/* Expanded Bottom Sheet (or, for variant="inline", a panel bounded to the parent frame) */}
      <AnimatePresence>
        {isExpanded && (
          <>
            {/* Backdrop */}
            {variant === 'sheet' && (
              <motion.div
                key="chat-backdrop"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={toggleExpand}
                className="fixed inset-0 bg-slate-900/20 backdrop-blur-sm z-[60]"
              />
            )}

            {/* Sheet */}
            <motion.div
              key="chat-sheet"
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              className={variant === 'sheet'
                ? 'fixed left-3 right-3 mx-auto max-w-md h-[58dvh] bg-white rounded-3xl shadow-2xl z-[70] flex flex-col overflow-hidden border border-[var(--border-light)]'
                : 'absolute inset-0 bg-white z-20 flex flex-col overflow-hidden'}
              style={variant === 'sheet' ? { bottom: keyboardGap, maxHeight: keyboardGap > 0 ? `calc(100dvh - ${keyboardGap}px)` : undefined } : undefined}
            >
              {/* Header */}
              <div className="flex items-center justify-between p-4 border-b border-[var(--border-light)] bg-white">
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 rounded-full overflow-hidden flex-shrink-0 border border-[var(--border-light)] p-[2px] bg-[var(--paper)] flex items-center justify-center">
                    <SauleIcon size={34} />
                  </div>
                  <div>
                    <h3 className="font-semibold text-[var(--ink)] font-bricolage">Assistant Agent</h3>
                    <p className="text-xs text-[var(--teal)] font-medium flex items-center">
                      <span className="w-2 h-2 rounded-full bg-[var(--teal)] mr-1"></span> {t('online')}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={handleNewChat}
                    title={t('newChat')}
                    className="w-10 h-10 rounded-full bg-[var(--paper)] flex items-center justify-center text-[var(--ink-soft)] hover:bg-slate-200 transition"
                  >
                    <RotateCcw className="w-4 h-4" />
                  </button>
                  <button
                    onClick={toggleExpand}
                    className="w-10 h-10 rounded-full bg-[var(--paper)] flex items-center justify-center text-[var(--ink-soft)] hover:bg-slate-200 transition"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>
              </div>

              {/* Faz 4.3: kredi bitince (fiili ücretsiz katman) sohbet yerine LLM'siz form */}
              {creditsExhausted ? (
                <div className="flex-1 overflow-y-auto p-4 bg-[var(--paper)]/50 flex flex-col justify-center">
                  {formSubmitted ? (
                    <p className="text-center text-sm text-[var(--ink)]">{t('formSuccess')}</p>
                  ) : (
                    <form onSubmit={submitDirectCapture} className="space-y-3">
                      {exhaustedMessage && <p className="text-sm text-[var(--ink-soft)] mb-2">{exhaustedMessage}</p>}
                      <input
                        value={formName}
                        onChange={(e) => setFormName(e.target.value)}
                        placeholder={t('formName')}
                        className="w-full px-4 py-3 bg-white border border-[var(--border-light)] rounded-2xl text-sm focus:outline-none focus:ring-2 focus:ring-[var(--coral)]/20 focus:border-[var(--coral)]"
                        required
                      />
                      <input
                        value={formContact}
                        onChange={(e) => setFormContact(e.target.value)}
                        placeholder={t('formContact')}
                        className="w-full px-4 py-3 bg-white border border-[var(--border-light)] rounded-2xl text-sm focus:outline-none focus:ring-2 focus:ring-[var(--coral)]/20 focus:border-[var(--coral)]"
                        required
                      />
                      <textarea
                        value={formMessage}
                        onChange={(e) => setFormMessage(e.target.value)}
                        placeholder={t('formMessage')}
                        rows={3}
                        className="w-full px-4 py-3 bg-white border border-[var(--border-light)] rounded-2xl text-sm resize-none focus:outline-none focus:ring-2 focus:ring-[var(--coral)]/20 focus:border-[var(--coral)]"
                      />
                      {formError && <p className="text-xs text-red-500">{formError}</p>}
                      <button
                        type="submit"
                        disabled={formSubmitting || !formName.trim() || !formContact.trim()}
                        className="w-full py-3 bg-[var(--coral)] text-white rounded-2xl text-sm font-medium hover:bg-orange-600 disabled:opacity-50 transition-colors"
                      >
                        {formSubmitting ? t('formSubmitting') : t('formSubmit')}
                      </button>
                    </form>
                  )}
                </div>
              ) : (
              <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-[var(--paper)]/50">
                {messages.map((m) => (
                  <div key={m.id} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                    <div className={`flex max-w-[85%] ${m.role === 'user' ? 'flex-row-reverse' : 'flex-row'} items-end gap-2`}>
                      <div className={`w-8 h-8 rounded-full overflow-hidden flex items-center justify-center flex-shrink-0 ${m.role === 'user' ? 'bg-slate-200 text-slate-600' : 'border border-[var(--border-light)] bg-[var(--paper)] p-0.5'}`}>
                        {m.role === 'user' ? <User className="w-4 h-4" /> : <SauleIcon size={32} className="w-full h-full" />}
                      </div>
                      <div className={`px-4 py-3 rounded-2xl text-sm ${m.role === 'user' ? 'bg-[var(--ink)] text-white rounded-br-sm' : 'bg-white border border-[var(--border-light)] text-[var(--ink)] shadow-sm rounded-bl-sm'}`}>
                        {m.role === 'user' ? getMessageText(m) : (
                          <AgentMarkdown>{stripInfoMarkers(getMessageText(m))}</AgentMarkdown>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
                {isLoading && (
                  <div className="flex justify-start">
                    <div className="flex items-end gap-2">
                      <div className="w-8 h-8 rounded-full overflow-hidden border border-[var(--border-light)] bg-[var(--paper)] p-0.5 flex items-center justify-center flex-shrink-0">
                        <SauleIcon size={32} className="w-full h-full" />
                      </div>
                      <div className="px-4 py-3 bg-white border border-[var(--border-light)] rounded-2xl rounded-bl-sm shadow-sm flex space-x-1">
                        <div className="w-2 h-2 bg-slate-300 rounded-full animate-bounce"></div>
                        <div className="w-2 h-2 bg-slate-300 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                        <div className="w-2 h-2 bg-slate-300 rounded-full animate-bounce" style={{ animationDelay: '0.4s' }}></div>
                      </div>
                    </div>
                  </div>
                )}
                <div ref={messagesEndRef} />
              </div>
              )}

              <div className="p-4 bg-white border-t border-[var(--border-light)]">
                {!creditsExhausted && (
                <form onSubmit={onFormSubmit} className="flex relative items-end gap-2">
                  {/* Left Side Microphone Button (when voice enabled) */}
                  {isVoiceEnabled && (
                    <MicButton
                      isRecording={isRecording}
                      isTranscribing={isTranscribing}
                      disabled={isLoading}
                      onPressStart={handleMicPressStart}
                      onPressEnd={handleMicPressEnd}
                      title={t('micHold')}
                    />
                  )}

                  <div className="relative flex-1">
                    <textarea
                      value={input}
                      onChange={(e) => {
                        setInput(e.target.value);
                        e.target.style.height = 'auto';
                        e.target.style.height = `${e.target.scrollHeight}px`;
                      }}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' && !e.shiftKey) {
                          e.preventDefault();
                          if (input.trim() && !isLoading) {
                            e.currentTarget.form?.requestSubmit();
                          }
                        }
                      }}
                      rows={1}
                      placeholder={isRecording ? t('listening') : isTranscribing ? t('transcribing') : t('placeholder')}
                      disabled={isRecording || isTranscribing}
                      className="w-full pl-4 pr-12 py-3 bg-[var(--paper)] border border-[var(--border-light)] rounded-3xl focus:outline-none focus:ring-2 focus:ring-[var(--coral)]/20 focus:border-[var(--coral)] transition-all text-sm resize-none overflow-hidden min-h-[46px] max-h-[150px]"
                      style={{ maxHeight: '150px' }}
                    />
                    <button
                      type="submit"
                      disabled={isLoading || !input.trim() || isRecording || isTranscribing}
                      className="absolute right-1 bottom-1 w-10 h-10 bg-[var(--coral)] text-white rounded-full flex items-center justify-center hover:bg-orange-600 disabled:opacity-50 transition-colors shadow-sm"
                    >
                      <Send className="w-4 h-4 ml-0.5" />
                    </button>
                  </div>
                </form>
                )}
                <p className="text-center text-[10px] text-[var(--muted)] mt-2">
                  {t('signature')} — <a href="https://talkinbio.com/?utm_source=widget&utm_medium=signature&utm_campaign=saule_signature" target="_blank" rel="noreferrer" className="underline hover:text-[var(--coral)]">talkinbio.com</a>
                </p>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Collapsed State — plain flow block for BOTH variants, sized by its own content (preview
          card + input). "inline" used to self-position with `absolute bottom-0 ... h-[31%]`
          against the nearest positioned ancestor (the editor preview's whole phone frame, not
          just its own reserved slot) — since this element contributed no flow height while
          collapsed, the sibling content area's `flex-1` filled the ENTIRE frame instead of
          leaving room for it, so the invisible dock's absolute hit-box floated on top of
          whatever page block happened to render in that bottom band (e.g. "İletişim"), stealing
          its clicks and opening the chat instead. Keeping this in normal flow makes it a real
          flex sibling that the content area's `flex-1` correctly shrinks around. */}
      {!isExpanded && (
        <div
          className={variant === 'sheet' ? 'w-full p-4 flex flex-col justify-end group' : 'w-full p-3 flex flex-col justify-end group shrink-0'}
        >
          {/* Quick preview of last message */}
          <button
            type="button"
            onClick={toggleExpand}
            className="w-full text-left bg-white/95 backdrop-blur border border-[var(--border-light)] rounded-2xl shadow-md p-3 flex items-center justify-between mb-2 transform transition group-hover:-translate-y-0.5"
          >
            <div className="flex items-center space-x-2.5 overflow-hidden">
              <div className="w-8 h-8 rounded-full overflow-hidden flex-shrink-0 border border-[var(--border-light)] bg-[var(--paper)] p-[2px]">
                <SauleIcon size={32} className="w-full h-full" />
              </div>
              <div className="truncate">
                <p className="text-xs sm:text-sm text-[var(--ink)] truncate">
                  {(messages.length > 0 ? stripInfoMarkers(getMessageText(messages[messages.length - 1])) : '').substring(0, 48) || t('defaultPreview')}...
                </p>
              </div>
            </div>
            <div className={`w-7 h-7 rounded-full bg-[var(--paper)] flex items-center justify-center flex-shrink-0 transition ${isPlayingAudio ? 'text-[var(--coral)]' : 'text-[var(--ink-soft)] group-hover:bg-[var(--coral-tint)] group-hover:text-[var(--coral)]'}`}>
              {isPlayingAudio ? <Volume2 className="w-4 h-4 animate-pulse" /> : <MessageCircle className="w-4 h-4" />}
            </div>
          </button>

          <form
            onSubmit={(e) => {
              e.preventDefault();
              if (!input.trim() || isLoading || isRecording || isTranscribing) return;
              sendMessage({ text: input });
              setInput('');
            }}
            className="flex relative items-center gap-2"
          >
            {/* Sesli konuşma: sohbet panelini hiç açmadan basılı tut ve konuş — bkz. yukarıdaki
                karşılama/cevap efekti, panel sadece "önemli bilgi" varsa kendiliğinden açılıyor. */}
            {isVoiceEnabled && (
              <MicButton
                isRecording={isRecording}
                isTranscribing={isTranscribing}
                disabled={isLoading}
                onPressStart={handleMicPressStart}
                onPressEnd={handleMicPressEnd}
                title={t('micHold')}
              />
            )}
            <div className="relative flex-1">
              <input
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    e.currentTarget.form?.requestSubmit();
                  }
                }}
                placeholder={isRecording ? t('listening') : t('placeholder')}
                disabled={isRecording || isTranscribing}
                className="w-full pl-4 pr-12 py-3 bg-white/95 backdrop-blur border border-[var(--border-light)] rounded-full text-sm placeholder-[var(--muted)] shadow-sm focus:outline-none focus:ring-2 focus:ring-[var(--coral)]/20 focus:border-[var(--coral)]"
              />
              <button
                type="submit"
                disabled={isLoading || !input.trim() || isRecording || isTranscribing}
                className="absolute right-1.5 top-1/2 -translate-y-1/2 w-10 h-10 bg-[var(--coral)] text-white rounded-full flex items-center justify-center disabled:opacity-50"
              >
                <Send className="w-4 h-4 ml-0.5" />
              </button>
            </div>
          </form>
        </div>
      )}
    </>
  );
}

import { parseJsonResult } from './parseJsonResult';

export type AnalysisTopic = { question: string; count: number };
export type AnalysisResult = { topics: AnalysisTopic[]; summary: string };

const MAX_TRANSCRIPT_CHARS = 12000;

/** Concatenates visitor messages (oldest first) into a bounded excerpt for the analysis prompt. */
export function buildTranscriptExcerpt(userMessages: string[]): string {
  const joined = userMessages.map((m) => `- ${m}`).join('\n');
  return joined.length > MAX_TRANSCRIPT_CHARS ? joined.slice(-MAX_TRANSCRIPT_CHARS) : joined;
}

export function buildAnalysisPrompt(transcriptExcerpt: string): { system: string; prompt: string } {
  const system = `Sen bir konuşma verisi analistisin. Sana bir işletmenin dijital asistanıyla ziyaretçilerin
son 7 günde yazdığı mesajların bir listesi verilecek. Görevin: tekrar eden konuları/soruları tespit etmek
(aynı konuya farklı kelimelerle sorulmuş sorular tek bir konu sayılır), her birinin kaç kez geçtiğini
saymak ve genel bir özet çıkarmak. Yalnızca gerçekten tekrar eden (en az 2 kez geçen), işletme sahibinin
sayfasına veya bilgi tabanına eklemesi anlamlı olacak somut konulara odaklan; tek seferlik veya çok özel
sorularla listeyi doldurma.

SADECE aşağıdaki şemaya uyan geçerli bir JSON nesnesi döndür, başka hiçbir metin ekleme:
{"topics": [{"question": "kısa konu özeti (örn: 'fiyat bilgisi')", "count": 4}], "summary": "1-2 cümlelik genel özet"}
Konu bulunamazsa topics: [] döndür.`;

  const prompt = `Ziyaretçi mesajları:\n${transcriptExcerpt}`;

  return { system, prompt };
}

export function parseAnalysisResult(text: string): AnalysisResult | null {
  const parsed = parseJsonResult<Partial<AnalysisResult>>(text);
  if (!parsed || !Array.isArray(parsed.topics)) return null;

  const topics = parsed.topics
    .filter((t): t is AnalysisTopic => typeof t?.question === 'string' && typeof t?.count === 'number')
    .slice(0, 3);

  return { topics, summary: typeof parsed.summary === 'string' ? parsed.summary : '' };
}

export function buildInsightTriggerMessage(topic: string): string {
  return `Müşterilerim son 7 günde sık sık "${topic}" hakkında soru sordu. Bununla ilgili bir bölüm veya bilgi tabanı notu ekleyelim mi?`;
}

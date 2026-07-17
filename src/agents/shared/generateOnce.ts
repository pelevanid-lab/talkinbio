import { generateText } from 'ai';
import { getModel, type AgentTask } from '@/utils/ai';

export type GenerateOnceParams = {
  task: AgentTask;
  system: string;
  prompt: string;
};

/**
 * Non-streaming, single-shot completion for cron/background jobs (Faz 3
 * conversation mining, weekly reports) where there's no client to stream to.
 * Mirrors runSauleTurn's model selection but skips tools/message history.
 */
export async function generateOnce({ task, system, prompt }: GenerateOnceParams) {
  const result = await generateText({
    model: getModel(task),
    system,
    prompt,
  });

  return { text: result.text, usage: result.usage };
}

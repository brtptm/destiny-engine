import Anthropic from '@anthropic-ai/sdk';

export const MODEL = process.env.CLAUDE_MODEL || 'claude-opus-5-5';
const enabled = Boolean(process.env.ANTHROPIC_API_KEY) && process.env.AI_DISABLED !== '1';
const client = enabled ? new Anthropic({ timeout: 120_000, maxRetries: 1 }) : null;
let fallbacksSupported = true;

export const aiStatus = () => ({ enabled, model: enabled ? MODEL : null });

const SYSTEM = `You are Destiny Engine, a warm, practical and brutally specific life-transformation coach.
You turn a person's real situation (money, skills, family, time, location) into plans they can act on this week.
Rules:
- Personalise everything: reference the person's actual numbers, job, skills, city and family.
- Every action must be concrete and doable in one sitting (no "work on your brand").
- Be honest about risk but encouraging; even 60% feasibility is achievable with the right plan.
- Use the person's currency (default Indian Rupees, ₹, Indian number formatting).
- Respond with a single JSON object only. No markdown fences, no commentary.`;

function extractJSON(text) {
  const cleaned = text.replace(/^```(?:json)?\s*/i, '').replace(/```\s*$/, '');
  const start = cleaned.indexOf('{');
  const end = cleaned.lastIndexOf('}');
  if (start === -1 || end === -1) throw new Error('No JSON object in model output');
  return JSON.parse(cleaned.slice(start, end + 1));
}

async function send(params) {
  if (fallbacksSupported) {
    try {
      // Server-side refusal fallback: a declined request is retried on a suitable model in the same call.
      return await client.beta.messages
        .stream({ ...params, betas: ['server-side-fallback-2026-07-01'], fallbacks: 'default' })
        .finalMessage();
    } catch (err) {
      if (!(err instanceof Anthropic.BadRequestError)) throw err;
      fallbacksSupported = false; // account/region without the beta — use the plain endpoint from now on
    }
  }
  return client.messages.stream(params).finalMessage();
}

/** Ask Claude for a JSON object. Throws on any failure so callers can fall back. */
export async function askJSON(task, { effort = 'low', maxTokens = 8000 } = {}) {
  if (!client) throw new Error('AI disabled');
  const msg = await send({
    model: MODEL,
    max_tokens: maxTokens,
    system: SYSTEM,
    output_config: { effort },
    messages: [{ role: 'user', content: task }],
  });
  if (msg.stop_reason === 'refusal') throw new Error('Model declined the request');
  if (msg.stop_reason === 'max_tokens') throw new Error('Model output truncated');
  const text = msg.content.filter((b) => b.type === 'text').map((b) => b.text).join('');
  return extractJSON(text);
}

// ------------------------------------------------------------- small cache

const cache = new Map();
const TTL = 60 * 60 * 1000;
export async function cached(key, fn) {
  const hit = cache.get(key);
  if (hit && hit.exp > Date.now()) return hit.value;
  const value = await fn();
  cache.set(key, { value, exp: Date.now() + TTL });
  if (cache.size > 300) cache.delete(cache.keys().next().value);
  return value;
}

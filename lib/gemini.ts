import "server-only";

// Server-side Gemini Flash client. Keys are read here and never leave the server.
// GEMINI_API_KEY_2 (optional) is a backup used when the first key is rate-limited or over quota.

const RETRYABLE = new Set([429, 500, 502, 503, 504]);

/** Tried in order; the next model is used only when one is busy, rate-limited or times out. */
function models(): string[] {
  return [process.env.GEMINI_MODEL?.trim() || "gemini-3.8-flash", "gemini-3.5-flash", "gemini-3.6-flash"].filter(
    (m, i, all) => all.indexOf(m) === i,
  );
}
/** "low" works on both 3.5 and 3.8; scoring benefits from a little reasoning. */
const THINKING_LEVEL = "low";

interface GeminiResponse {
  candidates?: { content?: { parts?: { text?: string; thought?: boolean }[] }; finishReason?: string }[];
  usageMetadata?: Record<string, number>;
}

export class GeminiError extends Error {}

export async function generateJson<T>(opts: {
  system: string;
  prompt: string;
  schema: object;
  timeoutMs?: number;
  label: string;
}): Promise<{ data: T; model: string }> {
  const keys = [process.env.GEMINI_API_KEY, process.env.GEMINI_API_KEY_2].map((k) => k?.trim()).filter(Boolean) as string[];
  if (!keys.length) throw new GeminiError("GEMINI_API_KEY is not set on the server.");
  const reasons: string[] = [];
  // Each model gets 3 attempts with backoff, alternating keys, before falling back to the next model.
  const attempts = models().flatMap((m) => [0, 1, 2].map((n) => ({ model: m, key: keys[n % keys.length], n })));
  for (let i = 0; i < attempts.length; i++) {
    const { model, key, n } = attempts[i];
    if (n > 0) await new Promise((r) => setTimeout(r, keys.length > 1 && n === 1 ? 300 : 1500 * 2 ** n));
    let res: Response;
    try {
      res = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`,
        {
          method: "POST",
          headers: { "content-type": "application/json", "x-goog-api-key": key },
          body: JSON.stringify({
            systemInstruction: { parts: [{ text: opts.system }] },
            contents: [{ role: "user", parts: [{ text: opts.prompt }] }],
            generationConfig: {
              temperature: 0,
              maxOutputTokens: 8192,
              responseMimeType: "application/json",
              responseJsonSchema: opts.schema,
              thinkingConfig: { thinkingLevel: THINKING_LEVEL },
            },
          }),
          signal: AbortSignal.timeout(opts.timeoutMs ?? 90_000),
        },
      );
    } catch (e) {
      reasons.push(`${model}: ${e instanceof Error ? e.name : "request failed"}`);
      continue;
    }
    if (!res.ok) {
      const body = (await res.json().catch(() => null)) as { error?: { message?: string } } | null;
      const reason = `${model}: HTTP ${res.status} ${body?.error?.message?.slice(0, 200) ?? ""}`;
      reasons.push(reason);
      if (RETRYABLE.has(res.status)) continue;
      throw new GeminiError(`${opts.label} failed — ${reason}`);
    }
    const data = (await res.json()) as GeminiResponse;
    const c = data.candidates?.[0];
    const text = (c?.content?.parts ?? [])
      .filter((p) => !p.thought)
      .map((p) => p.text ?? "")
      .join("");
    if (c?.finishReason !== "STOP" || !text) {
      reasons.push(`${model}: finished with ${c?.finishReason ?? "no candidate"}`);
      continue;
    }
    try {
      return { data: JSON.parse(text) as T, model };
    } catch {
      reasons.push(`${model}: response was not valid JSON`);
    }
  }
  throw new GeminiError(`${opts.label} failed — ${reasons.join("; ")}`);
}

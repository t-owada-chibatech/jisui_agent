// 一時的なレート制限・ネットワークエラーを吸収するため、Gemini呼び出しを1回だけ間を置いてリトライする
const DEFAULT_ATTEMPTS = 2;
const DEFAULT_DELAY_MS = 1500;

export async function withGeminiRetry<T>(
  label: string,
  fn: () => Promise<T>,
  attempts: number = DEFAULT_ATTEMPTS,
  delayMs: number = DEFAULT_DELAY_MS
): Promise<T> {
  let lastErr: unknown;
  for (let attempt = 1; attempt <= attempts; attempt++) {
    try {
      return await fn();
    } catch (err) {
      lastErr = err;
      console.error(`[${label}] Gemini error (attempt ${attempt}/${attempts})`, err);
      if (attempt < attempts) {
        await new Promise((resolve) => setTimeout(resolve, delayMs));
      }
    }
  }
  throw lastErr;
}

type StructuredRequest = {
  system: string;
  prompt: string;
  schema: Record<string, unknown>;
  temperature?: number;
  maxOutputTokens?: number;
};

type GeminiResponse = {
  candidates?: Array<{
    content?: { parts?: Array<{ text?: string }> };
  }>;
};

const DEFAULT_MODEL = "gemini-3.5-flash-lite";

/** Server-only Gemini call. The API key is sent in a header and never reaches the browser. */
export async function generateStructuredJSON({
  system,
  prompt,
  schema,
  temperature = 0.2,
  maxOutputTokens = 220,
}: StructuredRequest): Promise<unknown> {
  const apiKey = process.env["GEMINI_API_KEY"];
  if (!apiKey) throw new Error("Gemini is not configured");

  const model = process.env["GEMINI_MODEL"]?.trim() || DEFAULT_MODEL;
  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-goog-api-key": apiKey,
      },
      signal: AbortSignal.timeout(5_000),
      body: JSON.stringify({
        systemInstruction: { parts: [{ text: system }] },
        contents: [{ role: "user", parts: [{ text: prompt }] }],
        generationConfig: {
          temperature,
          maxOutputTokens,
          responseMimeType: "application/json",
          responseJsonSchema: schema,
        },
      }),
    },
  );

  if (!response.ok) {
    // Deliberately omit the response body: upstream errors can contain request details.
    throw new Error(`Gemini is unavailable (${response.status})`);
  }

  const payload = (await response.json()) as GeminiResponse;
  const text = payload.candidates?.[0]?.content?.parts
    ?.map((part) => part.text ?? "")
    .join("")
    .trim();
  if (!text) throw new Error("Gemini returned no structured result");
  return JSON.parse(text) as unknown;
}

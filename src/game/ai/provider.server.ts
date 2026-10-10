type StructuredRequest = {
  system: string;
  prompt: string;
  schema: Record<string, unknown>;
  temperature?: number;
  maxOutputTokens?: number;
};

type ChatResponse = {
  choices?: Array<{ message?: { content?: string | null } }>;
};

/** Fast, cheap model: the Guest must answer within a beat of the player. */
const MODEL = "google/gemini-3.1-flash-lite";

/** Server-only call to Lovable AI Gateway. The key never reaches the browser. */
export async function generateStructuredJSON({
  system,
  prompt,
  schema,
  temperature = 0.2,
  maxOutputTokens = 220,
}: StructuredRequest): Promise<unknown> {
  const apiKey = process.env["LOVABLE_API_KEY"];
  if (!apiKey) throw new Error("AI is not configured");

  const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
      "X-Lovable-AIG-SDK": "fetch",
    },
    body: JSON.stringify({
      model: MODEL,
      temperature,
      max_tokens: maxOutputTokens,
      messages: [
        { role: "system", content: system + "\nReply with JSON only." },
        { role: "user", content: prompt },
      ],
      response_format: {
        type: "json_schema",
        json_schema: { name: "guest_reply", strict: false, schema },
      },
    }),
  });

  if (!response.ok) throw new Error(`AI is unavailable (${response.status})`);

  const payload = (await response.json()) as ChatResponse;
  const text = payload.choices?.[0]?.message?.content?.trim();
  if (!text) throw new Error("AI returned no structured result");
  return JSON.parse(text.replace(/^```(?:json)?\s*|\s*```$/g, "")) as unknown;
}

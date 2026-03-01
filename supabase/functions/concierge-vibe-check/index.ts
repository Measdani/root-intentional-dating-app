import { serve } from "https://deno.land/std@0.224.0/http/server.ts";

type ConversationPayloadMessage = {
  fromUserId: string;
  toUserId: string;
  message: string;
  timestamp: number;
};

type ConciergeRequestBody = {
  conversationId: string;
  userId: string;
  messageCount: number;
  messages: ConversationPayloadMessage[];
};

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const jsonResponse = (status: number, body: Record<string, unknown>) =>
  new Response(JSON.stringify(body), {
    status,
    headers: {
      ...corsHeaders,
      "Content-Type": "application/json",
    },
  });

const isValidPayload = (value: unknown): value is ConciergeRequestBody => {
  if (!value || typeof value !== "object") return false;
  const payload = value as Partial<ConciergeRequestBody>;

  if (typeof payload.conversationId !== "string" || payload.conversationId.trim().length === 0) return false;
  if (typeof payload.userId !== "string" || payload.userId.trim().length === 0) return false;
  if (typeof payload.messageCount !== "number" || payload.messageCount <= 0) return false;
  if (!Array.isArray(payload.messages) || payload.messages.length === 0) return false;

  return payload.messages.every((message) => (
    message &&
    typeof message === "object" &&
    typeof message.fromUserId === "string" &&
    typeof message.toUserId === "string" &&
    typeof message.message === "string" &&
    typeof message.timestamp === "number"
  ));
};

const toCompactTranscript = (messages: ConversationPayloadMessage[]) =>
  messages.slice(-30).map((message) => ({
    from: message.fromUserId,
    to: message.toUserId,
    text: message.message,
    timestamp: message.timestamp,
  }));

serve(async (request) => {
  if (request.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  if (request.method !== "POST") {
    return jsonResponse(405, { error: "Method not allowed" });
  }

  const apiKey = Deno.env.get("OPENAI_API_KEY");
  if (!apiKey) {
    return jsonResponse(503, { error: "OPENAI_API_KEY is not configured" });
  }

  const model = Deno.env.get("OPENAI_MODEL") ?? "gpt-4.1-mini";

  let payload: ConciergeRequestBody;
  try {
    const parsed = await request.json();
    if (!isValidPayload(parsed)) {
      return jsonResponse(400, { error: "Invalid payload" });
    }
    payload = parsed;
  } catch {
    return jsonResponse(400, { error: "Invalid JSON body" });
  }

  const transcript = toCompactTranscript(payload.messages);
  const systemInstruction = [
    "You are an AI concierge for an intentional dating room.",
    "Output concise, neutral, non-judgmental feedback.",
    "Do not assign fixed compatibility scores.",
    "Avoid diagnostic or therapeutic language.",
    "Return valid JSON only.",
  ].join(" ");

  const userPrompt = {
    task: "Generate a private compatibility snapshot for one user.",
    targetUserId: payload.userId,
    conversationId: payload.conversationId,
    messageCount: payload.messageCount,
    transcript,
    outputRules: {
      headline: "Single sentence. Neutral and constructive.",
      highlights: "Array with 2-3 short bullet-like sentences.",
      caution: "Optional single sentence with one growth suggestion.",
    },
  };

  const schema = {
    name: "concierge_vibe_check",
    strict: true,
    schema: {
      type: "object",
      additionalProperties: false,
      required: ["headline", "highlights"],
      properties: {
        headline: { type: "string", minLength: 10, maxLength: 180 },
        highlights: {
          type: "array",
          minItems: 2,
          maxItems: 3,
          items: { type: "string", minLength: 8, maxLength: 180 },
        },
        caution: { type: "string", minLength: 8, maxLength: 220 },
      },
    },
  };

  const openAiResponse = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model,
      temperature: 0.3,
      response_format: {
        type: "json_schema",
        json_schema: schema,
      },
      messages: [
        { role: "system", content: systemInstruction },
        { role: "user", content: JSON.stringify(userPrompt) },
      ],
    }),
  });

  if (!openAiResponse.ok) {
    const errorText = await openAiResponse.text();
    return jsonResponse(502, {
      error: "OpenAI request failed",
      status: openAiResponse.status,
      details: errorText,
    });
  }

  const completion = await openAiResponse.json();
  const rawContent = completion?.choices?.[0]?.message?.content;
  if (typeof rawContent !== "string") {
    return jsonResponse(502, { error: "OpenAI response missing content" });
  }

  try {
    const parsed = JSON.parse(rawContent) as {
      headline: string;
      highlights: string[];
      caution?: string;
    };

    return jsonResponse(200, {
      headline: parsed.headline,
      highlights: parsed.highlights,
      caution: parsed.caution,
      model: completion?.model ?? model,
    });
  } catch {
    return jsonResponse(502, { error: "Failed to parse model JSON output" });
  }
});

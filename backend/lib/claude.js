import dotenv from "dotenv";

dotenv.config();

export async function generateAssistantReply({ systemPrompt, history }) {
  const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
  if (!OPENAI_API_KEY) {
    throw new Error("Missing OPENAI_API_KEY environment variable");
  }
  const BASE_URL = "https://api.openai.com/v1";

  const messages = [{ role: "system", content: systemPrompt }, ...history];

  const response = await fetch(`${BASE_URL}/chat/completions`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${OPENAI_API_KEY}`,
    },
    body: JSON.stringify({
      model: "gpt-4o",
      messages,
      max_tokens: 1000,
      temperature: 0.2,
      top_p: 1,
    }),
  });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`OpenAI request failed: ${response.status} ${body}`);
  }

  const data = await response.json();
  const text = data?.choices?.[0]?.message?.content || "";
  return text.trim();
}

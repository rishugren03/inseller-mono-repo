import dotenv from "dotenv";

dotenv.config();

export async function generateFollowUpEmailContent({
  messages,
  store,
  visitorName,
}) {
  const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
  if (!OPENAI_API_KEY) {
    throw new Error("Missing OPENAI_API_KEY environment variable");
  }
  const BASE_URL = "https://api.openai.com/v1";

  // Build a readable transcript from the messages
  const transcript = messages
    .map((m) => {
      const name = m.role === "user" ? (visitorName || "Customer") : store.botName;
      return `${name}: ${m.content}`;
    })
    .join("\n");

  const systemPrompt = `You are the lead email marketer for the Shopify store at ${store.shopUrl}.
Your goal is to write a highly personalized, high-converting follow-up email to a customer who recently chatted with your store's AI assistant, ${store.botName}.

Here is the conversation transcript:
"""
${transcript}
"""

Instructions:
1. Address the customer by their name (${visitorName || "there"}).
2. Dynamically references their specific inquiries, concerns, or the products they discussed.
3. Be extremely warm, helpful, and polite.
4. Keep the email body short, professional, and punchy (around 80-120 words).
5. Provide a strong Call-To-Action inviting them to return to the store or reply to the email if they have questions.
6. Return your response in JSON format with exactly two keys: "subject" and "body".
7. Do not include any HTML tags or markdown formatting inside the JSON keys, use standard plain text with newlines (\\n) for paragraphs.

Example output:
{
  "subject": "Still thinking about that blue jacket, John?",
  "body": "Hi John,\\n\\nThanks for checking out our store! I saw you were chatting with our assistant earlier about the Waterproof Blue Jacket.\\n\\nIt's one of our best sellers and is currently in stock. If you have any questions about sizing or delivery, feel free to reply directly to this email and we'll be happy to help.\\n\\nBest regards,\\n${store.botName}"
}`;

  const response = await fetch(`${BASE_URL}/chat/completions`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${OPENAI_API_KEY}`,
    },
    body: JSON.stringify({
      model: "gpt-4o",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: "Generate the personalized follow-up email JSON." }
      ],
      response_format: { type: "json_object" },
      temperature: 0.7,
    }),
  });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`OpenAI request failed for follow-up: ${response.status} ${body}`);
  }

  const data = await response.json();
  const text = data?.choices?.[0]?.message?.content || "";
  
  try {
    return JSON.parse(text.trim());
  } catch (err) {
    console.error("Failed to parse AI follow-up response JSON:", text);
    return {
      subject: `Thanks for visiting ${store.botName}`,
      body: `Hi ${visitorName || "there"},\n\nThanks for chatting with ${store.botName}. If you have any further questions or if there is anything else we can help you with, please reply directly to this email.\n\nBest regards,\n${store.botName}`,
    };
  }
}

import express from "express";
import prisma from "../lib/prisma.js";
import { generateAssistantReply } from "../lib/claude.js";
import { sendFollowUpEmail } from "../lib/brevo.js";

const router = express.Router();

function extractAndStripProducts(text) {
  if (!text) return { products: [], cleanText: "" };

  const parsedProducts = [];
  let cleanText = text;

  // Identify JSON-like blocks starting with { and ending with } or end of text
  const jsonBlockRegex = /(\{[\s\S]*?)(?:\}|$)/g;
  
  let match;
  const rangesToRemove = [];
  
  while ((match = jsonBlockRegex.exec(text)) !== null) {
    const fullMatchText = match[0];
    const matchStart = match.index;
    const matchEnd = matchStart + fullMatchText.length;
    
    let parsed = null;
    let jsonStr = fullMatchText;
    if (!jsonStr.endsWith('}')) {
      jsonStr += '}';
    }
    
    // Attempt 1: Standard JSON parse
    try {
      parsed = JSON.parse(jsonStr);
    } catch (e) {
      // Attempt 2: Try appending quotes/braces to handle truncation
      try {
        parsed = JSON.parse(jsonStr + '"');
      } catch (e2) {
        try {
          parsed = JSON.parse(jsonStr + '"}');
        } catch (e3) {
          // Fall back to regex parsing below if JSON parsing fails
        }
      }
    }
    
    let title = "";
    let price = "";
    let url = "";
    
    if (parsed && typeof parsed === "object") {
      title = parsed.title || parsed.product || "";
      price = parsed.price || "";
      url = parsed.url || "";
    } else {
      // Regex fallback for partial/malformed JSON
      const titleMatch = jsonStr.match(/"title"\s*:\s*"(?<title>[^"]+)"/i);
      const priceMatch = jsonStr.match(/"price"\s*:\s*"(?<price>[^"]+)"/i);
      const urlMatch = jsonStr.match(/"url"\s*:\s*"(?<url>[^"]*?)(?:"|$)/i);
      
      if (titleMatch) title = titleMatch.groups.title;
      if (priceMatch) price = priceMatch.groups.price;
      if (urlMatch) url = urlMatch.groups.url;
    }
    
    if (title || url) {
      parsedProducts.push({ title, price, url });
      rangesToRemove.push({ start: matchStart, end: matchEnd });
    }
  }

  // Remove the identified JSON blocks from cleanText (from right to left)
  rangesToRemove.sort((a, b) => b.start - a.start);
  for (const range of rangesToRemove) {
    let startIdx = range.start;
    let endIdx = range.end;
    
    // Look backward for code fences
    const textBefore = cleanText.substring(0, startIdx);
    const codeFenceStartMatch = textBefore.match(/```(?:json)?\s*$/i);
    if (codeFenceStartMatch) {
      startIdx -= codeFenceStartMatch[0].length;
    }
    
    // Look forward for code fences
    const textAfter = cleanText.substring(endIdx);
    const codeFenceEndMatch = textAfter.match(/^\s*```/i);
    if (codeFenceEndMatch) {
      endIdx += codeFenceEndMatch[0].length;
    }
    
    cleanText = cleanText.substring(0, startIdx) + cleanText.substring(endIdx);
  }

  // Clean up excessive newlines and stray bullet lines left from stripping
  cleanText = cleanText
    .replace(/[ \t]+-\s*(?=\n|$)/g, "")
    .replace(/\n{3,}/g, "\n\n")
    .trim();

  return { products: parsedProducts, cleanText };
}

function getProductCacheArray(productCache) {
  if (Array.isArray(productCache)) return productCache;
  if (typeof productCache === "string") {
    try {
      const parsed = JSON.parse(productCache);
      if (Array.isArray(parsed)) return parsed;
    } catch (err) {
      return [];
    }
  }
  return [];
}

function findProductByTitle(products, title) {
  if (!Array.isArray(products) || !title) return null;
  const normalizedTitle = title.trim().toLowerCase();
  return (
    products.find((product) => {
      const pTitle = product?.title?.toString().toLowerCase() || "";
      const pHandle = product?.handle?.toString().toLowerCase() || "";
      return (
        pTitle === normalizedTitle ||
        pHandle === normalizedTitle ||
        pTitle.includes(normalizedTitle)
      );
    }) || null
  );
}

function buildProductCard(store, parsedProduct) {
  if (!parsedProduct) return null;
  const rawProducts = getProductCacheArray(store.productCache);
  const match = findProductByTitle(rawProducts, parsedProduct.title || "");
  const cleanShopUrl = store.shopUrl.replace(/^https?:\/\//, "");
  const url = match?.handle
    ? `https://${cleanShopUrl}/products/${match.handle}`
    : parsedProduct.url;

  // Extract description (plain text, max 150 characters)
  const description = match?.body_html
    ? match.body_html
        .replace(/<[^>]*>/g, "")
        .replace(/\s+/g, " ")
        .trim()
        .slice(0, 150)
    : "";

  // Extract product image
  const image = match?.image?.src || (match?.images && match.images[0]?.src) || null;

  return {
    title: parsedProduct.title || match?.title || "",
    price: parsedProduct.price || (match?.variants && match.variants[0]?.price) || "",
    url,
    image,
    description,
  };
}

function buildProductCards(store, parsedProducts) {
  if (!Array.isArray(parsedProducts)) return [];
  return parsedProducts
    .map((parsedProduct) => buildProductCard(store, parsedProduct))
    .filter(Boolean);
}

function createSystemPrompt(store, shopUrl) {
  return `You are ${store.botName}, an AI sales assistant for this Shopify store. Your job is to help customers find products, answer questions, and close sales.\n\nPRODUCT CATALOG:\n${store.productSummary}\n\nRULES:\n- Be conversational, enthusiastic, and friendly.\n- After the customer's first message, naturally ask for their name and email for follow up.\n- When recommending products, include one JSON object per product in this exact format:\n  {"title":"...","price":"...","url":"..."}\n- When a customer asks about a specific product, do NOT give a boring plain-text reply. Act as a top-tier salesperson: highlight the product's unique selling points, use engaging formatting (like bullet points or bold text), add emojis, create excitement, and ALWAYS end with a strong Call-To-Action (e.g., asking if they are ready to buy) to drive conversion!\n- For order tracking, ask for order number and email, then direct them to ${shopUrl}/account/orders\n- Never make up products not in the catalog.\n- Keep responses short, punchy, and highly persuasive.`;
}

router.post("/", async (req, res) => {
  try {
    const { storeId, message, conversationId, visitorName, visitorEmail, isInquiry } =
      req.body;
    if (!storeId || !message) {
      return res
        .status(400)
        .json({ error: "storeId and message are required" });
    }

    const store = await prisma.store.findUnique({ where: { id: storeId } });
    if (!store) {
      return res.status(404).json({ error: "Store not found" });
    }

    const shopUrl = store.shopUrl;
    let prompt = createSystemPrompt(store, `https://${shopUrl}`);
    if (isInquiry) {
      prompt += "\n\nCRITICAL CONSTRAINT: The user clicked 'Inquire About This' on a product. Explain/summarize the product in under 35 words. Keep it very short, sweet, and highly concise so it fits on screen. Do not include any Call-To-Action questions (like asking if they are ready to buy) as we will render purchase buttons directly below your message.";
    }
    const conversation = conversationId
      ? await prisma.conversation.findUnique({ where: { id: conversationId } })
      : null;

    const history = [];
    if (conversation?.messages) {
      const items = Array.isArray(conversation.messages)
        ? conversation.messages
        : [];
      for (const messageItem of items) {
        history.push({ role: messageItem.role, content: messageItem.content });
      }
    }

    history.push({ role: "user", content: message });

    const replyText = await generateAssistantReply({
      systemPrompt: prompt,
      history,
    });
    const { products: parsedProducts, cleanText } = extractAndStripProducts(replyText);
    const products = buildProductCards(store, parsedProducts);
    const cleanReply = cleanText || replyText;

    const updatedMessages = [
      ...(conversation?.messages || []),
      {
        role: "user",
        content: message,
        visitorName: visitorName || null,
        visitorEmail: visitorEmail || null,
      },
      { role: "assistant", content: replyText },
    ];

    let conv;
    if (conversation) {
      conv = await prisma.conversation.update({
        where: { id: conversation.id },
        data: {
          visitorEmail: visitorEmail || conversation.visitorEmail || null,
          visitorName: visitorName || conversation.visitorName || null,
          messages: updatedMessages,
        },
      });
    } else {
      conv = await prisma.conversation.create({
        data: {
          storeId: store.id,
          visitorEmail: visitorEmail || null,
          visitorName: visitorName || null,
          messages: updatedMessages,
        },
      });
    }

    if (visitorEmail && !conv.emailSent && visitorName) {
      setTimeout(async () => {
        try {
          const senderEmail = process.env.BREVO_SENDER;
          if (senderEmail && store.brevoSender) {
            await sendFollowUpEmail({
              sender: senderEmail,
              replyTo: store.brevoSender,
              recipient: visitorEmail,
              subject: `Thanks for chatting with ${store.botName}`,
              html: `<p>Hi ${visitorName},</p><p>Thanks for chatting with ${store.botName}. If you have more questions, reply to this email and we’ll help you right away.</p>`,
            });
            await prisma.conversation.update({
              where: { id: conv.id },
              data: { emailSent: true },
            });
          }
        } catch (error) {
          console.error("Brevo follow up failed", error);
        }
      }, 3600000);
    }

    return res.json({
      reply: cleanReply,
      product: products[0] || null,
      products,
      conversationId: conv.id,
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: "Unable to generate chat response" });
  }
});

router.get("/:conversationId", async (req, res) => {
  try {
    const { conversationId } = req.params;
    const conversation = await prisma.conversation.findUnique({
      where: { id: conversationId },
      include: { store: true },
    });
    if (!conversation) {
      return res.status(404).json({ error: "Conversation not found" });
    }

    const processedMessages = [];
    const items = Array.isArray(conversation.messages) ? conversation.messages : [];

    for (const msg of items) {
      if (msg.role === "assistant") {
        const { products: parsedProducts, cleanText } = extractAndStripProducts(msg.content);
        const products = buildProductCards(conversation.store, parsedProducts);
        processedMessages.push({
          role: "assistant",
          content: cleanText || msg.content,
          products: products || [],
        });
      } else {
        processedMessages.push(msg);
      }
    }

    return res.json({
      id: conversation.id,
      visitorName: conversation.visitorName,
      visitorEmail: conversation.visitorEmail,
      messages: processedMessages,
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: "Unable to retrieve conversation" });
  }
});

export default router;

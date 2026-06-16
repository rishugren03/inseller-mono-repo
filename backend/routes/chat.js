import express from "express";
import prisma from "../lib/prisma.js";
import { generateAssistantReply } from "../lib/claude.js";
import { sendFollowUpEmail } from "../lib/brevo.js";
import { generateFollowUpEmailContent } from "../lib/followupAi.js";
import { buildThemedEmailHtml } from "../lib/emailTemplate.js";

const router = express.Router();

export function extractAndStripProducts(text) {
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

export function buildProductCards(store, parsedProducts) {
  if (!Array.isArray(parsedProducts)) return [];
  return parsedProducts
    .map((parsedProduct) => buildProductCard(store, parsedProduct))
    .filter(Boolean);
}

function createSystemPrompt(store, shopUrl) {
  return `You are ${store.botName}, an AI sales assistant for this Shopify store. Your job is to help customers find products, answer questions, and close sales.\n\nPRODUCT CATALOG:\n${store.productSummary}\n\nRULES:\n- Be conversational, enthusiastic, and friendly.\n- After the customer's first message, naturally ask for their name and email for follow up.\n- When recommending products, include one JSON object per product in this exact format:\n  {"title":"...","price":"...","url":"..."}\n- CRITICAL: Keep ALL text messages extremely short — strictly under 50 words. Be punchy, direct, and impactful. Product JSON blocks do NOT count toward this limit and must always be included when recommending items.\n- When a customer asks about a specific product, do NOT give a boring plain-text reply. Act as a top-tier salesperson: highlight the product's key selling points with emojis and bold text, and end with one short strong Call-To-Action. Stay under 50 words of text.\n- For order tracking, ask for order number and email, then direct them to ${shopUrl}/account/orders\n- Never make up products not in the catalog.\n- Never write long paragraphs — brevity is essential. One or two punchy sentences max.`;
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

    if (conversation && conversation.takenOver) {
      const updatedMessages = [
        ...(conversation.messages || []),
        {
          role: "user",
          content: message,
          visitorName: visitorName || null,
          visitorEmail: visitorEmail || null,
          timestamp: new Date().toISOString(),
        },
      ];
      const conv = await prisma.conversation.update({
        where: { id: conversation.id },
        data: {
          visitorEmail: visitorEmail || conversation.visitorEmail || null,
          visitorName: visitorName || conversation.visitorName || null,
          messages: updatedMessages,
        },
      });
      return res.json({
        reply: null,
        product: null,
        products: [],
        conversationId: conv.id,
        takenOver: true,
      });
    }

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

    let finalReplyText = replyText;
    if (isInquiry) {
      const match = message.match(/I am interested in:\s*"([^"]+)"/);
      if (match && match[1]) {
        const title = match[1];
        const rawProducts = getProductCacheArray(store.productCache);
        const matchedProduct = findProductByTitle(rawProducts, title);
        if (matchedProduct) {
          const { products: initialProducts } = extractAndStripProducts(replyText);
          const normalizedTargetTitle = matchedProduct.title.trim().toLowerCase();
          const alreadyHasProduct = initialProducts.some((p) => {
            const pTitle = p?.title?.toString().toLowerCase().trim() || "";
            return (
              pTitle === normalizedTargetTitle ||
              pTitle.includes(normalizedTargetTitle) ||
              normalizedTargetTitle.includes(pTitle)
            );
          });

          if (!alreadyHasProduct) {
            const cleanShopUrl = store.shopUrl.replace(/^https?:\/\//, "");
            const url = matchedProduct.handle
              ? `https://${cleanShopUrl}/products/${matchedProduct.handle}`
              : "";
            const price = (matchedProduct.variants && matchedProduct.variants[0]?.price) || "";
            finalReplyText += `\n\n{"title":"${matchedProduct.title}","price":"${price}","url":"${url}"}`;
          }
        }
      }
    }

    const { products: parsedProducts, cleanText } = extractAndStripProducts(finalReplyText);
    
    // Deduplicate parsed products by title
    const uniqueParsedProducts = [];
    const seenTitles = new Set();
    for (const p of parsedProducts) {
      if (p && p.title) {
        const norm = p.title.trim().toLowerCase();
        if (!seenTitles.has(norm)) {
          seenTitles.add(norm);
          uniqueParsedProducts.push(p);
        }
      } else {
        uniqueParsedProducts.push(p);
      }
    }

    const products = buildProductCards(store, uniqueParsedProducts);
    const cleanReply = cleanText || finalReplyText;

    const updatedMessages = [
      ...(conversation?.messages || []),
      {
        role: "user",
        content: message,
        visitorName: visitorName || null,
        visitorEmail: visitorEmail || null,
        timestamp: new Date().toISOString(),
      },
      {
        role: "assistant",
        content: finalReplyText,
        isInquiry: !!isInquiry,
        timestamp: new Date().toISOString(),
      },
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

router.patch("/:conversationId/contact", async (req, res) => {
  try {
    const { conversationId } = req.params;
    const { visitorName, visitorEmail } = req.body;

    if (!visitorName && !visitorEmail) {
      return res.status(400).json({ error: "visitorName or visitorEmail is required" });
    }

    const conversation = await prisma.conversation.findUnique({
      where: { id: conversationId },
    });
    if (!conversation) {
      return res.status(404).json({ error: "Conversation not found" });
    }

    const updated = await prisma.conversation.update({
      where: { id: conversationId },
      data: {
        visitorName: visitorName || conversation.visitorName || null,
        visitorEmail: visitorEmail || conversation.visitorEmail || null,
      },
    });

    return res.json({ success: true, visitorName: updated.visitorName, visitorEmail: updated.visitorEmail });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: "Unable to update contact info" });
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
          ...msg,
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
      takenOver: conversation.takenOver,
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: "Unable to retrieve conversation" });
  }
});

export default router;

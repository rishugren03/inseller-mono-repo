import cron from "node-cron";
import prisma from "./prisma.js";
import { sendFollowUpEmail } from "./brevo.js";
import { generateFollowUpEmailContent } from "./followupAi.js";
import { buildThemedEmailHtml } from "./emailTemplate.js";
import { extractAndStripProducts, buildProductCards } from "../routes/chat.js";

export function startEmailCron() {
  console.log("Initializing follow-up email cron job (every minute)...");
  
  cron.schedule("* * * * *", async () => {
    try {
      const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);

      // Find conversations with email not sent, that have contact details, and are not taken over
      const pendingConversations = await prisma.conversation.findMany({
        where: {
          emailSent: false,
          visitorEmail: { not: null },
          visitorName: { not: null },
          takenOver: false,
        },
        include: {
          store: true,
        },
      });

      for (const conv of pendingConversations) {
        try {
          const messagesArray = Array.isArray(conv.messages) ? conv.messages : [];
          if (messagesArray.length === 0) continue;

          // Check timestamp of the last message to measure inactivity
          const lastMsg = messagesArray[messagesArray.length - 1];
          const lastMsgTimestamp = lastMsg?.timestamp 
            ? new Date(lastMsg.timestamp) 
            : new Date(conv.createdAt);

          if (lastMsgTimestamp <= fiveMinutesAgo) {
            const senderEmail = process.env.BREVO_SENDER;
            if (senderEmail && conv.store.brevoSender) {
              console.log(`Sending follow-up email to ${conv.visitorEmail} for conversation ${conv.id}...`);

              const allProducts = [];
              const seenTitles = new Set();

              for (const msg of messagesArray) {
                if (msg.role === "assistant" && msg.content) {
                  const { products: parsed } = extractAndStripProducts(msg.content);
                  const resolved = buildProductCards(conv.store, parsed);
                  for (const p of resolved) {
                    if (p && p.title && !seenTitles.has(p.title.toLowerCase())) {
                      seenTitles.add(p.title.toLowerCase());
                      allProducts.push(p);
                    }
                  }
                }
              }

              const { subject, body } = await generateFollowUpEmailContent({
                messages: messagesArray,
                store: conv.store,
                visitorName: conv.visitorName,
              });

              const html = buildThemedEmailHtml({
                store: conv.store,
                visitorName: conv.visitorName,
                subject,
                bodyText: body,
                products: allProducts,
              });

              await sendFollowUpEmail({
                sender: senderEmail,
                replyTo: conv.store.brevoSender,
                recipient: conv.visitorEmail,
                subject,
                html,
              });

              await prisma.conversation.update({
                where: { id: conv.id },
                data: { emailSent: true },
              });

              console.log(`Successfully sent follow-up email and marked conversation ${conv.id} as sent.`);
            }
          }
        } catch (innerError) {
          console.error(`Failed to process follow-up email for conversation ${conv.id}:`, innerError);
        }
      }
    } catch (error) {
      console.error("Error running follow-up email cron job:", error);
    }
  });
}

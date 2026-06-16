/**
 * One-shot email test script.
 * Fires follow-up emails for ALL pending conversations immediately,
 * bypassing the 1-hour inactivity threshold.
 *
 * Usage: node --env-file=.env scripts/testEmail.js
 */

import prisma from "../lib/prisma.js";
import { sendFollowUpEmail } from "../lib/brevo.js";
import { generateFollowUpEmailContent } from "../lib/followupAi.js";
import { buildThemedEmailHtml } from "../lib/emailTemplate.js";
import { extractAndStripProducts, buildProductCards } from "../routes/chat.js";

async function main() {
  console.log("🧪 Test email run — bypassing 1-hour threshold...\n");

  // Use a far-future cutoff so every pending conversation qualifies
  const cutoff = new Date(Date.now() + 99 * 365 * 24 * 60 * 60 * 1000);

  const pendingConversations = await prisma.conversation.findMany({
    where: {
      emailSent: false,
      visitorEmail: { not: null },
      visitorName: { not: null },
      takenOver: false,
    },
    include: { store: true },
  });

  if (pendingConversations.length === 0) {
    console.log("No pending conversations found (emailSent=false with name+email).");
    await prisma.$disconnect();
    return;
  }

  console.log(`Found ${pendingConversations.length} pending conversation(s).\n`);

  for (const conv of pendingConversations) {
    try {
      const messagesArray = Array.isArray(conv.messages) ? conv.messages : [];
      if (messagesArray.length === 0) {
        console.log(`  [skip] ${conv.id} — no messages`);
        continue;
      }

      const senderEmail = process.env.BREVO_SENDER;
      if (!senderEmail || !conv.store.brevoSender) {
        console.log(`  [skip] ${conv.id} — missing BREVO_SENDER or store brevoSender`);
        continue;
      }

      const senderName = conv.store.botName || "Inseller";

      // Collect all recommended products from assistant messages
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

      console.log(`  → Generating email for ${conv.visitorEmail} (conv ${conv.id})...`);

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
        senderName,
        replyTo: conv.store.brevoSender,
        recipient: conv.visitorEmail,
        subject,
        html,
      });

      // Mark as sent so it won't fire again in production
      await prisma.conversation.update({
        where: { id: conv.id },
        data: { emailSent: true },
      });

      console.log(`  ✅ Sent to ${conv.visitorEmail} — subject: "${subject}"\n`);
    } catch (err) {
      console.error(`  ❌ Failed for conv ${conv.id}:`, err.message);
    }
  }

  await prisma.$disconnect();
  console.log("Done.");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

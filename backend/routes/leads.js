import express from "express";
import prisma from "../lib/prisma.js";
import { userCanAccessStore } from "../middleware/auth.js";

const router = express.Router();

router.get("/:storeId", async (req, res) => {
  try {
    const { storeId } = req.params;
    const store = await prisma.store.findUnique({ where: { id: storeId } });
    if (!store) {
      return res.status(404).json({ error: "Store not found" });
    }
    if (!userCanAccessStore(req.user, store)) {
      return res.status(403).json({ error: "Store access denied" });
    }

    const conversations = await prisma.conversation.findMany({
      where: { storeId },
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        visitorName: true,
        visitorEmail: true,
        messages: true,
        createdAt: true,
      },
    });

    return res.json(
      conversations.map((conversation) => ({
        id: conversation.id,
        visitorName: conversation.visitorName,
        visitorEmail: conversation.visitorEmail,
        messageCount: Array.isArray(conversation.messages)
          ? conversation.messages.length
          : 0,
        createdAt: conversation.createdAt,
        messages: conversation.messages,
      })),
    );
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: "Unable to load leads" });
  }
});

export default router;

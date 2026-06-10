import express from "express";
import prisma from "../lib/prisma.js";
import { userCanAccessStore } from "../middleware/auth.js";

const router = express.Router();

// GET all conversations for a store
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
    });

    return res.json(conversations);
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: "Unable to load inbox conversations" });
  }
});

// POST toggle takeover state for a conversation
router.post("/:conversationId/takeover", async (req, res) => {
  try {
    const { conversationId } = req.params;
    const { takenOver } = req.body;

    const conversation = await prisma.conversation.findUnique({
      where: { id: conversationId },
      include: { store: true },
    });

    if (!conversation) {
      return res.status(404).json({ error: "Conversation not found" });
    }
    if (!userCanAccessStore(req.user, conversation.store)) {
      return res.status(403).json({ error: "Store access denied" });
    }

    const updated = await prisma.conversation.update({
      where: { id: conversationId },
      data: { takenOver: Boolean(takenOver) },
    });

    return res.json(updated);
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: "Unable to toggle takeover state" });
  }
});

// POST a manual merchant reply to a conversation
router.post("/:conversationId/message", async (req, res) => {
  try {
    const { conversationId } = req.params;
    const { content } = req.body;

    if (!content || !content.trim()) {
      return res.status(400).json({ error: "Message content is required" });
    }

    const conversation = await prisma.conversation.findUnique({
      where: { id: conversationId },
      include: { store: true },
    });

    if (!conversation) {
      return res.status(404).json({ error: "Conversation not found" });
    }
    if (!userCanAccessStore(req.user, conversation.store)) {
      return res.status(403).json({ error: "Store access denied" });
    }

    const updatedMessages = [
      ...(Array.isArray(conversation.messages) ? conversation.messages : []),
      {
        role: "assistant",
        content: content.trim(),
        sender: "merchant",
        timestamp: new Date().toISOString(),
      },
    ];

    const updated = await prisma.conversation.update({
      where: { id: conversationId },
      data: { messages: updatedMessages },
    });

    return res.json(updated);
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: "Unable to send message" });
  }
});

export default router;

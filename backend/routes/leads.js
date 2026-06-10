import express from "express";
import prisma from "../lib/prisma.js";
import { userCanAccessStore } from "../middleware/auth.js";

const router = express.Router();

router.get("/:storeId", async (req, res) => {
  try {
    const { storeId } = req.params;
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const search = req.query.search || "";
    const mode = req.query.mode || "server"; // 'server' or 'all'

    const store = await prisma.store.findUnique({ where: { id: storeId } });
    if (!store) {
      return res.status(404).json({ error: "Store not found" });
    }
    if (!userCanAccessStore(req.user, store)) {
      return res.status(403).json({ error: "Store access denied" });
    }

    const whereClause = { storeId };
    if (search.trim()) {
      whereClause.OR = [
        { visitorName: { contains: search, mode: "insensitive" } },
        { visitorEmail: { contains: search, mode: "insensitive" } },
      ];
    }

    const total = await prisma.conversation.count({ where: whereClause });

    const weeklyCount = await prisma.conversation.count({
      where: {
        storeId,
        createdAt: {
          gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
        },
      },
    });

    let conversations;
    if (mode === "all") {
      conversations = await prisma.conversation.findMany({
        where: whereClause,
        orderBy: { createdAt: "desc" },
      });
    } else {
      conversations = await prisma.conversation.findMany({
        where: whereClause,
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * limit,
        take: limit,
      });
    }

    const mapped = conversations.map((conversation) => ({
      id: conversation.id,
      visitorName: conversation.visitorName,
      visitorEmail: conversation.visitorEmail,
      messageCount: Array.isArray(conversation.messages)
        ? conversation.messages.length
        : 0,
      createdAt: conversation.createdAt,
      messages: conversation.messages,
    }));

    return res.json({
      leads: mapped,
      total,
      weeklyCount,
      page,
      limit,
      pages: Math.ceil(total / limit),
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: "Unable to load leads" });
  }
});

export default router;

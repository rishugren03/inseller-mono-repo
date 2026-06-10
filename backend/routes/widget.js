import express from "express";
import prisma from "../lib/prisma.js";

const router = express.Router();

router.get("/:storeId", async (req, res) => {
  try {
    const { storeId } = req.params;
    const store = await prisma.store.findUnique({
      where: { id: storeId },
      select: {
        botName: true,
        themeColor: true,
        greeting: true,
        shopUrl: true,
        brevoSender: true,
      },
    });
    if (!store) {
      return res.status(404).json({ error: "Store not found" });
    }

    return res.json({
      botName: store.botName,
      themeColor: store.themeColor,
      greeting: store.greeting,
      shopUrl: store.shopUrl,
      brevoSender: store.brevoSender,
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: "Unable to load widget config" });
  }
});

export default router;

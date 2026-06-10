import express from "express";
import prisma from "../lib/prisma.js";
import { userCanAccessStore } from "../middleware/auth.js";

const router = express.Router();

router.patch("/:storeId", async (req, res) => {
  try {
    const { storeId } = req.params;
    const { botName, greeting, themeColor, brevoSender } = req.body;
    const existingStore = await prisma.store.findUnique({
      where: { id: storeId },
    });

    if (!userCanAccessStore(req.user, existingStore)) {
      return res.status(403).json({ error: "Store access denied" });
    }

    const store = await prisma.store.update({
      where: { id: storeId },
      data: {
        userId: req.user.id,
        botName,
        greeting,
        themeColor,
        brevoSender,
      },
    });

    return res.json(store);
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: "Unable to save store settings" });
  }
});

export default router;

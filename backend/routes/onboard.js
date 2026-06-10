import express from "express";
import prisma from "../lib/prisma.js";
import { fetchProductCatalog } from "../lib/shopify.js";

const router = express.Router();

router.post("/", async (req, res) => {
  try {
    const { shopUrl } = req.body;
    if (!shopUrl) {
      return res.status(400).json({ error: "shopUrl is required" });
    }

    const catalog = await fetchProductCatalog(shopUrl).catch((error) => {
      if (error.message && error.message.includes("Shopify fetch failed")) {
        return { products: [], summary: "" };
      }
      throw error;
    });

    const existingStore = await prisma.store.findUnique({ where: { shopUrl } });
    if (existingStore?.userId && existingStore.userId !== req.user.id) {
      return res.status(403).json({ error: "Store belongs to another user" });
    }

    const store = await prisma.store.upsert({
      where: { shopUrl },
      update: {
        userId: req.user.id,
        productCache: catalog.products,
        productSummary: catalog.summary,
      },
      create: {
        shopUrl,
        userId: req.user.id,
        productCache: catalog.products,
        productSummary: catalog.summary,
      },
    });

    const productCount = Array.isArray(catalog.products)
      ? catalog.products.length
      : 0;
    return res.json({ storeId: store.id, productsSynced: productCount });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: "Unable to onboard store" });
  }
});

export default router;

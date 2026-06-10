import express from "express";
import prisma from "../lib/prisma.js";
import { fetchProductCatalog } from "../lib/shopify.js";
import { userCanAccessStore } from "../middleware/auth.js";

const router = express.Router();

router.post("/:storeId", async (req, res) => {
  try {
    const { storeId } = req.params;
    const store = await prisma.store.findUnique({ where: { id: storeId } });
    if (!store) {
      return res.status(404).json({ error: "Store not found" });
    }
    if (!userCanAccessStore(req.user, store)) {
      return res.status(403).json({ error: "Store access denied" });
    }

    const catalog = await fetchProductCatalog(store.shopUrl).catch((error) => {
      console.error(error);
      return { products: [], summary: "" };
    });

    const updated = await prisma.store.update({
      where: { id: storeId },
      data: {
        userId: req.user.id,
        productCache: catalog.products,
        productSummary: catalog.summary,
      },
    });

    const productCount = Array.isArray(catalog.products)
      ? catalog.products.length
      : 0;
    return res.json({ productsSynced: productCount, store: updated });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: "Unable to sync catalog" });
  }
});

export default router;

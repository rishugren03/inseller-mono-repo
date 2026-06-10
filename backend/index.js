import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";

import onboardRouter from "./routes/onboard.js";
import chatRouter from "./routes/chat.js";
import leadsRouter from "./routes/leads.js";
import syncRouter from "./routes/sync.js";
import widgetConfigRouter from "./routes/widget.js";
import storeRouter from "./routes/store.js";
import authRouter from "./routes/auth.js";
import inboxRouter from "./routes/inbox.js";
import { requireAuth } from "./middleware/auth.js";

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());
app.use("/widget", express.static(path.join(__dirname, "../widget")));
app.use("/api/auth", requireAuth, authRouter);
app.use("/api/onboard", requireAuth, onboardRouter);
app.use("/api/chat", chatRouter);
app.use("/api/leads", requireAuth, leadsRouter);
app.use("/api/sync", requireAuth, syncRouter);
app.use("/api/widget-config", widgetConfigRouter);
app.use("/api/store", requireAuth, storeRouter);
app.use("/api/inbox", requireAuth, inboxRouter);

app.use((req, res) => {
  res.status(404).json({ error: "Not found" });
});

app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).json({ error: "Internal server error" });
});

app.listen(PORT, () => {
  console.log(`Inseller backend listening on http://localhost:${PORT}`);
});

import "dotenv/config";

import express from "express";
import cors from "cors";
import { connectDB } from "./db.js";
import chatRoutes from "./routes/chat.js";
import chatSessionRoutes from "./routes/chatSession.js";
import actionRoutes from "./routes/actions.js";
import projectRoutes from "./routes/projectRoutes.js";
import taskRoutes from "./routes/taskRoutes.js";

const app = express();

app.use(cors());
app.use(express.json());
app.use("/api/projects", projectRoutes);
app.use("/api/tasks", taskRoutes);
app.use("/api/chat", chatRoutes);
app.use("/api/chat/sessions", chatSessionRoutes);
app.use("/api/actions", actionRoutes);

app.get("/api/health", (req, res) => {
  res.json({
    status: "ok",
    message: "Agent Workspace server running",
  });
});

const PORT = process.env.PORT || 5000;

connectDB().then(() => {
  app.listen(PORT, () => {
    console.log(`🚀 Server running on http://localhost:${PORT}`);
  });
});
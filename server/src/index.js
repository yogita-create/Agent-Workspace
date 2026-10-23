import "dotenv/config";

import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import { connectDB } from "./db.js";
import chatRoutes from "./routes/chat.js";
import chatSessionRoutes from "./routes/chatSession.js";
import actionRoutes from "./routes/actions.js";
import projectRoutes from "./routes/ProjectRoutes.js";
import taskRoutes from "./routes/taskRoutes.js";
import authRoutes from "./routes/auth.js";
import organizationRoutes from "./routes/organization.js";
import inviteRoutes from "./routes/invite.js";
import epicRoutes from "./routes/epicRoutes.js";
import storyRoutes from "./routes/storyRoutes.js";
import boardRoutes from "./routes/board.js";
import alertRoutes from "./routes/alerts.js";

const app = express();

app.use(cors({ origin: true, credentials: true }));
app.use(express.json());
app.use(cookieParser());
app.use("/api/auth", authRoutes);
app.use("/api/organizations", organizationRoutes);
app.use("/api/invites", inviteRoutes);
app.use("/api/projects", projectRoutes);
app.use("/api/tasks", taskRoutes);
app.use("/api/epics", epicRoutes);
app.use("/api/stories", storyRoutes);
app.use("/api/board", boardRoutes);
app.use("/api/alerts", alertRoutes);
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
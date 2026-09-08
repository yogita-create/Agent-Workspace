import express from "express";
import { runAgent } from "../agent/agentLoop.js";

import Project from "../models/project.js";
import Task from "../models/Task.js";
import ChatSession from "../models/ChatSession.js";
import ChatMessage from "../models/ChatMessage.js";

const router = express.Router();

// ==========================================
// SEND MESSAGE TO AGENT
// POST /api/chat
// ==========================================

router.post("/", async (req, res) => {
  try {
    const { message, sessionId } = req.body;

    // --------------------------------------
    // 1. Validate input
    // --------------------------------------

    if (!message || !message.trim()) {
      return res.status(400).json({
        success: false,
        message: "Message is required",
      });
    }

    if (!sessionId) {
      return res.status(400).json({
        success: false,
        message: "sessionId is required",
      });
    }

    // --------------------------------------
    // 2. Check if chat session exists
    // --------------------------------------

    const session = await ChatSession.findById(sessionId);

    if (!session) {
      return res.status(404).json({
        success: false,
        message: "Chat session not found",
      });
    }

    // --------------------------------------
    // 3. Fetch recent conversation history
    // --------------------------------------

    const previousMessages = await ChatMessage.find({ sessionId })
      .sort({ createdAt: -1 })
      .limit(8)
      .lean();

    // Reverse to chronological order
    const history = previousMessages.reverse();

    // --------------------------------------
    // 4. Save user's message
    // --------------------------------------

    await ChatMessage.create({
      sessionId: sessionId,
      role: "user",
      content: message,
    });

    // --------------------------------------
    // 5. Get current projects, tasks and team members
    // --------------------------------------

    const projects = await Project.find();
    const tasks = await Task.find().populate("projectId", "name status");

    const memberMap = new Map();
    memberMap.set("yogita@example.com", {
      name: "Yogita",
      email: "yogita@example.com",
      role: "Lead Developer",
    });

    projects.forEach((p) => {
      if (Array.isArray(p.members)) {
        p.members.forEach((m) => {
          if (m.email) {
            memberMap.set(m.email.toLowerCase(), {
              name: m.name,
              email: m.email,
              role: m.role || "Member",
            });
          }
        });
      }
    });

    // --------------------------------------
    // 6. Run Agent
    // --------------------------------------

    const result = await runAgent(
      message,
      {
        projects,
        tasks,
        collaborators: Array.from(memberMap.values()),
      },
      history
    );

    // --------------------------------------
    // 7. Get proposed action IDs
    // --------------------------------------

    const proposedActionIds = result.proposedActions
      ? result.proposedActions.map((action) => action._id)
      : [];

    // --------------------------------------
    // 8. Save Agent's response
    // --------------------------------------

    await ChatMessage.create({
      sessionId: sessionId,
      role: "assistant",
      content:
        result.agentReply ||
        "I've proposed some actions for your approval.",
      proposedActions: proposedActionIds,
    });

    // --------------------------------------
    // 9. Update session
    // --------------------------------------

    session.lastMessageAt = new Date();

    // If this is the first real message, use it as the chat title
    if (session.title === "New Chat") {
      session.title =
        message.length > 40
          ? message.substring(0, 40) + "..."
          : message;
    }

    await session.save();

    // --------------------------------------
    // 10. Send response to frontend
    // --------------------------------------

    res.status(200).json({
      success: true,
      sessionId: session._id,
      agentReply: result.agentReply,
      proposedActions: result.proposedActions || [],
    });

  } catch (err) {
    console.error("Agent error:", err);

    res.status(500).json({
      success: false,
      error: err.message,
    });
  }
});

export default router;
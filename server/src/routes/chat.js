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
    // 3. Save user's message
    // --------------------------------------

    await ChatMessage.create({
      sessionId: sessionId,
      role: "user",
      content: message,
    });


    // --------------------------------------
    // 4. Get current projects and tasks
    // --------------------------------------

    const projects = await Project.find();
    const tasks = await Task.find().populate(
      "projectId",
      "name"
    );


    // --------------------------------------
    // 5. Run Agent
    // --------------------------------------

    const result = await runAgent(message, {
      projects,
      tasks,
    });


    // --------------------------------------
    // 6. Get proposed action IDs
    // --------------------------------------

    const proposedActionIds = result.proposedActions
      ? result.proposedActions.map((action) => action._id)
      : [];


    // --------------------------------------
    // 7. Save Agent's response
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
    // 8. Update session
    // --------------------------------------

    session.lastMessageAt = new Date();

    // If this is the first real message,
    // use it as the chat title
    if (session.title === "New Chat") {
      session.title =
        message.length > 40
          ? message.substring(0, 40) + "..."
          : message;
    }

    await session.save();


    // --------------------------------------
    // 9. Send response to frontend
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
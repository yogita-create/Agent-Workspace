import express from "express";
import ChatSession from "../models/ChatSession.js";
import ChatMessage from "../models/ChatMessage.js";

const router = express.Router();


// ==========================================
// 1. CREATE NEW CHAT SESSION
// POST /api/chat/sessions
// ==========================================

router.post("/", async (req, res) => {
  try {
    const session = await ChatSession.create({
      title: "New Chat",
    });

    res.status(201).json({
      success: true,
      session,
    });
  } catch (error) {
    console.error("Create session error:", error.message);

    res.status(500).json({
      success: false,
      message: "Failed to create chat session",
    });
  }
});


// ==========================================
// 2. GET ALL CHAT SESSIONS
// GET /api/chat/sessions
// ==========================================

router.get("/", async (req, res) => {
  try {
    const sessions = await ChatSession.find()
      .sort({ lastMessageAt: -1 })
      .select("_id title lastMessageAt createdAt");

    res.status(200).json({
      success: true,
      sessions,
    });
  } catch (error) {
    console.error("Get sessions error:", error.message);

    res.status(500).json({
      success: false,
      message: "Failed to fetch chat sessions",
    });
  }
});


// ==========================================
// 3. GET CHAT HISTORY
// GET /api/chat/sessions/:sessionId/messages
// ==========================================

router.get("/:sessionId/messages", async (req, res) => {
  try {
    const { sessionId } = req.params;

    // Check if session exists
    const session = await ChatSession.findById(sessionId);

    if (!session) {
      return res.status(404).json({
        success: false,
        message: "Chat session not found",
      });
    }

    // Get all messages of this session
    const messages = await ChatMessage.find({
      sessionId,
    })
      .sort({ createdAt: 1 })
      .populate("proposedActions");

    res.status(200).json({
      success: true,
      session,
      messages,
    });
  } catch (error) {
    console.error("Get chat history error:", error.message);

    res.status(500).json({
      success: false,
      message: "Failed to fetch chat history",
    });
  }
});


export default router;
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
    const { title } = req.body;
    const session = await ChatSession.create({
      title: title && title.trim() ? title.trim() : "New Chat",
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
      .sort({ lastMessageAt: -1, createdAt: -1 })
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

// ==========================================
// 4. RENAME CHAT SESSION
// PATCH /api/chat/sessions/:sessionId
// ==========================================

router.patch("/:sessionId", async (req, res) => {
  try {
    const { sessionId } = req.params;
    const { title } = req.body;

    if (!title || !title.trim()) {
      return res.status(400).json({
        success: false,
        message: "Title is required",
      });
    }

    const session = await ChatSession.findByIdAndUpdate(
      sessionId,
      { title: title.trim() },
      { new: true }
    );

    if (!session) {
      return res.status(404).json({
        success: false,
        message: "Chat session not found",
      });
    }

    res.status(200).json({
      success: true,
      message: "Session renamed successfully",
      session,
    });
  } catch (error) {
    console.error("Rename session error:", error.message);

    res.status(500).json({
      success: false,
      message: "Failed to rename chat session",
    });
  }
});

// ==========================================
// 5. DELETE CHAT SESSION
// DELETE /api/chat/sessions/:sessionId
// ==========================================

router.delete("/:sessionId", async (req, res) => {
  try {
    const { sessionId } = req.params;

    const session = await ChatSession.findByIdAndDelete(sessionId);

    if (!session) {
      return res.status(404).json({
        success: false,
        message: "Chat session not found",
      });
    }

    // Also delete all messages belonging to this session
    await ChatMessage.deleteMany({ sessionId });

    res.status(200).json({
      success: true,
      message: "Chat session deleted successfully",
      sessionId,
    });
  } catch (error) {
    console.error("Delete session error:", error.message);

    res.status(500).json({
      success: false,
      message: "Failed to delete chat session",
    });
  }
});

export default router;
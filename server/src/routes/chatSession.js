import express from "express";
import ChatSession from "../models/ChatSession.js";
import ChatMessage from "../models/ChatMessage.js";
import PendingAction from "../models/PendingAction.js";

const router = express.Router();


// ==========================================
// CREATE NEW CHAT SESSION
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
    console.error("Create session error:", error);

    res.status(500).json({
      success: false,
      message: "Failed to create chat session",
    });
  }
});


// ==========================================
// GET ALL CHAT SESSIONS
// GET /api/chat/sessions
// ==========================================

router.get("/", async (req, res) => {
  try {
    const sessions = await ChatSession.find()
      .sort({ lastMessageAt: -1 })
      .select("_id title lastMessageAt createdAt");

    res.json({
      success: true,
      sessions,
    });

  } catch (error) {

    console.error(error);

    res.status(500).json({
      success: false,
      message: "Failed to fetch chat sessions",
    });

  }
});


// ==========================================
// RENAME CHAT SESSION
// PUT /api/chat/sessions/:sessionId
// ==========================================

router.put("/:sessionId", async (req, res) => {
  try {

    const { title } = req.body;

    if (!title || !title.trim()) {
      return res.status(400).json({
        success: false,
        message: "Title is required",
      });
    }

    const session = await ChatSession.findByIdAndUpdate(
      req.params.sessionId,
      {
        title: title.trim(),
      },
      {
        new: true,
        runValidators: true,
      }
    );

    if (!session) {
      return res.status(404).json({
        success: false,
        message: "Chat session not found",
      });
    }

    res.json({
      success: true,
      session,
    });

  } catch (error) {

    console.error(error);

    res.status(500).json({
      success: false,
      message: "Rename failed",
    });

  }
});


// ==========================================
// DELETE CHAT SESSION
// DELETE /api/chat/sessions/:sessionId
// ==========================================

router.delete("/:sessionId", async (req, res) => {
  try {

    const { sessionId } = req.params;

    // Get all chat messages
    const messages = await ChatMessage.find({
      sessionId,
    });

    // Collect Pending Action IDs
    const pendingActionIds = messages.flatMap(
      (message) => message.proposedActions || []
    );

    // Delete Pending Actions
    if (pendingActionIds.length > 0) {
      await PendingAction.deleteMany({
        _id: {
          $in: pendingActionIds,
        },
      });
    }

    // Delete Messages
    await ChatMessage.deleteMany({
      sessionId,
    });

    // Delete Session
    const deletedSession =
      await ChatSession.findByIdAndDelete(sessionId);

    if (!deletedSession) {
      return res.status(404).json({
        success: false,
        message: "Chat session not found",
      });
    }

    res.json({
      success: true,
      message: "Chat deleted successfully",
    });

  } catch (error) {

    console.error(error);

    res.status(500).json({
      success: false,
      message: "Delete failed",
    });

  }
});


// ==========================================
// GET CHAT HISTORY
// GET /api/chat/sessions/:sessionId/messages
// ==========================================

router.get("/:sessionId/messages", async (req, res) => {
  try {

    const { sessionId } = req.params;

    const session =
      await ChatSession.findById(sessionId);

    if (!session) {
      return res.status(404).json({
        success: false,
        message: "Chat session not found",
      });
    }

    const messages = await ChatMessage.find({
      sessionId,
    })
      .sort({
        createdAt: 1,
      })
      .populate("proposedActions");

    res.json({
      success: true,
      session,
      messages,
    });

  } catch (error) {

    console.error(error);

    res.status(500).json({
      success: false,
      message: "Failed to fetch chat history",
    });

  }
});

export default router;
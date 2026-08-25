import express from "express";

import {
  runAgent,
  generateSessionTitle,
} from "../agent/agentLoop.js";

import Project from "../models/project.js";
import Task from "../models/Task.js";
import ChatSession from "../models/ChatSession.js";
import ChatMessage from "../models/ChatMessage.js";

const router = express.Router();

// ==========================================================
// SETTINGS
// ==========================================================

// Generate a meaningful title after the user has sent
// at least 2 messages.
const TITLE_AFTER_USER_MESSAGES = 2;

// ==========================================================
// POST /api/chat
// SEND MESSAGE TO AGENT
// ==========================================================

router.post("/", async (req, res) => {
  try {
    const {
      message,
      sessionId,
    } = req.body;

    // ======================================================
    // 1. VALIDATE MESSAGE
    // ======================================================

    if (
      !message ||
      !message.trim()
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Message is required",
      });
    }

    if (!sessionId) {
      return res.status(400).json({
        success: false,
        message:
          "sessionId is required",
      });
    }

    const userMessage =
      message.trim();

    // ======================================================
    // 2. FIND SESSION
    // ======================================================

    const session =
      await ChatSession.findById(
        sessionId
      );

    if (!session) {
      return res.status(404).json({
        success: false,
        message:
          "Chat session not found",
      });
    }

    // ======================================================
    // 3. LOAD PREVIOUS CHAT HISTORY
    // ======================================================
    //
    // IMPORTANT:
    // We load the history BEFORE saving the current
    // user message.
    //
    // Therefore runAgent receives:
    //
    // previous user message
    // previous assistant response
    // current user message
    //
    // This prevents the current message from appearing twice.
    // ======================================================

    const previousMessages =
      await ChatMessage.find({
        sessionId,
      })
        .sort({
          createdAt: 1,
        })
        .select(
          "role content createdAt"
        )
        .lean();

    const history =
      previousMessages.map(
        (chatMessage) => ({
          role:
            chatMessage.role,

          content:
            chatMessage.content,
        })
      );

    // ======================================================
    // 4. SAVE CURRENT USER MESSAGE
    // ======================================================

    await ChatMessage.create({
      sessionId,

      role: "user",

      content: userMessage,
    });

    // ======================================================
    // 5. LOAD PROJECTS
    // ======================================================

    const projects =
      await Project.find()
        .select(
          "_id name status"
        )
        .lean();

    // ======================================================
    // 6. LOAD TASKS WITH PROJECT NAME
    // ======================================================

    const tasks =
      await Task.find()
        .populate(
          "projectId",
          "_id name status"
        )
        .lean();

    // ======================================================
    // 7. RUN AGENT
    // ======================================================

    const result =
      await runAgent(
        userMessage,
        {
          projects,

          tasks,

          history,

          currentDate:
            new Date().toISOString(),
        }
      );

    // ======================================================
    // 8. GET PROPOSED ACTION IDs
    // ======================================================

    const proposedActionIds =
      result.proposedActions
        ? result.proposedActions.map(
            (action) =>
              action._id
          )
        : [];

    // ======================================================
    // 9. SAVE AGENT RESPONSE
    // ======================================================

    await ChatMessage.create({
      sessionId,

      role: "assistant",

      content:
        result.agentReply ||
        "I've proposed an action for your approval.",

      proposedActions:
        proposedActionIds,
    });

    // ======================================================
    // 10. UPDATE SESSION ACTIVITY
    // ======================================================

    session.lastMessageAt =
      new Date();

    // ======================================================
    // 11. GENERATE MEANINGFUL TITLE
    // ======================================================

    if (
      session.title ===
      "New Chat"
    ) {
      const userMessages =
        await ChatMessage.find({
          sessionId,

          role: "user",
        })
          .sort({
            createdAt: 1,
          })
          .select(
            "content"
          )
          .lean();

      // ----------------------------------------------------
      // Wait until at least 2 user messages.
      // ----------------------------------------------------

      if (
        userMessages.length >=
        TITLE_AFTER_USER_MESSAGES
      ) {
        try {
          const generatedTitle =
            await generateSessionTitle(
              userMessages.map(
                (msg) =>
                  msg.content
              )
            );

          if (
            generatedTitle &&
            generatedTitle.trim()
          ) {
            session.title =
              generatedTitle
                .trim()
                .slice(0, 60);
          }
        } catch (titleError) {
          console.error(
            "Session title generation error:",
            titleError
          );

          // Keep "New Chat" if title generation fails.
        }
      }
    }

    // ======================================================
    // 12. SAVE SESSION
    // ======================================================

    await session.save();

    // ======================================================
    // 13. SEND RESPONSE TO FRONTEND
    // ======================================================

    return res.status(200).json({
      success: true,

      sessionId:
        session._id,

      agentReply:
        result.agentReply,

      proposedActions:
        result.proposedActions ||
        [],

      sessionTitle:
        session.title,
    });
  } catch (error) {
    console.error(
      "Agent error:",
      error
    );

    return res.status(500).json({
      success: false,

      error:
        error.message ||
        "Something went wrong while processing the message.",
    });
  }
});

export default router;
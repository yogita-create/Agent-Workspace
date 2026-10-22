import express from "express";
import Story from "../models/Story.js";
import Task from "../models/Task.js";
import Project from "../models/project.js";
import Membership from "../models/Membership.js";
import { verifyToken } from "../middleware/verifyToken.js";

const router = express.Router();

// Apply verifyToken middleware
router.use(verifyToken);

// ==========================================
// GET BOARD (Stories & standalone Tasks for a project, grouped by status)
// GET /api/board?projectId=xxx
// ==========================================
router.get("/", async (req, res) => {
  try {
    const { projectId } = req.query;

    if (!projectId) {
      return res.status(400).json({
        success: false,
        message: "projectId query parameter is required",
      });
    }

    const project = await Project.findById(projectId);
    if (!project) {
      return res.status(404).json({
        success: false,
        message: "Project not found",
      });
    }

    // Verify organization membership
    if (project.organizationId) {
      const membership = await Membership.findOne({
        userId: req.user.id,
        organizationId: project.organizationId,
      });

      if (!membership) {
        return res.status(403).json({
          success: false,
          message: "Access denied. You are not a member of this project's organization",
        });
      }
    }

    // 1. Fetch stories for this project
    const stories = await Story.find({ projectId })
      .populate("epicId", "title color status")
      .populate("createdBy", "name email")
      .sort({ createdAt: -1 })
      .lean();

    const taggedStories = stories.map((s) => ({
      ...s,
      type: "story",
    }));

    // 2. Fetch standalone tasks (where storyId is null / undefined)
    const tasks = await Task.find({
      projectId,
      $or: [
        { story: null },
        { storyId: null },
        { story: { $exists: false } },
        { storyId: { $exists: false } },
      ],
    })
      .populate("projectId", "name status organizationId members")
      .sort({ createdAt: -1 })
      .lean();

    const taggedTasks = tasks.map((t) => ({
      ...t,
      type: "task",
    }));

    const allItems = [...taggedStories, ...taggedTasks];

    // 3. Group by status
    const grouped = {
      todo: [],
      in_progress: [],
      in_review: [],
      done: [],
      backlog: [],
    };

    allItems.forEach((item) => {
      const rawStatus = (item.status || "todo").toLowerCase().trim();
      let key = "todo";
      if (rawStatus === "in_progress" || rawStatus === "in progress") {
        key = "in_progress";
      } else if (rawStatus === "in_review" || rawStatus === "in review") {
        key = "in_review";
      } else if (rawStatus === "done" || rawStatus === "completed") {
        key = "done";
      } else if (rawStatus === "backlog") {
        key = "backlog";
      } else if (rawStatus === "todo" || rawStatus === "to do") {
        key = "todo";
      } else {
        key = rawStatus.replace(/\s+/g, "_");
      }

      if (!grouped[key]) {
        grouped[key] = [];
      }
      grouped[key].push(item);
    });

    res.status(200).json({
      success: true,
      projectId,
      project: {
        _id: project._id,
        name: project.name,
        status: project.status,
      },
      grouped,
      stories: taggedStories,
      tasks: taggedTasks,
      totalCount: allItems.length,
    });
  } catch (error) {
    console.error("Get board error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch board data",
      error: error.message,
    });
  }
});

export default router;

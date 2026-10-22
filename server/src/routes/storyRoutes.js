import express from "express";
import mongoose from "mongoose";
import Story from "../models/Story.js";
import Epic from "../models/Epic.js";
import Project from "../models/project.js";
import Task from "../models/Task.js";
import Membership from "../models/Membership.js";
import { verifyToken } from "../middleware/verifyToken.js";

const router = express.Router();

// Apply verifyToken middleware to all story routes
router.use(verifyToken);

// ==========================================
// CREATE STORY
// POST /api/stories
// (requires epicId, derives projectId from the epic)
// ==========================================
router.post("/", async (req, res) => {
  try {
    const {
      title,
      description,
      acceptanceCriteria,
      epicId,
      priority,
      storyPoints,
      assignee,
      status,
    } = req.body;

    if (!title || !title.trim()) {
      return res.status(400).json({
        success: false,
        message: "Story title is required",
      });
    }

    if (!epicId) {
      return res.status(400).json({
        success: false,
        message: "epicId is required",
      });
    }

    // Verify epic exists and populate project
    const epic = await Epic.findById(epicId).populate("projectId");
    if (!epic) {
      return res.status(404).json({
        success: false,
        message: "Epic not found",
      });
    }

    // Derive projectId from the epic
    const projectId = epic.projectId?._id || epic.projectId;
    if (!projectId) {
      return res.status(400).json({
        success: false,
        message: "Unable to derive projectId from epic",
      });
    }

    // Verify user organization membership
    const project = await Project.findById(projectId);
    if (!project) {
      return res.status(404).json({
        success: false,
        message: "Project associated with epic not found",
      });
    }

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

    const story = await Story.create({
      title: title.trim(),
      description: description ? description.trim() : "",
      acceptanceCriteria: acceptanceCriteria ? acceptanceCriteria.trim() : "",
      epicId: epic._id,
      projectId: project._id,
      status: status || "todo",
      priority: priority || "medium",
      assignee: assignee || { name: "Unassigned", email: "" },
      storyPoints:
        storyPoints !== undefined && storyPoints !== null && storyPoints !== ""
          ? Number(storyPoints)
          : null,
      createdBy: req.user.id,
    });

    const populatedStory = await Story.findById(story._id)
      .populate("epicId", "title color status")
      .populate("projectId", "name status organizationId")
      .populate("createdBy", "name email");

    res.status(201).json({
      success: true,
      message: "Story created successfully",
      story: populatedStory,
    });
  } catch (error) {
    console.error("Create story error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to create story",
      error: error.message,
    });
  }
});

// ==========================================
// GET STORIES (by epicId or by projectId or scoped to user's orgs)
// GET /api/stories
// ==========================================
router.get("/", async (req, res) => {
  try {
    const { epicId, projectId, status, priority } = req.query;
    const filter = {};

    const memberships = await Membership.find({ userId: req.user.id });
    const orgIds = memberships.map((m) => m.organizationId);

    const userProjects = await Project.find({
      $or: [
        { organizationId: { $in: orgIds } },
        { organizationId: { $exists: false } },
        { organizationId: null },
      ],
    }).select("_id");
    const userProjectIds = userProjects.map((p) => p._id.toString());

    if (epicId) {
      if (mongoose.Types.ObjectId.isValid(epicId)) {
        filter.epicId = epicId;
      } else {
        return res.status(200).json({ success: true, stories: [] });
      }
    }

    if (projectId && projectId !== "all") {
      if (
        mongoose.Types.ObjectId.isValid(projectId) &&
        userProjectIds.includes(projectId.toString())
      ) {
        filter.projectId = projectId;
      } else {
        return res.status(200).json({ success: true, stories: [] });
      }
    } else if (!filter.epicId) {
      filter.projectId = { $in: userProjectIds };
    }

    if (status) {
      filter.status = status;
    }
    if (priority) {
      filter.priority = priority;
    }

    const stories = await Story.find(filter)
      .populate("epicId", "title color status")
      .populate("projectId", "name status organizationId")
      .populate("createdBy", "name email")
      .sort({ createdAt: -1 })
      .lean();

    // Attach linked task counts per story
    const storyIds = stories.map((s) => s._id);
    const taskCounts = await Task.aggregate([
      { $match: { storyId: { $in: storyIds } } },
      { $group: { _id: "$storyId", count: { $sum: 1 } } },
    ]);
    const taskCountMap = new Map(
      taskCounts.map((tc) => [tc._id.toString(), tc.count])
    );

    const enrichedStories = stories.map((s) => ({
      ...s,
      taskCount: taskCountMap.get(s._id.toString()) || 0,
    }));

    res.status(200).json({
      success: true,
      stories: enrichedStories,
    });
  } catch (error) {
    console.error("Get stories error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch stories",
      error: error.message,
    });
  }
});

// ==========================================
// GET SINGLE STORY
// GET /api/stories/:id
// ==========================================
router.get("/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const story = await Story.findById(id)
      .populate("epicId", "title color status")
      .populate("projectId", "name status organizationId")
      .populate("createdBy", "name email");

    if (!story) {
      return res.status(404).json({
        success: false,
        message: "Story not found",
      });
    }

    if (story.projectId && story.projectId.organizationId) {
      const membership = await Membership.findOne({
        userId: req.user.id,
        organizationId: story.projectId.organizationId,
      });

      if (!membership) {
        return res.status(403).json({
          success: false,
          message: "Access denied. You are not a member of this project's organization",
        });
      }
    }

    const taskCount = await Task.countDocuments({ storyId: story._id });
    const storyObj = story.toObject();
    storyObj.taskCount = taskCount;

    res.status(200).json({
      success: true,
      story: storyObj,
    });
  } catch (error) {
    console.error("Get single story error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch story",
      error: error.message,
    });
  }
});

// ==========================================
// UPDATE STORY
// PUT /api/stories/:id
// (any org member can update status; admin/manager for title/priority/core fields)
// ==========================================
router.put("/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const story = await Story.findById(id).populate("projectId");

    if (!story) {
      return res.status(404).json({
        success: false,
        message: "Story not found",
      });
    }

    let userRole = "employee";
    if (story.projectId && story.projectId.organizationId) {
      const membership = await Membership.findOne({
        userId: req.user.id,
        organizationId: story.projectId.organizationId,
      });

      if (!membership) {
        return res.status(403).json({
          success: false,
          message: "Access denied. You are not a member of this project's organization",
        });
      }
      userRole = membership.role;
    }

    const isPrivileged = userRole === "admin" || userRole === "manager";
    const {
      title,
      description,
      acceptanceCriteria,
      status,
      priority,
      assignee,
      storyPoints,
      epicId,
    } = req.body;

    const hasPrivilegedFieldUpdates =
      title !== undefined ||
      priority !== undefined ||
      acceptanceCriteria !== undefined ||
      storyPoints !== undefined ||
      epicId !== undefined;

    if (hasPrivilegedFieldUpdates && !isPrivileged) {
      return res.status(403).json({
        success: false,
        message:
          "Access denied. Only organization admins and managers can update story title, priority, acceptance criteria, or epic link",
      });
    }

    const updateData = {};
    if (status !== undefined) updateData.status = status;
    if (description !== undefined) updateData.description = description.trim();
    if (assignee !== undefined) updateData.assignee = assignee;

    if (isPrivileged) {
      if (title !== undefined) {
        if (!title.trim()) {
          return res.status(400).json({
            success: false,
            message: "Story title cannot be empty",
          });
        }
        updateData.title = title.trim();
      }
      if (priority !== undefined) updateData.priority = priority;
      if (acceptanceCriteria !== undefined)
        updateData.acceptanceCriteria = acceptanceCriteria.trim();
      if (storyPoints !== undefined)
        updateData.storyPoints =
          storyPoints === "" || storyPoints === null ? null : Number(storyPoints);
      if (epicId !== undefined) updateData.epicId = epicId;
    }

    const updatedStory = await Story.findByIdAndUpdate(id, updateData, {
      new: true,
      runValidators: true,
    })
      .populate("epicId", "title color status")
      .populate("projectId", "name status organizationId")
      .populate("createdBy", "name email");

    res.status(200).json({
      success: true,
      message: "Story updated successfully",
      story: updatedStory,
    });
  } catch (error) {
    console.error("Update story error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to update story",
      error: error.message,
    });
  }
});

// ==========================================
// DELETE STORY (admin or manager only)
// DELETE /api/stories/:id
// ==========================================
router.delete("/:id", async (req, res) => {
  try {
    const { id } = req.params;

    const story = await Story.findById(id).populate("projectId");
    if (!story) {
      return res.status(404).json({
        success: false,
        message: "Story not found",
      });
    }

    if (story.projectId && story.projectId.organizationId) {
      const membership = await Membership.findOne({
        userId: req.user.id,
        organizationId: story.projectId.organizationId,
      });

      if (!membership) {
        return res.status(403).json({
          success: false,
          message: "Access denied. You are not a member of this project's organization",
        });
      }

      if (membership.role !== "admin" && membership.role !== "manager") {
        return res.status(403).json({
          success: false,
          message: "Access denied. Only organization admins and managers can delete stories",
        });
      }
    }

    await Story.findByIdAndDelete(id);

    res.status(200).json({
      success: true,
      message: "Story deleted successfully",
    });
  } catch (error) {
    console.error("Delete story error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to delete story",
      error: error.message,
    });
  }
});

export default router;

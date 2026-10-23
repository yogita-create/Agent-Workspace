import express from "express";
import mongoose from "mongoose";
import Story from "../models/Story.js";
import Epic from "../models/Epic.js";
import Project from "../models/project.js";
import Task from "../models/Task.js";
import Membership from "../models/Membership.js";
import { verifyToken } from "../middleware/verifyToken.js";

const router = express.Router();

const checkStoryOverdue = (dueDate, status) => {
  if (!dueDate) return false;
  const isDone = ["done", "Done", "completed", "Completed"].includes(status);
  return new Date(dueDate) < new Date() && !isDone;
};

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
      dueDate,
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

    let parsedDueDate = null;
    if (dueDate) {
      const d = new Date(dueDate);
      if (isNaN(d.getTime())) {
        return res.status(400).json({
          success: false,
          message: "Invalid due date format",
        });
      }
      parsedDueDate = d;
    }

    if (parsedDueDate && epic.dueDate && parsedDueDate > new Date(epic.dueDate)) {
      return res.status(400).json({
        success: false,
        message: `Story due date cannot be after epic due date (${new Date(epic.dueDate).toLocaleDateString()})`,
      });
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
      dueDate: parsedDueDate,
      createdBy: req.user.id,
    });

    const populatedStory = await Story.findById(story._id)
      .populate("epicId", "title color status")
      .populate("projectId", "name status organizationId")
      .populate("createdBy", "name email");

    const storyObj = populatedStory.toObject ? populatedStory.toObject() : { ...populatedStory };
    storyObj.isOverdue = checkStoryOverdue(storyObj.dueDate, storyObj.status);

    res.status(201).json({
      success: true,
      message: "Story created successfully",
      story: storyObj,
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

    // Attach linked task counts and done counts per story
    const storyIds = stories.map((s) => s._id);
    const taskStats = await Task.aggregate([
      {
        $match: {
          $or: [
            { story: { $in: storyIds } },
            { storyId: { $in: storyIds } },
          ],
        },
      },
      {
        $project: {
          storyKey: { $ifNull: ["$story", "$storyId"] },
          isDone: {
            $cond: [
              { $in: ["$status", ["done", "Done", "completed", "Completed"]] },
              1,
              0,
            ],
          },
        },
      },
      {
        $group: {
          _id: "$storyKey",
          taskCount: { $sum: 1 },
          doneCount: { $sum: "$isDone" },
        },
      },
    ]);

    const taskStatMap = new Map(
      taskStats.map((tc) => [
        tc._id.toString(),
        { taskCount: tc.taskCount, doneCount: tc.doneCount },
      ])
    );

    const enrichedStories = stories.map((s) => {
      const stat = taskStatMap.get(s._id.toString()) || {
        taskCount: 0,
        doneCount: 0,
      };
      return {
        ...s,
        taskCount: stat.taskCount,
        doneCount: stat.doneCount,
        isOverdue: checkStoryOverdue(s.dueDate, s.status),
      };
    });

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

    const taskCount = await Task.countDocuments({
      $or: [{ story: story._id }, { storyId: story._id }],
    });
    const doneCount = await Task.countDocuments({
      $or: [{ story: story._id }, { storyId: story._id }],
      status: { $in: ["done", "Done", "completed", "Completed"] },
    });

    const storyObj = story.toObject ? story.toObject() : { ...story };
    storyObj.taskCount = taskCount;
    storyObj.doneCount = doneCount;
    storyObj.isOverdue = checkStoryOverdue(storyObj.dueDate, storyObj.status);

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
// GET TASKS OF A STORY
// GET /api/stories/:id/tasks
// ==========================================
router.get("/:id/tasks", async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid story ID",
      });
    }

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
          message:
            "Access denied. You are not a member of this project's organization",
        });
      }
    }

    const tasks = await Task.find({
      $or: [{ story: story._id }, { storyId: story._id }],
    })
      .populate("projectId", "name status organizationId members")
      .populate("story", "title epicId status priority")
      .sort({ createdAt: 1 });

    res.status(200).json({
      success: true,
      tasks,
    });
  } catch (error) {
    console.error("Get story tasks error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch tasks for story",
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
      dueDate,
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

    let parsedDueDate = undefined;
    if (dueDate !== undefined) {
      if (dueDate === null || dueDate === "") {
        parsedDueDate = null;
      } else {
        const d = new Date(dueDate);
        if (isNaN(d.getTime())) {
          return res.status(400).json({
            success: false,
            message: "Invalid due date format",
          });
        }
        parsedDueDate = d;
      }
    }

    const effectiveDueDate =
      parsedDueDate !== undefined
        ? parsedDueDate
        : story.dueDate
        ? new Date(story.dueDate)
        : null;

    const targetEpicId = epicId !== undefined ? epicId : (story.epicId || story.epic);
    if (effectiveDueDate && targetEpicId) {
      const targetEpic = await Epic.findById(targetEpicId);
      if (targetEpic && targetEpic.dueDate && effectiveDueDate > new Date(targetEpic.dueDate)) {
        return res.status(400).json({
          success: false,
          message: `Story due date cannot be after epic due date (${new Date(targetEpic.dueDate).toLocaleDateString()})`,
        });
      }
    }

    const updateData = {};
    if (status !== undefined) updateData.status = status;
    if (description !== undefined) updateData.description = description.trim();
    if (assignee !== undefined) updateData.assignee = assignee;
    if (dueDate !== undefined) updateData.dueDate = parsedDueDate;

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

    const storyObj = updatedStory.toObject ? updatedStory.toObject() : { ...updatedStory };
    storyObj.isOverdue = checkStoryOverdue(storyObj.dueDate, storyObj.status);

    res.status(200).json({
      success: true,
      message: "Story updated successfully",
      story: storyObj,
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

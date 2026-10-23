import express from "express";
import mongoose from "mongoose";
import Epic from "../models/Epic.js";
import Story from "../models/Story.js";
import Task from "../models/Task.js";
import Project from "../models/project.js";
import Membership from "../models/Membership.js";
import { verifyToken } from "../middleware/verifyToken.js";

const router = express.Router();

const checkEpicOverdue = (dueDate, status) => {
  if (!dueDate) return false;
  const isDone = ["done", "Done", "completed", "Completed"].includes(status);
  return new Date(dueDate) < new Date() && !isDone;
};

// Apply verifyToken middleware to all epic routes
router.use(verifyToken);

// ==========================================
// CREATE EPIC
// POST /api/epics
// ==========================================
router.post("/", async (req, res) => {
  try {
    const { title, description, projectId, status, color, startDate, dueDate } = req.body;

    if (!title || !title.trim()) {
      return res.status(400).json({
        success: false,
        message: "Epic title is required",
      });
    }

    if (!projectId) {
      return res.status(400).json({
        success: false,
        message: "projectId is required",
      });
    }

    // Verify project exists
    const project = await Project.findById(projectId);
    if (!project) {
      return res.status(404).json({
        success: false,
        message: "Project not found",
      });
    }

    // Verify user organization membership if organizationId is present
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

    const parsedStartDate = startDate ? new Date(startDate) : null;
    const parsedDueDate = dueDate ? new Date(dueDate) : null;

    if (startDate && isNaN(parsedStartDate?.getTime())) {
      return res.status(400).json({
        success: false,
        message: "Invalid start date format",
      });
    }

    if (dueDate && isNaN(parsedDueDate?.getTime())) {
      return res.status(400).json({
        success: false,
        message: "Invalid due date format",
      });
    }

    if (parsedStartDate && parsedDueDate && parsedDueDate < parsedStartDate) {
      return res.status(400).json({
        success: false,
        message: "Epic due date cannot be before start date",
      });
    }

    const epic = await Epic.create({
      title: title.trim(),
      description: description ? description.trim() : "",
      projectId,
      status: status || "todo",
      color: color || "#6366f1",
      startDate: parsedStartDate,
      dueDate: parsedDueDate,
      createdBy: req.user.id,
    });

    const populatedEpic = await Epic.findById(epic._id)
      .populate("projectId", "name status organizationId")
      .populate("createdBy", "name email");

    const epicObj = populatedEpic.toObject ? populatedEpic.toObject() : { ...populatedEpic };
    epicObj.isOverdue = checkEpicOverdue(epicObj.dueDate, epicObj.status);

    res.status(201).json({
      success: true,
      message: "Epic created successfully",
      epic: epicObj,
    });
  } catch (error) {
    console.error("Create epic error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to create epic",
      error: error.message,
    });
  }
});

// ==========================================
// GET ALL EPICS (by projectId or scoped to user's orgs)
// GET /api/epics
// ==========================================
router.get("/", async (req, res) => {
  try {
    const { projectId } = req.query;
    const filter = {};

    // Get all organizations the user belongs to
    const memberships = await Membership.find({ userId: req.user.id });
    const orgIds = memberships.map((m) => m.organizationId);

    // Get all projects belonging to user's organizations
    const userProjects = await Project.find({
      $or: [
        { organizationId: { $in: orgIds } },
        { organizationId: { $exists: false } },
        { organizationId: null },
      ],
    }).select("_id");
    const userProjectIds = userProjects.map((p) => p._id.toString());

    if (projectId && projectId !== "all") {
      if (
        mongoose.Types.ObjectId.isValid(projectId) &&
        userProjectIds.includes(projectId.toString())
      ) {
        filter.projectId = projectId;
      } else {
        return res.status(200).json({
          success: true,
          epics: [],
        });
      }
    } else {
      filter.projectId = { $in: userProjectIds };
    }

    const epics = await Epic.find(filter)
      .populate("projectId", "name status organizationId")
      .populate("createdBy", "name email")
      .sort({ createdAt: -1 })
      .lean();

    const epicIds = epics.map((e) => e._id);

    // Fetch all stories for these epics
    const allStories = await Story.find({
      $or: [{ epicId: { $in: epicIds } }, { epic: { $in: epicIds } }],
    }).select("_id epicId epic");

    const allStoryIds = allStories.map((s) => s._id);

    // Aggregate tasks to find which stories are done (has >=1 task and all tasks are done)
    const taskStats = await Task.aggregate([
      {
        $match: {
          $or: [
            { story: { $in: allStoryIds } },
            { storyId: { $in: allStoryIds } },
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

    const doneStorySet = new Set();
    taskStats.forEach((st) => {
      // A story is done when it has at least 1 task and all its tasks are Done
      if (st.taskCount > 0 && st.taskCount === st.doneCount) {
        doneStorySet.add(st._id.toString());
      }
    });

    // Map counts to epics
    const epicStoryMap = new Map();
    allStories.forEach((st) => {
      const eId = (st.epicId || st.epic)?.toString();
      if (!eId) return;
      if (!epicStoryMap.has(eId)) {
        epicStoryMap.set(eId, { total: 0, done: 0 });
      }
      const data = epicStoryMap.get(eId);
      data.total += 1;
      if (doneStorySet.has(st._id.toString())) {
        data.done += 1;
      }
    });

    const enrichedEpics = epics.map((e) => {
      const data = epicStoryMap.get(e._id.toString()) || { total: 0, done: 0 };
      return {
        ...e,
        totalStories: data.total,
        doneStories: data.done,
        isOverdue: checkEpicOverdue(e.dueDate, e.status),
      };
    });

    res.status(200).json({
      success: true,
      epics: enrichedEpics,
    });
  } catch (error) {
    console.error("Get epics error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch epics",
      error: error.message,
    });
  }
});

// ==========================================
// GET SINGLE EPIC
// GET /api/epics/:id
// ==========================================
router.get("/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const epic = await Epic.findById(id)
      .populate("projectId", "name status organizationId")
      .populate("createdBy", "name email");

    if (!epic) {
      return res.status(404).json({
        success: false,
        message: "Epic not found",
      });
    }

    if (epic.projectId && epic.projectId.organizationId) {
      const membership = await Membership.findOne({
        userId: req.user.id,
        organizationId: epic.projectId.organizationId,
      });

      if (!membership) {
        return res.status(403).json({
          success: false,
          message: "Access denied. You are not a member of this project's organization",
        });
      }
    }

    const stories = await Story.find({
      $or: [{ epicId: epic._id }, { epic: epic._id }],
    }).select("_id");
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

    let doneStories = 0;
    taskStats.forEach((st) => {
      if (st.taskCount > 0 && st.taskCount === st.doneCount) {
        doneStories += 1;
      }
    });

    const epicObj = epic.toObject ? epic.toObject() : { ...epic };
    epicObj.totalStories = stories.length;
    epicObj.doneStories = doneStories;
    epicObj.isOverdue = checkEpicOverdue(epicObj.dueDate, epicObj.status);

    res.status(200).json({
      success: true,
      epic: epicObj,
    });
  } catch (error) {
    console.error("Get single epic error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch epic",
      error: error.message,
    });
  }
});

// ==========================================
// UPDATE EPIC (admin or manager only)
// PUT /api/epics/:id
// ==========================================
router.put("/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const { title, description, status, color, projectId, startDate, dueDate } = req.body;

    const epic = await Epic.findById(id).populate("projectId");
    if (!epic) {
      return res.status(404).json({
        success: false,
        message: "Epic not found",
      });
    }

    // Verify admin/manager role in the project's organization
    if (epic.projectId && epic.projectId.organizationId) {
      const membership = await Membership.findOne({
        userId: req.user.id,
        organizationId: epic.projectId.organizationId,
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
          message: "Access denied. Only organization admins and managers can update epics",
        });
      }
    }

    let parsedStartDate = undefined;
    if (startDate !== undefined) {
      if (startDate === null || startDate === "") {
        parsedStartDate = null;
      } else {
        const d = new Date(startDate);
        if (isNaN(d.getTime())) {
          return res.status(400).json({
            success: false,
            message: "Invalid start date format",
          });
        }
        parsedStartDate = d;
      }
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

    const effectiveStartDate =
      parsedStartDate !== undefined
        ? parsedStartDate
        : epic.startDate
        ? new Date(epic.startDate)
        : null;

    const effectiveDueDate =
      parsedDueDate !== undefined
        ? parsedDueDate
        : epic.dueDate
        ? new Date(epic.dueDate)
        : null;

    if (effectiveStartDate && effectiveDueDate && effectiveDueDate < effectiveStartDate) {
      return res.status(400).json({
        success: false,
        message: "Epic due date cannot be before start date",
      });
    }

    // Epic dueDate must not be moved earlier than the latest dueDate of its stories
    if (dueDate !== undefined && effectiveDueDate) {
      const storiesWithDueDates = await Story.find({
        $or: [{ epicId: epic._id }, { epic: epic._id }],
        dueDate: { $ne: null },
      }).select("dueDate title");

      for (const story of storiesWithDueDates) {
        if (story.dueDate && new Date(story.dueDate) > effectiveDueDate) {
          return res.status(400).json({
            success: false,
            message: `Epic due date cannot be earlier than story "${story.title}" due date (${new Date(story.dueDate).toLocaleDateString()})`,
          });
        }
      }
    }

    const updateData = {};
    if (title !== undefined) {
      if (!title.trim()) {
        return res.status(400).json({
          success: false,
          message: "Epic title cannot be empty",
        });
      }
      updateData.title = title.trim();
    }
    if (description !== undefined) updateData.description = description.trim();
    if (status !== undefined) updateData.status = status;
    if (color !== undefined) updateData.color = color;
    if (projectId !== undefined) updateData.projectId = projectId;
    if (startDate !== undefined) updateData.startDate = parsedStartDate;
    if (dueDate !== undefined) updateData.dueDate = parsedDueDate;

    const updatedEpic = await Epic.findByIdAndUpdate(id, updateData, {
      new: true,
      runValidators: true,
    })
      .populate("projectId", "name status organizationId")
      .populate("createdBy", "name email");

    const epicObj = updatedEpic.toObject ? updatedEpic.toObject() : { ...updatedEpic };
    epicObj.isOverdue = checkEpicOverdue(epicObj.dueDate, epicObj.status);

    res.status(200).json({
      success: true,
      message: "Epic updated successfully",
      epic: epicObj,
    });
  } catch (error) {
    console.error("Update epic error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to update epic",
      error: error.message,
    });
  }
});

// ==========================================
// DELETE EPIC (admin or manager only)
// DELETE /api/epics/:id
// ==========================================
router.delete("/:id", async (req, res) => {
  try {
    const { id } = req.params;

    const epic = await Epic.findById(id).populate("projectId");
    if (!epic) {
      return res.status(404).json({
        success: false,
        message: "Epic not found",
      });
    }

    if (epic.projectId && epic.projectId.organizationId) {
      const membership = await Membership.findOne({
        userId: req.user.id,
        organizationId: epic.projectId.organizationId,
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
          message: "Access denied. Only organization admins and managers can delete epics",
        });
      }
    }

    await Epic.findByIdAndDelete(id);

    res.status(200).json({
      success: true,
      message: "Epic deleted successfully",
    });
  } catch (error) {
    console.error("Delete epic error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to delete epic",
      error: error.message,
    });
  }
});

export default router;

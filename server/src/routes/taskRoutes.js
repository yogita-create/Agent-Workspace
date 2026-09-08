import express from "express";
import mongoose from "mongoose";
import Task from "../models/Task.js";
import Project from "../models/project.js";

const router = express.Router();

// ==========================================
// GET ALL TASKS (with optional filters)
// GET /api/tasks
// ==========================================
router.get("/", async (req, res) => {
  try {
    const { projectId, status, priority, assigneeEmail, search } = req.query;
    const filter = {};

    if (projectId) {
      if (mongoose.Types.ObjectId.isValid(projectId)) {
        filter.projectId = projectId;
      }
    }

    if (status) {
      filter.status = status;
    }

    if (priority) {
      filter.priority = priority;
    }

    if (assigneeEmail) {
      filter["assignee.email"] = assigneeEmail;
    }

    if (search && search.trim()) {
      filter.$or = [
        { title: { $regex: search.trim(), $options: "i" } },
        { description: { $regex: search.trim(), $options: "i" } },
        { taskKey: { $regex: search.trim(), $options: "i" } },
      ];
    }

    const tasks = await Task.find(filter)
      .populate("projectId", "name status")
      .sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      tasks,
    });
  } catch (error) {
    console.error("Get tasks error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch tasks",
      error: error.message,
    });
  }
});

// ==========================================
// GET UNIQUE COLLABORATORS FROM PROJECTS
// GET /api/tasks/collaborators/all
// ==========================================
router.get("/collaborators/all", async (req, res) => {
  try {
    const projects = await Project.find().select("members name");
    const memberMap = new Map();

    // Default workspace user
    memberMap.set("yogita@example.com", {
      name: "Yogita",
      email: "yogita@example.com",
      role: "Lead Developer",
      projectName: "Workspace",
    });

    projects.forEach((proj) => {
      if (Array.isArray(proj.members)) {
        proj.members.forEach((m) => {
          if (m.email && m.name) {
            memberMap.set(m.email.toLowerCase(), {
              name: m.name,
              email: m.email,
              role: m.role || "Member",
              projectName: proj.name,
            });
          }
        });
      }
    });

    res.status(200).json({
      success: true,
      collaborators: Array.from(memberMap.values()),
    });
  } catch (error) {
    console.error("Get collaborators error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch collaborators",
    });
  }
});

// ==========================================
// GET SINGLE TASK
// GET /api/tasks/:taskId
// ==========================================
router.get("/:taskId", async (req, res) => {
  try {
    const { taskId } = req.params;
    const task = await Task.findById(taskId).populate("projectId", "name status members");

    if (!task) {
      return res.status(404).json({
        success: false,
        message: "Task not found",
      });
    }

    res.status(200).json({
      success: true,
      task,
    });
  } catch (error) {
    console.error("Get single task error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch task",
      error: error.message,
    });
  }
});

// ==========================================
// CREATE NEW TASK
// POST /api/tasks
// ==========================================
router.post("/", async (req, res) => {
  try {
    const {
      projectId,
      title,
      description,
      status,
      priority,
      deadline,
      assignee,
      createdBy,
    } = req.body;

    if (!projectId) {
      return res.status(400).json({
        success: false,
        message: "projectId is required",
      });
    }

    if (!title || !title.trim()) {
      return res.status(400).json({
        success: false,
        message: "Task title is required",
      });
    }

    // Generate taskKey
    const count = await Task.countDocuments();
    const taskKey = `TSK-${100 + count + 1}`;

    const task = await Task.create({
      projectId,
      taskKey,
      title: title.trim(),
      description: description || "",
      status: status || "todo",
      priority: priority || "medium",
      deadline: deadline ? new Date(deadline) : null,
      assignee: assignee || {
        name: "Unassigned",
        email: "",
      },
      createdBy: createdBy || {
        name: "Yogita",
        email: "yogita@example.com",
      },
      sharedWith: [],
    });

    const populatedTask = await Task.findById(task._id).populate(
      "projectId",
      "name status"
    );

    res.status(201).json({
      success: true,
      message: "Task created successfully",
      task: populatedTask,
    });
  } catch (error) {
    console.error("Create task error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to create task",
      error: error.message,
    });
  }
});

// ==========================================
// UPDATE TASK
// PUT /api/tasks/:taskId
// ==========================================
router.put("/:taskId", async (req, res) => {
  try {
    const { taskId } = req.params;
    const {
      title,
      description,
      status,
      priority,
      deadline,
      assignee,
      projectId,
    } = req.body;

    const updateData = {};

    if (title !== undefined) updateData.title = title.trim();
    if (description !== undefined) updateData.description = description;
    if (status !== undefined) updateData.status = status;
    if (priority !== undefined) updateData.priority = priority;
    if (deadline !== undefined) updateData.deadline = deadline ? new Date(deadline) : null;
    if (assignee !== undefined) updateData.assignee = assignee;
    if (projectId !== undefined) updateData.projectId = projectId;

    const updatedTask = await Task.findByIdAndUpdate(taskId, updateData, {
      new: true,
      runValidators: true,
    }).populate("projectId", "name status");

    if (!updatedTask) {
      return res.status(404).json({
        success: false,
        message: "Task not found",
      });
    }

    res.status(200).json({
      success: true,
      message: "Task updated successfully",
      task: updatedTask,
    });
  } catch (error) {
    console.error("Update task error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to update task",
      error: error.message,
    });
  }
});

// ==========================================
// SHARE TASK WITH COLLABORATOR
// POST /api/tasks/:taskId/share
// ==========================================
router.post("/:taskId/share", async (req, res) => {
  try {
    const { taskId } = req.params;
    const { name, email, role, note, sharedBy } = req.body;

    if (!name || !email) {
      return res.status(400).json({
        success: false,
        message: "Recipient name and email are required to share the task",
      });
    }

    const task = await Task.findById(taskId);
    if (!task) {
      return res.status(404).json({
        success: false,
        message: "Task not found",
      });
    }

    // Check if already shared with this email
    const existingIndex = task.sharedWith.findIndex(
      (s) => s.email.toLowerCase() === email.toLowerCase()
    );

    const shareEntry = {
      name: name.trim(),
      email: email.trim().toLowerCase(),
      role: role || "Collaborator",
      sharedAt: new Date(),
      sharedBy: sharedBy || "Yogita",
      note: note || "",
    };

    if (existingIndex >= 0) {
      task.sharedWith[existingIndex] = shareEntry;
    } else {
      task.sharedWith.push(shareEntry);
    }

    // Add note as a comment if provided
    if (note && note.trim()) {
      task.comments.push({
        author: sharedBy || "Yogita",
        text: `Shared this task with ${name} (${role || "Collaborator"}): "${note.trim()}"`,
        createdAt: new Date(),
      });
    }

    await task.save();

    const populatedTask = await Task.findById(task._id).populate(
      "projectId",
      "name status"
    );

    res.status(200).json({
      success: true,
      message: `Task shared with ${name} successfully`,
      task: populatedTask,
    });
  } catch (error) {
    console.error("Share task error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to share task",
      error: error.message,
    });
  }
});

// ==========================================
// ASSIGN / REASSIGN TASK
// POST /api/tasks/:taskId/assign
// ==========================================
router.post("/:taskId/assign", async (req, res) => {
  try {
    const { taskId } = req.params;
    const { name, email } = req.body;

    const task = await Task.findByIdAndUpdate(
      taskId,
      {
        assignee: {
          name: name || "Unassigned",
          email: email || "",
        },
      },
      { new: true }
    ).populate("projectId", "name status");

    if (!task) {
      return res.status(404).json({
        success: false,
        message: "Task not found",
      });
    }

    res.status(200).json({
      success: true,
      message: `Task assigned to ${name || "Unassigned"}`,
      task,
    });
  } catch (error) {
    console.error("Assign task error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to assign task",
      error: error.message,
    });
  }
});

// ==========================================
// ADD COMMENT / ACTIVITY TO TASK
// POST /api/tasks/:taskId/comments
// ==========================================
router.post("/:taskId/comments", async (req, res) => {
  try {
    const { taskId } = req.params;
    const { author, text } = req.body;

    if (!text || !text.trim()) {
      return res.status(400).json({
        success: false,
        message: "Comment text is required",
      });
    }

    const task = await Task.findById(taskId);
    if (!task) {
      return res.status(404).json({
        success: false,
        message: "Task not found",
      });
    }

    task.comments.push({
      author: author || "Yogita",
      text: text.trim(),
      createdAt: new Date(),
    });

    await task.save();

    res.status(200).json({
      success: true,
      message: "Comment added",
      comments: task.comments,
    });
  } catch (error) {
    console.error("Add comment error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to add comment",
      error: error.message,
    });
  }
});

// ==========================================
// DELETE TASK
// DELETE /api/tasks/:taskId
// ==========================================
router.delete("/:taskId", async (req, res) => {
  try {
    const { taskId } = req.params;
    const deletedTask = await Task.findByIdAndDelete(taskId);

    if (!deletedTask) {
      return res.status(404).json({
        success: false,
        message: "Task not found",
      });
    }

    res.status(200).json({
      success: true,
      message: "Task deleted successfully",
    });
  } catch (error) {
    console.error("Delete task error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to delete task",
      error: error.message,
    });
  }
});

export default router;

import express from "express";
import mongoose from "mongoose";
import Task from "../models/Task.js";
import Project from "../models/project.js";

const router = express.Router();


// ==========================================
// CREATE TASK FOR PROJECT
// POST /api/projects/:projectId/tasks
// ==========================================

router.post("/projects/:projectId/tasks", async (req, res) => {
  try {
    const { projectId } = req.params;

    const {
      title,
      description,
      priority,
      status,
      deadline,
    } = req.body;


    // --------------------------------------
    // Validate Project ID
    // --------------------------------------

    if (!mongoose.Types.ObjectId.isValid(projectId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid project ID",
      });
    }


    // --------------------------------------
    // Validate Task Title
    // --------------------------------------

    if (!title || !title.trim()) {
      return res.status(400).json({
        success: false,
        message: "Task title is required",
      });
    }


    // --------------------------------------
    // Check Project Exists
    // --------------------------------------

    const project = await Project.findById(projectId);

    if (!project) {
      return res.status(404).json({
        success: false,
        message: "Project not found",
      });
    }


    // --------------------------------------
    // Create Task
    // --------------------------------------

    const task = await Task.create({
      projectId,
      title: title.trim(),
      description: description || "",
      priority: priority || "medium",
      status: status || "todo",
      deadline: deadline || null,
      createdByAgent: false,
    });


    // --------------------------------------
    // Response
    // --------------------------------------

    res.status(201).json({
      success: true,
      message: "Task created successfully",
      task,
    });

  } catch (error) {

    console.error(
      "Create task error:",
      error
    );

    res.status(500).json({
      success: false,
      message: "Failed to create task",
      error: error.message,
    });
  }
});
// ==========================================
// GET ALL TASKS
// GET /api/tasks
// ==========================================

router.get("/tasks", async (req, res) => {
  try {
    const tasks = await Task.find()
      .populate("projectId", "name")
      .sort({
        createdAt: -1,
      });

    res.status(200).json({
      success: true,
      tasks,
    });
  } catch (error) {
    console.error(
      "Get all tasks error:",
      error
    );

    res.status(500).json({
      success: false,
      message: "Failed to fetch tasks",
      error: error.message,
    });
  }
});

// ==========================================
// GET ALL TASKS FOR A PROJECT
// GET /api/projects/:projectId/tasks
// ==========================================

router.get("/projects/:projectId/tasks", async (req, res) => {
  try {
    const { projectId } = req.params;


    // --------------------------------------
    // Validate Project ID
    // --------------------------------------

    if (!mongoose.Types.ObjectId.isValid(projectId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid project ID",
      });
    }


    // --------------------------------------
    // Check Project Exists
    // --------------------------------------

    const project = await Project.findById(projectId);

    if (!project) {
      return res.status(404).json({
        success: false,
        message: "Project not found",
      });
    }


    // --------------------------------------
    // Get Project Tasks
    // --------------------------------------

        const tasks = await Task.find({
      projectId,
    })
      .populate("projectId", "name")
      .sort({
        createdAt: -1,
      });


    // --------------------------------------
    // Response
    // --------------------------------------

    res.status(200).json({
      success: true,
      tasks,
    });

  } catch (error) {

    console.error(
      "Get project tasks error:",
      error
    );

    res.status(500).json({
      success: false,
      message: "Failed to fetch project tasks",
      error: error.message,
    });
  }
});


// ==========================================
// GET SINGLE TASK
// GET /api/tasks/:taskId
// ==========================================

router.get("/tasks/:taskId", async (req, res) => {
  try {
    const { taskId } = req.params;


    // --------------------------------------
    // Validate Task ID
    // --------------------------------------

    if (!mongoose.Types.ObjectId.isValid(taskId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid task ID",
      });
    }


    // --------------------------------------
    // Find Task
    // --------------------------------------

    const task = await Task.findById(taskId);

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

    console.error(
      "Get task error:",
      error
    );

    res.status(500).json({
      success: false,
      message: "Failed to fetch task",
      error: error.message,
    });
  }
});


// ==========================================
// UPDATE TASK
// PUT /api/tasks/:taskId
// ==========================================

router.put("/tasks/:taskId", async (req, res) => {
  try {
    const { taskId } = req.params;

    const {
      title,
      description,
      priority,
      status,
      deadline,
    } = req.body;


    // --------------------------------------
    // Validate Task ID
    // --------------------------------------

    if (!mongoose.Types.ObjectId.isValid(taskId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid task ID",
      });
    }


    // --------------------------------------
    // Validate Title
    // --------------------------------------

    if (!title || !title.trim()) {
      return res.status(400).json({
        success: false,
        message: "Task title is required",
      });
    }


    // --------------------------------------
    // Update Task
    // --------------------------------------

    const task = await Task.findByIdAndUpdate(
      taskId,
      {
        title: title.trim(),
        description: description || "",
        priority: priority || "medium",
        status: status || "todo",
        deadline: deadline || null,
      },
      {
        new: true,
        runValidators: true,
      }
    );


    if (!task) {
      return res.status(404).json({
        success: false,
        message: "Task not found",
      });
    }


    res.status(200).json({
      success: true,
      message: "Task updated successfully",
      task,
    });

  } catch (error) {

    console.error(
      "Update task error:",
      error
    );

    res.status(500).json({
      success: false,
      message: "Failed to update task",
      error: error.message,
    });
  }
});


// ==========================================
// DELETE TASK
// DELETE /api/tasks/:taskId
// ==========================================

router.delete("/tasks/:taskId", async (req, res) => {
  try {
    const { taskId } = req.params;


    // --------------------------------------
    // Validate Task ID
    // --------------------------------------

    if (!mongoose.Types.ObjectId.isValid(taskId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid task ID",
      });
    }


    // --------------------------------------
    // Delete Task
    // --------------------------------------

    const task = await Task.findByIdAndDelete(
      taskId
    );


    if (!task) {
      return res.status(404).json({
        success: false,
        message: "Task not found",
      });
    }


    res.status(200).json({
      success: true,
      message: "Task deleted successfully",
      task,
    });

  } catch (error) {

    console.error(
      "Delete task error:",
      error
    );

    res.status(500).json({
      success: false,
      message: "Failed to delete task",
      error: error.message,
    });
  }
});


export default router;
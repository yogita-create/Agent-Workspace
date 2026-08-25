import express from "express";
import mongoose from "mongoose";
import Task from "../models/Task.js";
import Project from "../models/project.js";

const router = express.Router();

/* =========================================================
   CREATE TASK HELPER
   ========================================================= */

const createTask = async (req, res) => {
  try {
    const {
      title,
      description,
      priority,
      status,
      deadline,
      projectId,
    } = req.body;

    /* --------------------------------------
       Validate Project ID
    -------------------------------------- */

    if (!projectId) {
      return res.status(400).json({
        success: false,
        message: "Project is required",
      });
    }

    if (!mongoose.Types.ObjectId.isValid(projectId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid project ID",
      });
    }

    /* --------------------------------------
       Validate Task Title
    -------------------------------------- */

    if (!title || !title.trim()) {
      return res.status(400).json({
        success: false,
        message: "Task title is required",
      });
    }

    /* --------------------------------------
       Check Project Exists
    -------------------------------------- */

    const project = await Project.findById(projectId);

    if (!project) {
      return res.status(404).json({
        success: false,
        message: "Project not found",
      });
    }

    /* --------------------------------------
       Create Task
    -------------------------------------- */

    const task = await Task.create({
      projectId,
      title: title.trim(),
      description: description?.trim() || "",
      priority: priority || "medium",
      status: status || "todo",
      deadline: deadline || null,
      createdByAgent: false,
    });

    /* --------------------------------------
       Populate Project
       So frontend immediately gets project name
    -------------------------------------- */

    await task.populate("projectId", "name");

    /* --------------------------------------
       Response
    -------------------------------------- */

    return res.status(201).json({
      success: true,
      message: "Task created successfully",
      task,
    });
  } catch (error) {
    console.error("Create task error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to create task",
      error: error.message,
    });
  }
};


/* =========================================================
   CREATE TASK
   POST /api/tasks

   Used by My Tasks frontend
   ========================================================= */

router.post("/tasks", createTask);


/* =========================================================
   CREATE TASK FOR PROJECT
   POST /api/projects/:projectId/tasks

   Existing API kept for compatibility
   ========================================================= */

router.post(
  "/projects/:projectId/tasks",
  async (req, res) => {
    try {
      const { projectId } = req.params;

      /* --------------------------------------
         Validate Project ID
      -------------------------------------- */

      if (!mongoose.Types.ObjectId.isValid(projectId)) {
        return res.status(400).json({
          success: false,
          message: "Invalid project ID",
        });
      }

      /* --------------------------------------
         Put route parameter into body
         and use the same creation logic
      -------------------------------------- */

      req.body.projectId = projectId;

      return createTask(req, res);
    } catch (error) {
      console.error(
        "Create project task error:",
        error
      );

      return res.status(500).json({
        success: false,
        message: "Failed to create task",
        error: error.message,
      });
    }
  }
);


/* =========================================================
   GET ALL TASKS
   GET /api/tasks
   ========================================================= */

router.get("/tasks", async (req, res) => {
  try {
    const tasks = await Task.find()
      .populate("projectId", "name")
      .sort({
        createdAt: -1,
      });

    return res.status(200).json({
      success: true,
      tasks,
    });
  } catch (error) {
    console.error(
      "Get all tasks error:",
      error
    );

    return res.status(500).json({
      success: false,
      message: "Failed to fetch tasks",
      error: error.message,
    });
  }
});


/* =========================================================
   GET ALL TASKS FOR A PROJECT
   GET /api/projects/:projectId/tasks
   ========================================================= */

router.get(
  "/projects/:projectId/tasks",
  async (req, res) => {
    try {
      const { projectId } = req.params;

      /* --------------------------------------
         Validate Project ID
      -------------------------------------- */

      if (!mongoose.Types.ObjectId.isValid(projectId)) {
        return res.status(400).json({
          success: false,
          message: "Invalid project ID",
        });
      }

      /* --------------------------------------
         Check Project Exists
      -------------------------------------- */

      const project = await Project.findById(projectId);

      if (!project) {
        return res.status(404).json({
          success: false,
          message: "Project not found",
        });
      }

      /* --------------------------------------
         Get Project Tasks
      -------------------------------------- */

      const tasks = await Task.find({
        projectId,
      })
        .populate("projectId", "name")
        .sort({
          createdAt: -1,
        });

      /* --------------------------------------
         Response
      -------------------------------------- */

      return res.status(200).json({
        success: true,
        tasks,
      });
    } catch (error) {
      console.error(
        "Get project tasks error:",
        error
      );

      return res.status(500).json({
        success: false,
        message: "Failed to fetch project tasks",
        error: error.message,
      });
    }
  }
);


/* =========================================================
   GET SINGLE TASK
   GET /api/tasks/:taskId
   ========================================================= */

router.get(
  "/tasks/:taskId",
  async (req, res) => {
    try {
      const { taskId } = req.params;

      /* --------------------------------------
         Validate Task ID
      -------------------------------------- */

      if (!mongoose.Types.ObjectId.isValid(taskId)) {
        return res.status(400).json({
          success: false,
          message: "Invalid task ID",
        });
      }

      /* --------------------------------------
         Find Task
      -------------------------------------- */

      const task = await Task.findById(taskId)
        .populate("projectId", "name");

      if (!task) {
        return res.status(404).json({
          success: false,
          message: "Task not found",
        });
      }

      return res.status(200).json({
        success: true,
        task,
      });
    } catch (error) {
      console.error(
        "Get task error:",
        error
      );

      return res.status(500).json({
        success: false,
        message: "Failed to fetch task",
        error: error.message,
      });
    }
  }
);


/* =========================================================
   UPDATE TASK
   PUT /api/tasks/:taskId
   ========================================================= */

router.put(
  "/tasks/:taskId",
  async (req, res) => {
    try {
      const { taskId } = req.params;

      const {
        title,
        description,
        priority,
        status,
        deadline,
        projectId,
      } = req.body;

      /* --------------------------------------
         Validate Task ID
      -------------------------------------- */

      if (!mongoose.Types.ObjectId.isValid(taskId)) {
        return res.status(400).json({
          success: false,
          message: "Invalid task ID",
        });
      }

      /* --------------------------------------
         Validate Title
      -------------------------------------- */

      if (!title || !title.trim()) {
        return res.status(400).json({
          success: false,
          message: "Task title is required",
        });
      }

      /* --------------------------------------
         Validate Project ID if provided
      -------------------------------------- */

      if (
        projectId &&
        !mongoose.Types.ObjectId.isValid(projectId)
      ) {
        return res.status(400).json({
          success: false,
          message: "Invalid project ID",
        });
      }

      /* --------------------------------------
         Check Project if provided
      -------------------------------------- */

      if (projectId) {
        const project = await Project.findById(
          projectId
        );

        if (!project) {
          return res.status(404).json({
            success: false,
            message: "Project not found",
          });
        }
      }

      /* --------------------------------------
         Update Task
      -------------------------------------- */

      const updateData = {
        title: title.trim(),
        description: description?.trim() || "",
        priority: priority || "medium",
        status: status || "todo",
        deadline: deadline || null,
      };

      if (projectId) {
        updateData.projectId = projectId;
      }

      const task =
        await Task.findByIdAndUpdate(
          taskId,
          updateData,
          {
            new: true,
            runValidators: true,
          }
        ).populate("projectId", "name");

      /* --------------------------------------
         Check Task Exists
      -------------------------------------- */

      if (!task) {
        return res.status(404).json({
          success: false,
          message: "Task not found",
        });
      }

      /* --------------------------------------
         Response
      -------------------------------------- */

      return res.status(200).json({
        success: true,
        message: "Task updated successfully",
        task,
      });
    } catch (error) {
      console.error(
        "Update task error:",
        error
      );

      return res.status(500).json({
        success: false,
        message: "Failed to update task",
        error: error.message,
      });
    }
  }
);


/* =========================================================
   DELETE TASK
   DELETE /api/tasks/:taskId
   ========================================================= */

router.delete(
  "/tasks/:taskId",
  async (req, res) => {
    try {
      const { taskId } = req.params;

      /* --------------------------------------
         Validate Task ID
      -------------------------------------- */

      if (!mongoose.Types.ObjectId.isValid(taskId)) {
        return res.status(400).json({
          success: false,
          message: "Invalid task ID",
        });
      }

      /* --------------------------------------
         Delete Task
      -------------------------------------- */

      const task =
        await Task.findByIdAndDelete(taskId);

      if (!task) {
        return res.status(404).json({
          success: false,
          message: "Task not found",
        });
      }

      return res.status(200).json({
        success: true,
        message: "Task deleted successfully",
        task,
      });
    } catch (error) {
      console.error(
        "Delete task error:",
        error
      );

      return res.status(500).json({
        success: false,
        message: "Failed to delete task",
        error: error.message,
      });
    }
  }
);


export default router;
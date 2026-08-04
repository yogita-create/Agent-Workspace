import express from "express";
import Project from "../models/project.js";

const router = express.Router();

// CREATE PROJECT
// POST /api/projects

router.post("/", async (req, res) => {
  try {
    const {
      name,
      description,
      techStack,
      goal,
      members,
    } = req.body;

    if (!name || !name.trim()) {
      return res.status(400).json({
        success: false,
        message: "Project name is required",
      });
    }

    const project = await Project.create({
      name: name.trim(),
      description: description || "",
      techStack: techStack || "",
      goal: goal || "",
      members: members || [],
      status: "Active",
    });

    res.status(201).json({
      success: true,
      message: "Project created successfully",
      project,
    });
  } catch (error) {
    console.error("Create project error:", error);

    res.status(500).json({
      success: false,
      message: "Failed to create project",
      error: error.message,
    });
  }
});


// GET ALL PROJECTS
// GET /api/projects

router.get("/", async (req, res) => {
  try {
    const projects = await Project.find()
      .sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      projects,
    });
  } catch (error) {
    console.error("Get projects error:", error);

    res.status(500).json({
      success: false,
      message: "Failed to fetch projects",
    });
  }
});

// ==========================================
// GET SINGLE PROJECT
// GET /api/projects/:projectId
// ==========================================
// ==========================================
// UPDATE PROJECT
// PUT /api/projects/:projectId
// ==========================================

router.put("/:projectId", async (req, res) => {
  try {
    const { projectId } = req.params;

    const {
      name,
      description,
      techStack,
      goal,
      status,
      members,
    } = req.body;

    // Validate project name
    if (!name || !name.trim()) {
      return res.status(400).json({
        success: false,
        message: "Project name is required",
      });
    }

    const updatedProject =
      await Project.findByIdAndUpdate(
        projectId,
        {
          name: name.trim(),
          description: description || "",
          techStack: techStack || "",
          goal: goal || "",
          status: status || "Active",
          members: Array.isArray(members)
            ? members
            : [],
        },
        {
          new: true,
          runValidators: true,
        }
      );

    if (!updatedProject) {
      return res.status(404).json({
        success: false,
        message: "Project not found",
      });
    }

    res.status(200).json({
      success: true,
      message: "Project updated successfully",
      project: updatedProject,
    });
  } catch (error) {
    console.error(
      "Update project error:",
      error
    );

    res.status(500).json({
      success: false,
      message: "Failed to update project",
      error: error.message,
    });
  }
});

router.get("/:projectId", async (req, res) => {
  try {
    const { projectId } = req.params;

    const project = await Project.findById(projectId);

    if (!project) {
      return res.status(404).json({
        success: false,
        message: "Project not found",
      });
    }

    res.status(200).json({
      success: true,
      project,
    });
  } catch (error) {
    console.error(
      "Get project error:",
      error
    );

    res.status(500).json({
      success: false,
      message: "Failed to fetch project",
      error: error.message,
    });
  }
});
export default router;
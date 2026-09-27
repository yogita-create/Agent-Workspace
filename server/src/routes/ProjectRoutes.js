import express from "express";
import jwt from "jsonwebtoken";
import Project from "../models/project.js";
import Membership from "../models/Membership.js";

const router = express.Router();

// Optional token helper to extract user if present without failing unauthenticated requests
const optionalToken = (req, res, next) => {
  const authHeader = req.headers.authorization || req.headers.Authorization;
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    req.user = null;
    return next();
  }

  const token = authHeader.split(" ")[1];
  try {
    const decoded = jwt.verify(
      token,
      process.env.JWT_ACCESS_SECRET || "agent_workspace_jwt_access_secret_key_2026"
    );
    req.user = { id: decoded.id, email: decoded.email };
  } catch {
    req.user = null;
  }
  next();
};

// CREATE PROJECT
// POST /api/projects

router.post("/", optionalToken, async (req, res) => {
  try {
    const {
      name,
      description,
      techStack,
      goal,
      members,
      workspaceId,
    } = req.body;

    if (!name || !name.trim()) {
      return res.status(400).json({
        success: false,
        message: "Project name is required",
      });
    }

    let assignedWorkspaceId = workspaceId || null;
    if (!assignedWorkspaceId && req.user?.id) {
      const userMembership = await Membership.findOne({ userId: req.user.id });
      if (userMembership) {
        assignedWorkspaceId = userMembership.workspaceId;
      }
    }

    const project = await Project.create({
      name: name.trim(),
      description: description || "",
      techStack: techStack || "",
      goal: goal || "",
      members: members || [],
      workspaceId: assignedWorkspaceId,
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

router.get("/", optionalToken, async (req, res) => {
  try {
    let query = {};

    if (req.user?.id) {
      // 1. Find all workspaces the logged-in user belongs to
      const memberships = await Membership.find({ userId: req.user.id });
      const workspaceIds = memberships.map((m) => m.workspaceId);

      // Return projects in user's member workspaces or unassigned legacy projects
      query = {
        $or: [
          { workspaceId: { $in: workspaceIds } },
          { workspaceId: { $exists: false } },
          { workspaceId: null },
        ],
      };
    }

    const projects = await Project.find(query).sort({ createdAt: -1 });

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
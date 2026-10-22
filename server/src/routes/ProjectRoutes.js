import express from "express";
import Project from "../models/project.js";
import Membership from "../models/Membership.js";
import Organization from "../models/Organization.js";
import User from "../models/User.js";
import { verifyToken } from "../middleware/verifyToken.js";

const router = express.Router();

// Apply verifyToken middleware to all project routes
router.use(verifyToken);

// Helper to ensure user has at least one organization and membership
async function ensureUserMembership(userId) {
  let memberships = await Membership.find({ userId });
  if (!memberships || memberships.length === 0) {
    let org = await Organization.findOne({ ownerId: userId });
    if (!org) {
      const user = await User.findById(userId);
      const orgName = user?.name ? `${user.name}'s Organization` : "My Organization";
      org = await Organization.create({
        name: orgName,
        ownerId: userId,
      });
    }
    const membership = await Membership.create({
      userId,
      organizationId: org._id,
      role: "admin",
    });
    memberships = [membership];
  }
  return memberships;
}

// ==========================================
// CREATE PROJECT
// POST /api/projects
// ==========================================
router.post("/", async (req, res) => {
  try {
    const {
      name,
      description,
      techStack,
      goal,
      members,
      workspaceId,
      organizationId,
    } = req.body;

    if (!name || !name.trim()) {
      return res.status(400).json({
        success: false,
        message: "Project name is required",
      });
    }

    // Look up user's memberships (auto-creating default org if needed)
    const memberships = await ensureUserMembership(req.user.id);

    let targetOrgId;
    if (organizationId) {
      const matchingMembership = memberships.find(
        (m) => m.organizationId.toString() === organizationId.toString()
      );
      if (!matchingMembership) {
        return res.status(403).json({
          success: false,
          message: "You are not a member of the specified organization",
        });
      }
      targetOrgId = organizationId;
    } else {
      // Default to first/only membership
      targetOrgId = memberships[0].organizationId;
    }

    const project = await Project.create({
      name: name.trim(),
      description: description || "",
      techStack: techStack || "",
      goal: goal || "",
      members: Array.isArray(members) ? members : [],
      workspaceId: workspaceId || null,
      organizationId: targetOrgId,
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

// ==========================================
// GET ALL PROJECTS (scoped to user's organizations + legacy fallback)
// GET /api/projects
// ==========================================
router.get("/", async (req, res) => {
  try {
    const memberships = await ensureUserMembership(req.user.id);
    const orgIds = memberships.map((m) => m.organizationId);

    const projects = await Project.find({
      $or: [
        { organizationId: { $in: orgIds } },
        { organizationId: { $exists: false } },
        { organizationId: null },
      ],
    }).sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      projects,
    });
  } catch (error) {
    console.error("Get projects error:", error);

    res.status(500).json({
      success: false,
      message: "Failed to fetch projects",
      error: error.message,
    });
  }
});

// ==========================================
// GET SINGLE PROJECT
// GET /api/projects/:projectId
// ==========================================
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

    // Verify organization membership if organizationId is present
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

    res.status(200).json({
      success: true,
      project,
    });
  } catch (error) {
    console.error("Get project error:", error);

    res.status(500).json({
      success: false,
      message: "Failed to fetch project",
      error: error.message,
    });
  }
});

// ==========================================
// UPDATE PROJECT (admin or manager only)
// PUT /api/projects/:projectId
// PATCH /api/projects/:projectId
// ==========================================
const updateProject = async (req, res) => {
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

    // Validate project name if provided
    if (name !== undefined && (!name || !name.trim())) {
      return res.status(400).json({
        success: false,
        message: "Project name cannot be empty",
      });
    }

    const project = await Project.findById(projectId);
    if (!project) {
      return res.status(404).json({
        success: false,
        message: "Project not found",
      });
    }

    // Verify organization membership & role if organizationId is present
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

      if (membership.role !== "admin" && membership.role !== "manager") {
        return res.status(403).json({
          success: false,
          message: "Access denied. Only organization admins and managers can update projects",
        });
      }
    }

    const updateData = {};
    if (name !== undefined) updateData.name = name.trim();
    if (description !== undefined) updateData.description = description;
    if (techStack !== undefined) updateData.techStack = techStack;
    if (goal !== undefined) updateData.goal = goal;
    if (status !== undefined) updateData.status = status;
    if (members !== undefined) updateData.members = Array.isArray(members) ? members : [];

    const updatedProject = await Project.findByIdAndUpdate(
      projectId,
      updateData,
      {
        new: true,
        runValidators: true,
      }
    );

    res.status(200).json({
      success: true,
      message: "Project updated successfully",
      project: updatedProject,
    });
  } catch (error) {
    console.error("Update project error:", error);

    res.status(500).json({
      success: false,
      message: "Failed to update project",
      error: error.message,
    });
  }
};

router.put("/:projectId", updateProject);
router.patch("/:projectId", updateProject);

// ==========================================
// DELETE PROJECT (admin or manager only)
// DELETE /api/projects/:projectId
// ==========================================
router.delete("/:projectId", async (req, res) => {
  try {
    const { projectId } = req.params;

    const project = await Project.findById(projectId);
    if (!project) {
      return res.status(404).json({
        success: false,
        message: "Project not found",
      });
    }

    // Verify organization membership & role if organizationId is present
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

      if (membership.role !== "admin" && membership.role !== "manager") {
        return res.status(403).json({
          success: false,
          message: "Access denied. Only organization admins and managers can delete projects",
        });
      }
    }

    await Project.findByIdAndDelete(projectId);

    res.status(200).json({
      success: true,
      message: "Project deleted successfully",
    });
  } catch (error) {
    console.error("Delete project error:", error);

    res.status(500).json({
      success: false,
      message: "Failed to delete project",
      error: error.message,
    });
  }
});

export default router;
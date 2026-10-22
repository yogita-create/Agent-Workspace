import express from "express";
import mongoose from "mongoose";
import Epic from "../models/Epic.js";
import Project from "../models/project.js";
import Membership from "../models/Membership.js";
import { verifyToken } from "../middleware/verifyToken.js";

const router = express.Router();

// Apply verifyToken middleware to all epic routes
router.use(verifyToken);

// ==========================================
// CREATE EPIC
// POST /api/epics
// ==========================================
router.post("/", async (req, res) => {
  try {
    const { title, description, projectId, status, color } = req.body;

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

    const epic = await Epic.create({
      title: title.trim(),
      description: description ? description.trim() : "",
      projectId,
      status: status || "todo",
      color: color || "#6366f1",
      createdBy: req.user.id,
    });

    const populatedEpic = await Epic.findById(epic._id)
      .populate("projectId", "name status organizationId")
      .populate("createdBy", "name email");

    res.status(201).json({
      success: true,
      message: "Epic created successfully",
      epic: populatedEpic,
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
      .sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      epics,
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

    res.status(200).json({
      success: true,
      epic,
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
    const { title, description, status, color, projectId } = req.body;

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

    const updatedEpic = await Epic.findByIdAndUpdate(id, updateData, {
      new: true,
      runValidators: true,
    })
      .populate("projectId", "name status organizationId")
      .populate("createdBy", "name email");

    res.status(200).json({
      success: true,
      message: "Epic updated successfully",
      epic: updatedEpic,
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

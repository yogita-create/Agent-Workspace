import express from "express";
import mongoose from "mongoose";
import Organization from "../models/Organization.js";
import Membership from "../models/Membership.js";
import User from "../models/User.js";
import { verifyToken } from "../middleware/verifyToken.js";

const router = express.Router();

// Apply verifyToken middleware to all organization routes
router.use(verifyToken);

// ==========================================
// 1. POST /api/organizations
// Create a new organization, creator automatically becomes "admin"
// ==========================================
router.post("/", async (req, res) => {
  try {
    const { name } = req.body;

    if (!name || !name.trim()) {
      return res.status(400).json({
        success: false,
        message: "Organization name is required",
      });
    }

    // 1. Create Organization
    const organization = await Organization.create({
      name: name.trim(),
      ownerId: req.user.id,
    });

    // 2. Automatically create Membership for creator with role 'admin'
    const membership = await Membership.create({
      userId: req.user.id,
      organizationId: organization._id,
      role: "admin",
    });

    return res.status(201).json({
      success: true,
      message: "Organization created successfully",
      organization,
      membership,
    });
  } catch (error) {
    console.error("Create organization error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to create organization",
      error: error.message,
    });
  }
});

// ==========================================
// 2. GET /api/organizations/me
// Get all organizations the authenticated user belongs to
// ==========================================
router.get("/me", async (req, res) => {
  try {
    const memberships = await Membership.find({ userId: req.user.id })
      .populate({
        path: "organizationId",
        populate: {
          path: "ownerId",
          select: "name email",
        },
      })
      .sort({ createdAt: -1 });

    const organizations = memberships
      .filter((m) => m.organizationId)
      .map((m) => ({
        _id: m.organizationId._id,
        name: m.organizationId.name,
        ownerId: m.organizationId.ownerId,
        role: m.role,
        joinedAt: m.joinedAt,
        createdAt: m.organizationId.createdAt,
      }));

    return res.status(200).json({
      success: true,
      organizations,
    });
  } catch (error) {
    console.error("Get user organizations error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to fetch user organizations",
      error: error.message,
    });
  }
});

// ==========================================
// 3. GET /api/organizations/:id/members
// Get all members of a specific organization
// ==========================================
router.get("/:id/members", async (req, res) => {
  try {
    const organizationId = req.params.id;

    if (!mongoose.Types.ObjectId.isValid(organizationId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid organization ID format",
      });
    }

    // Check if organization exists
    const organization = await Organization.findById(organizationId);
    if (!organization) {
      return res.status(404).json({
        success: false,
        message: "Organization not found",
      });
    }

    // Verify requesting user is a member of this organization
    const requesterMembership = await Membership.findOne({
      organizationId,
      userId: req.user.id,
    });

    if (!requesterMembership) {
      return res.status(403).json({
        success: false,
        message: "Access denied: You are not a member of this organization",
      });
    }

    // Fetch all memberships for this organization
    const memberships = await Membership.find({ organizationId })
      .populate("userId", "name email createdAt")
      .sort({ joinedAt: 1 });

    const members = memberships
      .filter((m) => m.userId)
      .map((m) => ({
        _id: m._id,
        user: m.userId,
        role: m.role,
        joinedAt: m.joinedAt,
      }));

    return res.status(200).json({
      success: true,
      organization: {
        _id: organization._id,
        name: organization.name,
        ownerId: organization.ownerId,
      },
      members,
    });
  } catch (error) {
    console.error("Get organization members error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to fetch organization members",
      error: error.message,
    });
  }
});

// ==========================================
// 4. PATCH /api/organizations/:id/members/:userId
// Update a member's role (Admin-only)
// ==========================================
router.patch("/:id/members/:userId", async (req, res) => {
  try {
    const { id: organizationId, userId: targetUserId } = req.params;
    const { role } = req.body;

    if (
      !mongoose.Types.ObjectId.isValid(organizationId) ||
      !mongoose.Types.ObjectId.isValid(targetUserId)
    ) {
      return res.status(400).json({
        success: false,
        message: "Invalid organization ID or user ID format",
      });
    }

    const allowedRoles = ["admin", "manager", "employee"];
    if (!role || !allowedRoles.includes(role)) {
      return res.status(400).json({
        success: false,
        message: `Invalid role. Allowed roles are: ${allowedRoles.join(", ")}`,
      });
    }

    // Check if organization exists
    const organization = await Organization.findById(organizationId);
    if (!organization) {
      return res.status(404).json({
        success: false,
        message: "Organization not found",
      });
    }

    // Check if requester is an admin of the organization
    const requesterMembership = await Membership.findOne({
      organizationId,
      userId: req.user.id,
    });

    if (!requesterMembership || requesterMembership.role !== "admin") {
      return res.status(403).json({
        success: false,
        message: "Forbidden: Only organization admins can update member roles",
      });
    }

    // Prevent changing the organization owner's role away from admin
    if (
      organization.ownerId.toString() === targetUserId.toString() &&
      role !== "admin"
    ) {
      return res.status(400).json({
        success: false,
        message: "Cannot change the organization owner's role from admin",
      });
    }

    // Find the target membership
    const targetMembership = await Membership.findOne({
      organizationId,
      userId: targetUserId,
    });

    if (!targetMembership) {
      return res.status(404).json({
        success: false,
        message: "Member not found in this organization",
      });
    }

    // Update role
    targetMembership.role = role;
    await targetMembership.save();
    await targetMembership.populate("userId", "name email");

    return res.status(200).json({
      success: true,
      message: "Member role updated successfully",
      membership: targetMembership,
    });
  } catch (error) {
    console.error("Update organization member role error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to update member role",
      error: error.message,
    });
  }
});

// ==========================================
// 5. DELETE /api/organizations/:id/members/:userId
// Remove a member from the organization (Admin-only or member removing self)
// ==========================================
router.delete("/:id/members/:userId", async (req, res) => {
  try {
    const { id: organizationId, userId: targetUserId } = req.params;

    if (
      !mongoose.Types.ObjectId.isValid(organizationId) ||
      !mongoose.Types.ObjectId.isValid(targetUserId)
    ) {
      return res.status(400).json({
        success: false,
        message: "Invalid organization ID or user ID format",
      });
    }

    // Check if organization exists
    const organization = await Organization.findById(organizationId);
    if (!organization) {
      return res.status(404).json({
        success: false,
        message: "Organization not found",
      });
    }

    // Prevent removing the organization owner
    if (organization.ownerId.toString() === targetUserId.toString()) {
      return res.status(400).json({
        success: false,
        message: "Cannot remove the organization owner from the organization",
      });
    }

    // Check if target membership exists
    const targetMembership = await Membership.findOne({
      organizationId,
      userId: targetUserId,
    });

    if (!targetMembership) {
      return res.status(404).json({
        success: false,
        message: "Member not found in this organization",
      });
    }

    // Check permissions: Either user is removing themselves, or requester is admin
    const isSelf = req.user.id.toString() === targetUserId.toString();
    const requesterMembership = await Membership.findOne({
      organizationId,
      userId: req.user.id,
    });

    if (!isSelf && (!requesterMembership || requesterMembership.role !== "admin")) {
      return res.status(403).json({
        success: false,
        message: "Forbidden: Only organization admins can remove other members",
      });
    }

    // Remove the membership
    await Membership.findOneAndDelete({
      organizationId,
      userId: targetUserId,
    });

    return res.status(200).json({
      success: true,
      message: isSelf
        ? "Successfully left the organization"
        : "Member removed from organization successfully",
    });
  } catch (error) {
    console.error("Remove organization member error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to remove member from organization",
      error: error.message,
    });
  }
});

export default router;

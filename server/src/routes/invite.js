import express from "express";
import bcrypt from "bcryptjs";
import Invite from "../models/Invite.js";
import User from "../models/User.js";
import Membership from "../models/Membership.js";
import Organization from "../models/Organization.js";

const router = express.Router();

// ==========================================
// 1. GET /api/invites/:token
// Validate invite token and retrieve invite details
// Public endpoint - no auth required
// ==========================================
router.get("/:token", async (req, res) => {
  try {
    const { token } = req.params;

    if (!token || !token.trim()) {
      return res.status(400).json({
        success: false,
        message: "Invite token is required",
      });
    }

    const invite = await Invite.findOne({ token: token.trim() }).populate(
      "organizationId",
      "name"
    );

    if (!invite) {
      return res.status(404).json({
        success: false,
        message: "Invalid invite link. The invite may not exist.",
      });
    }

    if (invite.status === "accepted") {
      return res.status(400).json({
        success: false,
        message: "This invite has already been accepted.",
      });
    }

    // Check expiration
    if (invite.status === "expired" || new Date() > new Date(invite.expiresAt)) {
      if (invite.status !== "expired") {
        invite.status = "expired";
        await invite.save();
      }
      return res.status(400).json({
        success: false,
        message: "This invite link has expired.",
      });
    }

    return res.status(200).json({
      success: true,
      email: invite.email,
      organizationName: invite.organizationId?.name || "Organization",
      role: invite.role,
    });
  } catch (error) {
    console.error("Validate invite error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to validate invite token",
      error: error.message,
    });
  }
});

// ==========================================
// 2. POST /api/invites/:token/accept
// Accept invite: set user password, create account & membership
// Public endpoint - no auth required
// ==========================================
router.post("/:token/accept", async (req, res) => {
  try {
    const { token } = req.params;
    const { name, password } = req.body;

    if (!token || !token.trim()) {
      return res.status(400).json({
        success: false,
        message: "Invite token is required",
      });
    }

    if (!name || !name.trim() || !password) {
      return res.status(400).json({
        success: false,
        message: "Name and password are required",
      });
    }

    if (password.length < 6) {
      return res.status(400).json({
        success: false,
        message: "Password must be at least 6 characters long",
      });
    }

    const invite = await Invite.findOne({ token: token.trim() });

    if (!invite) {
      return res.status(404).json({
        success: false,
        message: "Invalid invite link. The invite may not exist.",
      });
    }

    if (invite.status === "accepted") {
      return res.status(400).json({
        success: false,
        message: "This invite has already been accepted.",
      });
    }

    if (invite.status === "expired" || new Date() > new Date(invite.expiresAt)) {
      if (invite.status !== "expired") {
        invite.status = "expired";
        await invite.save();
      }
      return res.status(400).json({
        success: false,
        message: "This invite link has expired.",
      });
    }

    const normalizedEmail = invite.email.toLowerCase().trim();

    // Check if user already exists
    let user = await User.findOne({ email: normalizedEmail });

    if (user) {
      // If user exists, create membership if not already existing
      const existingMembership = await Membership.findOne({
        userId: user._id,
        organizationId: invite.organizationId,
      });

      if (!existingMembership) {
        await Membership.create({
          userId: user._id,
          organizationId: invite.organizationId,
          role: invite.role,
        });
      }
    } else {
      // Hash password using same bcrypt logic as auth/register
      const hashedPassword = await bcrypt.hash(password, 10);

      user = await User.create({
        name: name.trim(),
        email: normalizedEmail,
        password: hashedPassword,
      });

      await Membership.create({
        userId: user._id,
        organizationId: invite.organizationId,
        role: invite.role,
      });
    }

    // Mark invite as accepted
    invite.status = "accepted";
    await invite.save();

    return res.status(200).json({
      success: true,
      message: "Invite accepted successfully. You can now log in.",
    });
  } catch (error) {
    console.error("Accept invite error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to accept invite",
      error: error.message,
    });
  }
});

export default router;

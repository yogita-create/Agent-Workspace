import express from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import rateLimit from "express-rate-limit";
import User from "../models/User.js";
import Organization from "../models/Organization.js";
import Membership from "../models/Membership.js";
import { verifyToken } from "../middleware/verifyToken.js";

const router = express.Router();

// Helper to normalize and validate IANA timezones
const normalizeTimezone = (tz) => {
  if (!tz || typeof tz !== "string") return "Asia/Kolkata";
  const cleaned = tz.replace(/\s*\(.*?\)\s*/g, "").trim();
  return cleaned || "Asia/Kolkata";
};

const isValidIanaTimezone = (tz) => {
  try {
    Intl.DateTimeFormat(undefined, { timeZone: tz });
    return true;
  } catch {
    return false;
  }
};

// Helper to assemble full user payload with admin-assigned role and defaulted preferences
const getUserWithRoleAndPreferences = async (userId) => {
  const user = await User.findById(userId);
  if (!user) return null;

  // Find membership to get the admin-assigned organization role
  const membership = await Membership.findOne({ userId: user._id }).sort({ createdAt: -1 });
  const role = membership?.role || "employee";

  // Preferences default fallback for existing users without preferences in DB
  const defaultPreferences = {
    actionApproval: true,
    promptChips: true,
    notifyTaskAssigned: true,
    notifyDeadlines: true,
    notifyAiProposals: true,
  };

  const preferences = {
    ...defaultPreferences,
    ...(user.preferences?.toObject ? user.preferences.toObject() : user.preferences || {}),
  };

  return {
    id: user._id,
    name: user.name,
    email: user.email,
    timezone: normalizeTimezone(user.timezone),
    preferences,
    role,
    dismissedAlerts: user.dismissedAlerts || [],
    createdAt: user.createdAt,
  };
};

// ==========================================
// RATE LIMITER (FOR LOGIN ROUTE ONLY)
// Max 5 attempts per 15 minutes per IP
// ==========================================
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  message: {
    success: false,
    message: "Too many login attempts, please try again after 15 minutes",
  },
  standardHeaders: true,
  legacyHeaders: false,
});

// ==========================================
// COOKIE CONFIGURATION
// 7 days expiration, httpOnly, secure in prod, sameSite strict
// ==========================================
const COOKIE_OPTIONS = {
  httpOnly: true,
  secure: process.env.NODE_ENV === "production",
  sameSite: "strict",
  maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days in milliseconds
};

// ==========================================
// TOKEN GENERATION HELPERS
// ==========================================
const generateAccessToken = (user) => {
  return jwt.sign(
    { id: user._id, email: user.email },
    process.env.JWT_ACCESS_SECRET || "agent_workspace_jwt_access_secret_key_2026",
    { expiresIn: "15m" }
  );
};

const generateRefreshToken = (user) => {
  return jwt.sign(
    { id: user._id, email: user.email },
    process.env.JWT_REFRESH_SECRET || "agent_workspace_jwt_refresh_secret_key_2026",
    { expiresIn: "7d" }
  );
};

// ==========================================
// POST /api/auth/register
// ==========================================
router.post("/register", async (req, res) => {
  try {
    const { name, email, password } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({
        success: false,
        message: "Name, email, and password are required",
      });
    }

    const normalizedEmail = email.toLowerCase().trim();

    const existingUser = await User.findOne({ email: normalizedEmail });
    if (existingUser) {
      return res.status(400).json({
        success: false,
        message: "Email is already registered",
      });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const user = new User({
      name: name.trim(),
      email: normalizedEmail,
      password: hashedPassword,
    });

    await user.save();

    // Auto-create default organization & admin membership for the newly registered user
    try {
      const org = await Organization.create({
        name: `${user.name}'s Organization`,
        ownerId: user._id,
      });

      await Membership.create({
        userId: user._id,
        organizationId: org._id,
        role: "admin",
      });
    } catch (orgErr) {
      console.error("Auto-create organization on register error:", orgErr);
    }

    const accessToken = generateAccessToken(user);
    const refreshToken = generateRefreshToken(user);

    res.cookie("refreshToken", refreshToken, COOKIE_OPTIONS);

    const userData = await getUserWithRoleAndPreferences(user._id);

    return res.status(201).json({
      success: true,
      accessToken,
      user: userData,
    });
  } catch (error) {
    console.error("Registration error:", error);
    return res.status(500).json({
      success: false,
      message: "An error occurred during registration",
    });
  }
});

// ==========================================
// POST /api/auth/login
// Rate limited to max 5 attempts per 15 min per IP
// Generic "Invalid credentials" error
// ==========================================
router.post("/login", loginLimiter, async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(401).json({
        success: false,
        message: "Invalid credentials",
      });
    }

    const normalizedEmail = email.toLowerCase().trim();
    const user = await User.findOne({ email: normalizedEmail });

    // Generic error to avoid leaking email existence
    if (!user) {
      return res.status(401).json({
        success: false,
        message: "Invalid credentials",
      });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(401).json({
        success: false,
        message: "Invalid credentials",
      });
    }

    const accessToken = generateAccessToken(user);
    const refreshToken = generateRefreshToken(user);

    res.cookie("refreshToken", refreshToken, COOKIE_OPTIONS);

    const userData = await getUserWithRoleAndPreferences(user._id);

    return res.json({
      success: true,
      accessToken,
      user: userData,
    });
  } catch (error) {
    console.error("Login error:", error);
    return res.status(500).json({
      success: false,
      message: "An error occurred during login",
    });
  }
});

// ==========================================
// POST /api/auth/refresh
// Reads refresh token from httpOnly cookie
// ==========================================
router.post("/refresh", async (req, res) => {
  try {
    const refreshToken = req.cookies?.refreshToken;

    if (!refreshToken) {
      return res.status(401).json({
        success: false,
        message: "Refresh token not found",
      });
    }

    jwt.verify(
      refreshToken,
      process.env.JWT_REFRESH_SECRET || "agent_workspace_jwt_refresh_secret_key_2026",
      async (err, decoded) => {
        if (err) {
          return res.status(401).json({
            success: false,
            message: "Invalid or expired refresh token",
          });
        }

        const user = await User.findById(decoded.id).select("-password");
        if (!user) {
          return res.status(401).json({
            success: false,
            message: "User no longer exists",
          });
        }

        const newAccessToken = generateAccessToken(user);
        const userData = await getUserWithRoleAndPreferences(user._id);

        return res.json({
          success: true,
          accessToken: newAccessToken,
          user: userData,
        });
      }
    );
  } catch (error) {
    console.error("Refresh token error:", error);
    return res.status(500).json({
      success: false,
      message: "An error occurred during token refresh",
    });
  }
});

// ==========================================
// POST /api/auth/logout
// Clears httpOnly refresh token cookie
// ==========================================
router.post("/logout", (req, res) => {
  res.clearCookie("refreshToken", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict",
  });
  return res.json({
    success: true,
    message: "Logged out successfully",
  });
});

// ==========================================
// GET /api/auth/me
// Get current user profile, preferences, and admin-assigned role
// ==========================================
router.get("/me", verifyToken, async (req, res) => {
  try {
    const userData = await getUserWithRoleAndPreferences(req.user.id);
    if (!userData) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }
    return res.json({
      success: true,
      user: userData,
    });
  } catch (error) {
    console.error("Get current user error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to retrieve user profile",
    });
  }
});

// ==========================================
// PUT & PATCH /api/auth/profile (and /api/auth/me)
// Update current user's own profile and preferences only
// Whitelist ONLY: display name, timezone, preferences
// Never write role, email, organization, password or anything else
// ==========================================
const handleUpdateProfile = async (req, res) => {
  try {
    const { name, displayName, timezone, preferences } = req.body;
    const user = await User.findById(req.user.id);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    const newName = name !== undefined ? name : displayName;

    if (newName !== undefined) {
      if (typeof newName !== "string" || !newName.trim()) {
        return res.status(400).json({
          success: false,
          message: "Display name is required",
        });
      }
      if (newName.trim().length > 50) {
        return res.status(400).json({
          success: false,
          message: "Display name cannot exceed 50 characters",
        });
      }
      user.name = newName.trim();
    }

    if (timezone !== undefined) {
      if (typeof timezone !== "string" || !timezone.trim()) {
        return res.status(400).json({
          success: false,
          message: "Timezone must be a valid string",
        });
      }
      const cleanTz = normalizeTimezone(timezone);
      if (!isValidIanaTimezone(cleanTz)) {
        return res.status(400).json({
          success: false,
          message: `"${timezone}" is not a valid IANA timezone`,
        });
      }
      user.timezone = cleanTz;
    }

    if (preferences !== undefined) {
      if (
        typeof preferences !== "object" ||
        preferences === null ||
        Array.isArray(preferences)
      ) {
        return res.status(400).json({
          success: false,
          message: "Preferences must be an object",
        });
      }

      if (!user.preferences) {
        user.preferences = {
          actionApproval: true,
          promptChips: true,
          notifyTaskAssigned: true,
          notifyDeadlines: true,
          notifyAiProposals: true,
        };
      }

      if (typeof preferences.actionApproval === "boolean") {
        user.preferences.actionApproval = preferences.actionApproval;
      }
      if (typeof preferences.promptChips === "boolean") {
        user.preferences.promptChips = preferences.promptChips;
      }
      if (typeof preferences.notifyTaskAssigned === "boolean") {
        user.preferences.notifyTaskAssigned = preferences.notifyTaskAssigned;
      }
      if (typeof preferences.notifyDeadlines === "boolean") {
        user.preferences.notifyDeadlines = preferences.notifyDeadlines;
      }
      if (typeof preferences.notifyAiProposals === "boolean") {
        user.preferences.notifyAiProposals = preferences.notifyAiProposals;
      }
    }

    await user.save();

    const updatedUser = await getUserWithRoleAndPreferences(user._id);

    return res.json({
      success: true,
      message: "Profile updated successfully",
      user: updatedUser,
    });
  } catch (error) {
    console.error("Update profile error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to update profile",
      error: error.message,
    });
  }
};

router.put("/profile", verifyToken, handleUpdateProfile);
router.patch("/profile", verifyToken, handleUpdateProfile);
router.put("/me", verifyToken, handleUpdateProfile);
router.patch("/me", verifyToken, handleUpdateProfile);

export default router;

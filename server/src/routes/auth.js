import express from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import rateLimit from "express-rate-limit";
import User from "../models/User.js";

const router = express.Router();

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

    const accessToken = generateAccessToken(user);
    const refreshToken = generateRefreshToken(user);

    res.cookie("refreshToken", refreshToken, COOKIE_OPTIONS);

    return res.status(201).json({
      success: true,
      accessToken,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        createdAt: user.createdAt,
      },
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

    return res.json({
      success: true,
      accessToken,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        createdAt: user.createdAt,
      },
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

        return res.json({
          success: true,
          accessToken: newAccessToken,
          user: {
            id: user._id,
            name: user.name,
            email: user.email,
            createdAt: user.createdAt,
          },
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

export default router;

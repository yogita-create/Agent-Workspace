import express from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import User from "../models/User.js";
import authMiddleware from "../middleware/authMiddleware.js";

const router = express.Router();

/* ==========================================
   REGISTER USER
   POST /api/auth/register
========================================== */

router.post("/register", async (req, res) => {
  try {
    const { name, email, password } = req.body;

    // --------------------------------------
    // Validate required fields
    // --------------------------------------

    if (!name || !email || !password) {
      return res.status(400).json({
        success: false,
        message: "Name, email and password are required",
      });
    }

    // --------------------------------------
    // Validate name
    // --------------------------------------

    if (name.trim().length < 2) {
      return res.status(400).json({
        success: false,
        message: "Name must contain at least 2 characters",
      });
    }

    // --------------------------------------
    // Validate password
    // --------------------------------------

    if (password.length < 6) {
      return res.status(400).json({
        success: false,
        message: "Password must contain at least 6 characters",
      });
    }

    // --------------------------------------
    // Normalize email
    // --------------------------------------

    const normalizedEmail = email.trim().toLowerCase();

    // --------------------------------------
    // Check existing user
    // --------------------------------------

    const existingUser = await User.findOne({
      email: normalizedEmail,
    });

    if (existingUser) {
      return res.status(409).json({
        success: false,
        message: "An account with this email already exists",
      });
    }

    // --------------------------------------
    // Hash password
    // --------------------------------------

    const hashedPassword = await bcrypt.hash(password, 12);

    // --------------------------------------
    // Create user
    // --------------------------------------

    const user = await User.create({
      name: name.trim(),
      email: normalizedEmail,
      password: hashedPassword,
    });

    // --------------------------------------
    // Response
    // Never send password back
    // --------------------------------------

    return res.status(201).json({
      success: true,
      message: "Account created successfully",
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
      },
    });
  } catch (error) {
    console.error("Register error:", error);

    // Handle duplicate email race condition
    if (error.code === 11000) {
      return res.status(409).json({
        success: false,
        message: "An account with this email already exists",
      });
    }

    return res.status(500).json({
      success: false,
      message: "Failed to create account",
    });
  }
});


/* ==========================================
   LOGIN USER
   POST /api/auth/login
========================================== */

router.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body;

    // --------------------------------------
    // Validate fields
    // --------------------------------------

    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: "Email and password are required",
      });
    }

    // --------------------------------------
    // Normalize email
    // --------------------------------------

    const normalizedEmail = email.trim().toLowerCase();

    // --------------------------------------
    // Find user
    // --------------------------------------

    const user = await User.findOne({
      email: normalizedEmail,
    });

    // --------------------------------------
    // Generic error message
    // Prevent revealing whether
    // an email exists
    // --------------------------------------

    if (!user) {
      return res.status(401).json({
        success: false,
        message: "Invalid email or password",
      });
    }

    // --------------------------------------
    // Compare password
    // --------------------------------------

    const passwordMatch = await bcrypt.compare(
      password,
      user.password
    );

    if (!passwordMatch) {
      return res.status(401).json({
        success: false,
        message: "Invalid email or password",
      });
    }

    // --------------------------------------
    // Check JWT secret
    // --------------------------------------

    if (!process.env.JWT_SECRET) {
      console.error("JWT_SECRET is missing");

      return res.status(500).json({
        success: false,
        message: "Authentication configuration error",
      });
    }

    // --------------------------------------
    // Create JWT
    // --------------------------------------

    const token = jwt.sign(
      {
        userId: user._id.toString(),
      },
      process.env.JWT_SECRET,
      {
        expiresIn: "7d",
      }
    );

    // --------------------------------------
    // Response
    // --------------------------------------

    return res.status(200).json({
      success: true,
      message: "Login successful",
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
      },
    });
  } catch (error) {
    console.error("Login error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to login",
    });
  }
});
/* ==========================================
   GET CURRENT AUTHENTICATED USER
   GET /api/auth/me
========================================== */

router.get("/me", authMiddleware, async (req, res) => {
  try {
    const user = await User.findById(req.user.userId).select(
      "-password"
    );

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    return res.status(200).json({
      success: true,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
      },
    });
  } catch (error) {
    console.error("Get current user error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to fetch user",
    });
  }
});

export default router;
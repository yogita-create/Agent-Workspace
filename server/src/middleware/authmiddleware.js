import jwt from "jsonwebtoken";

const authMiddleware = (req, res, next) => {
  try {
    // --------------------------------------
    // Get Authorization header
    // --------------------------------------

    const authHeader = req.headers.authorization;

    if (!authHeader) {
      return res.status(401).json({
        success: false,
        message: "Authentication required",
      });
    }

    // Expected format:
    // Authorization: Bearer <token>

    const parts = authHeader.split(" ");

    if (
      parts.length !== 2 ||
      parts[0] !== "Bearer" ||
      !parts[1]
    ) {
      return res.status(401).json({
        success: false,
        message: "Invalid authentication format",
      });
    }

    const token = parts[1];

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
    // Verify token
    // --------------------------------------

    const decoded = jwt.verify(
      token,
      process.env.JWT_SECRET
    );

    // --------------------------------------
    // Attach authenticated user
    // --------------------------------------

    req.user = {
      userId: decoded.userId,
    };

    // --------------------------------------
    // Continue request
    // --------------------------------------

    next();
  } catch (error) {
    console.error("Authentication error:", error.message);

    return res.status(401).json({
      success: false,
      message: "Invalid or expired authentication token",
    });
  }
};

export default authMiddleware;
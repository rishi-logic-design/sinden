const jwt = require("jsonwebtoken");
const Database = require("../db/connect");
const { User } = Database;

const JWT_SECRET =
  process.env.JWT_SECRET || "your-secret-key-change-in-production";

const authMiddleware = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res.status(401).json({
        error: "Access token required",
      });
    }

    const token = authHeader.substring(7); // Remove 'Bearer ' prefix

    try {
      const decoded = jwt.verify(token, JWT_SECRET);

      // Verify user still exists
      const user = await User.findByPk(decoded.id);
      if (!user) {
        return res.status(401).json({
          error: "User not found",
        });
      }

      req.user = {
        id: user.id,
        email: user.email,
        role: user.role,
        fullName: user.fullName,
      };

      next();
    } catch (jwtError) {
      return res.status(401).json({
        error: "Invalid or expired token",
      });
    }
  } catch (error) {
    console.error("Auth middleware error:", error);
    res.status(500).json({
      error: "Internal server error",
    });
  }
};

module.exports = authMiddleware;

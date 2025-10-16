const express = require("express");
const router = express.Router();
const authController = require("../controllers/authController");
const { authenticateToken } = require("../middleware/auth");

// Public routes
router.post("/login", authController.login);
router.post("/register", authController.register);

// Protected routes (require authentication)
router.post("/logout", authenticateToken, authController.logout);
router.get("/me", authenticateToken, authController.getCurrentUser);
router.post("/change-password", authenticateToken, authController.changePassword);

// Add refresh token endpoint
router.post("/refresh", authController.refresh);

module.exports = router;
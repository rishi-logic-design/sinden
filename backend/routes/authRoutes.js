const express = require("express");
const router = express.Router();
const authController = require("../controllers/authController");
const authMiddleware = require("../middleware/auth");

// Public routes
router.post("/register", authController.register);
router.post("/login", authController.login);

// Protected routes
router.get("/me", authMiddleware, authController.me);
router.post("/refresh", authMiddleware, authController.refresh);
router.get("/refresh", authMiddleware, authController.refresh);
router.post("/logout", authMiddleware, authController.logout);

module.exports = router;

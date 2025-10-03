
// routes/authRoutes.js
const express = require("express");
const router = express.Router();
const authCtrl = require("../controllers/authController");
const authMiddleware = require("../middleware/auth");

router.post("/register", authCtrl.register);

router.post("/login", authCtrl.login);

router.post("/logout", authCtrl.logout);

router.get("/me", authMiddleware, authCtrl.me);

module.exports = router;
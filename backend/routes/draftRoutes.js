// routes/draftRoutes.js
const express = require("express");
const router = express.Router();
const draftController = require("../controllers/draftController");

// Auto-save draft (called every 12 seconds)
router.post("/auto-save", draftController.autoSave);

// Manual save draft (when user clicks "Save as Draft")
router.post("/manual-save", draftController.manualSave);

// Get latest auto-saved draft for recovery
router.get("/latest-auto", draftController.getLatestAutoSave);

// Get all drafts (with optional status filter)
router.get("/", draftController.list);

// Get draft count by status
router.get("/count", draftController.getCount);

// Search drafts
router.get("/search", draftController.search);

// Get single draft
router.get("/:id", draftController.getById);

// Update draft
router.put("/:id", draftController.update);

// Delete draft
router.delete("/:id", draftController.destroy);

// Delete all auto-saved drafts
router.delete("/auto-saved/all", draftController.deleteAutoSaved);

// Convert draft to order
router.post("/:id/convert", draftController.convertToOrder);

// Cleanup old auto-saved drafts
router.post("/cleanup/auto", draftController.cleanupOldAutoSaves);

// Health check
router.get("/health", draftController.healthCheck);

module.exports = router;
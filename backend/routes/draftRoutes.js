const express = require("express");
const router = express.Router();
const draftController = require("../controllers/draftController");

router.post("/auto-save", draftController.autoSave);

router.post("/manual-save", draftController.manualSave);

router.get("/latest-auto", draftController.getLatestAutoSave);

router.get("/", draftController.list);

router.get("/count", draftController.getCount);

router.get("/search", draftController.search);

router.get("/:id", draftController.getById);

router.put("/:id", draftController.update);

router.delete("/:id", draftController.destroy);

router.delete("/auto-saved/all", draftController.deleteAutoSaved);

router.post("/:id/convert", draftController.convertToOrder);

router.post("/cleanup/auto", draftController.cleanupOldAutoSaves);

router.get("/health", draftController.healthCheck);

module.exports = router;
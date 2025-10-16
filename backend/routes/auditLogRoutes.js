const express = require("express");
const router = express.Router();
const auditLogController = require("../controllers/auditLogController");

router.get("/", auditLogController.list);
router.get("/:id", auditLogController.getById);

module.exports = router;

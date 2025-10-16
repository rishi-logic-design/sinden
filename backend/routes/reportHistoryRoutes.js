const express = require("express");
const router = express.Router();
const reportHistoryController = require("../controllers/reportHistoryController");

router.post("/", reportHistoryController.create);
router.get("/", reportHistoryController.list);
router.get("/:id", reportHistoryController.getById);

module.exports = router;

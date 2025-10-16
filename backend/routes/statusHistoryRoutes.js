const express = require("express");
const router = express.Router();
const statusHistoryController = require("../controllers/statusHistoryController");

router.get("/order/:orderId", statusHistoryController.listByOrder);

module.exports = router;

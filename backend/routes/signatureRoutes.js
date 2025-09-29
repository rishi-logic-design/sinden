const express = require("express");
const router = express.Router();
const signatureController = require("../controllers/signatureController");

router.get("/order/:orderId", signatureController.getByOrder);

module.exports = router;

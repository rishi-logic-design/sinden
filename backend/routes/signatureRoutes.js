const express = require("express");
const router = express.Router();
const signatureController = require("../controllers/signatureController");

// routes
router.get('/order/:orderId', signatureController.getByOrder);
router.get('/:id/download', signatureController.download);

module.exports = router;
const express = require("express");
const router = express.Router();
const attachmentController = require("../controllers/attachmentController");
const { upload } = require("../config/multer");

router.get("/order/:orderId", attachmentController.listByOrder);

router.post(
  "/order/:orderId/upload",
  upload.single("file"),
  attachmentController.upload
);

router.put("/:id", upload.single("file"), attachmentController.update);

router.get("/:id/download", attachmentController.download);

router.delete("/:id", attachmentController.destroy);

module.exports = router;

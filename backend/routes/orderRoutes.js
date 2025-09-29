const express = require("express");
const router = express.Router();
const orderController = require("../controllers/orderController");
const { upload } = require("../config/multer");

router.post("/", orderController.create);
router.get("/", orderController.list);
router.get("/:id", orderController.getById);
router.put("/:id", orderController.update);
router.delete("/:id", orderController.destroy);

router.patch("/:id/status", orderController.changeStatus);

router.post(
  "/:id/attachments",
  upload.single("file"),
  orderController.addAttachment
);

router.delete(
  "/:id/attachments/:attachmentId",
  orderController.deleteAttachment
);

router.post("/:id/sign", upload.single("file"), orderController.sign);

module.exports = router;

const express = require("express");
const router = express.Router();
const userController = require("../controllers/userController");

router.post("/", userController.create);
router.get("/", userController.list);
router.get("/:id", userController.getById);
router.put("/:id", userController.update);
router.delete("/:id", userController.destroy);

module.exports = router;
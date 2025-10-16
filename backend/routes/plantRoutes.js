const express = require("express");
const router = express.Router();
const plantController = require("../controllers/plantController");

router.post("/", plantController.create);
router.get("/", plantController.list);
router.get("/:id", plantController.getById);
router.put("/:id", plantController.update);
router.delete("/:id", plantController.destroy);

module.exports = router;

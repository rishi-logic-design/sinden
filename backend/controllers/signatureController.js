const { tryCatch } = require("bullmq");
const Database = require("../db/connect");
const { Signature } = Database;

exports.getByOrder = async (req, res) => {
  try {
    const sig = await Signature.findOne({ where: { order_id: req.params.orderId } });
    if (!sig) return res.status(404).json({ error: "Not found" });
    res.json(sig);
  } catch (e) {
    console.error("Signature.getByOrder error:", e);
    res.status(500).json({ error: "Failed to fetch signature" });
  }
};




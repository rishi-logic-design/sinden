const Database = require("../db/connect");
const { StatusHistory } = Database;

exports.listByOrder = async (req, res) => {
  try {
    const items = await StatusHistory.findAll({
      where: { order_id: req.params.orderId },
      order: [["createdAt", "DESC"]],
    });
    res.json(items);
  } catch (e) {
    console.error("StatusHistory.listByOrder error:", e);
    res.status(500).json({ error: "Failed to fetch status history" });
  }
};

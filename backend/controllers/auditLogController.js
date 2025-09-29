const Database = require("../db/connect");
const { AuditLog } = Database;

exports.list = async (req, res) => {
  try {
    const { entity_type, entity_id } = req.query;
    const where = {};
    if (entity_type) where.entity_type = entity_type;
    if (entity_id) where.entity_id = entity_id;

    const logs = await AuditLog.findAll({
      where,
      order: [["createdAt", "DESC"]],
      limit: 200,
    });
    res.json(logs);
  } catch (e) {
    console.error("AuditLog.list error:", e);
    res.status(500).json({ error: "Failed to fetch logs" });
  }
};

exports.getById = async (req, res) => {
  try {
    const log = await AuditLog.findByPk(req.params.id);
    if (!log) return res.status(404).json({ error: "Not found" });
    res.json(log);
  } catch (e) {
    console.error("AuditLog.getById error:", e);
    res.status(500).json({ error: "Failed to fetch log" });
  }
};

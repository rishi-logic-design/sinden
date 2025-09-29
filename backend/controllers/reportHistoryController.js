const Database = require("../db/connect");
const { ReportHistory } = Database;

exports.create = async (req, res) => {
  try {
    const { report_type, filters, file_key } = req.body;
    const report = await ReportHistory.create({
      report_type, filters, file_key, generated_by: req.user?.id || null,
    });
    res.status(201).json(report);
  } catch (e) {
    console.error("ReportHistory.create error:", e);
    res.status(500).json({ error: "Failed to create report record" });
  }
};

exports.list = async (_req, res) => {
  try {
    const reports = await ReportHistory.findAll({ order: [["createdAt", "DESC"]], limit: 200 });
    res.json(reports);
  } catch (e) {
    console.error("ReportHistory.list error:", e);
    res.status(500).json({ error: "Failed to fetch report history" });
  }
};

exports.getById = async (req, res) => {
  try {
    const report = await ReportHistory.findByPk(req.params.id);
    if (!report) return res.status(404).json({ error: "Not found" });
    res.json(report);
  } catch (e) {
    console.error("ReportHistory.getById error:", e);
    res.status(500).json({ error: "Failed to fetch report record" });
  }
};

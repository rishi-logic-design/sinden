const Database = require("../db/connect");
const { Signature } = Database;
const fs = require("fs").promises;
const path = require("path");

exports.getByOrder = async (req, res) => {
  try {
    const orderId = Number(req.params.orderId);
    if (!orderId) return res.status(400).json({ error: "Invalid orderId" });

    const sig = await Signature.findOne({ where: { order_id: orderId } });
    if (!sig) return res.status(404).json({ error: "Not found" });

    res.json(sig);
  } catch (e) {
    console.error("Signature.getByOrder error:", e);
    res.status(500).json({ error: "Failed to fetch signature" });
  }
};

// NEW: Download signature (same as attachment download)
exports.download = async (req, res) => {
  try {
    const signature = await Signature.findByPk(req.params.id);
    if (!signature) {
      return res.status(404).json({ error: "Signature not found" });
    }

    const filePath = signature.storage_key;

    // Check if file exists
    try {
      await fs.access(filePath);
    } catch {
      return res.status(404).json({ error: "Signature file not found on server" });
    }

    // Set appropriate headers
    const dispositionType = req.query.inline === '1' ? 'inline' : 'attachment';
    res.setHeader('Content-Disposition', `${dispositionType}; filename="signature.png"`);
    res.setHeader('Content-Type', 'image/png');

    // Send file
    res.sendFile(path.resolve(filePath));
  } catch (e) {
    console.error("Signature.download error:", e);
    res.status(500).json({ error: "Failed to download signature" });
  }
};
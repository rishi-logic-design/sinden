// controllers/attachmentController.js
const Database = require("../db/connect");
const { Attachment, Order, AuditLog, sequelize } = Database;
const fs = require("fs").promises;
const path = require("path");

// List attachments by order
exports.listByOrder = async (req, res) => {
  try {
    const items = await Attachment.findAll({
      where: { order_id: req.params.orderId },
      order: [["createdAt", "DESC"]],
    });
    res.json(items);
  } catch (e) {
    console.error("Attachment.listByOrder error:", e);
    res.status(500).json({ error: "Failed to fetch attachments" });
  }
};

// Upload new attachment
exports.upload = async (req, res) => {
  const t = await sequelize.transaction();
  try {
    if (!req.file) {
      await t.rollback();
      return res.status(400).json({ error: "No file uploaded" });
    }

    const { orderId } = req.params;
    const { kind = "File" } = req.body;

    // Verify order exists
    const order = await Order.findByPk(orderId, { transaction: t });
    if (!order) {
      // Delete uploaded file if order doesn't exist
      await fs.unlink(req.file.path).catch(console.error);
      await t.rollback();
      return res.status(404).json({ error: "Order not found" });
    }

    // Create attachment record
    const attachment = await Attachment.create(
      {
        order_id: orderId,
        storage_key: req.file.path,
        version_id: null, // Can be used for versioning if needed
        original_name: req.file.originalname,
        mime_type: req.file.mimetype,
        size_bytes: req.file.size,
        kind: kind,
        uploaded_by: req.user?.id || null,
      },
      { transaction: t }
    );

    // Create audit log
    await AuditLog.create(
      {
        actor_id: req.user?.id || null,
        action: "ATTACHMENT_UPLOAD",
        entity_type: "Attachment",
        entity_id: attachment.id,
        diff: {
          order_id: orderId,
          filename: req.file.originalname,
          storage_path: req.file.path,
        },
      },
      { transaction: t }
    );

    await t.commit();
    res.status(201).json(attachment);
  } catch (e) {
    await t.rollback();
    // Clean up uploaded file on error
    if (req.file) {
      await fs.unlink(req.file.path).catch(console.error);
    }
    console.error("Attachment.upload error:", e);
    res.status(500).json({ error: "Failed to upload attachment" });
  }
};

// Update attachment (replace file) - COMPULSORY
exports.update = async (req, res) => {
  const t = await sequelize.transaction();
  try {
    const attachment = await Attachment.findByPk(req.params.id, {
      transaction: t,
    });
    if (!attachment) {
      if (req.file) {
        await fs.unlink(req.file.path).catch(console.error);
      }
      await t.rollback();
      return res.status(404).json({ error: "Attachment not found" });
    }

    const oldStorageKey = attachment.storage_key;
    const beforeUpdate = attachment.toJSON();

    if (req.file) {
      // Update with new file
      await attachment.update(
        {
          storage_key: req.file.path,
          original_name: req.file.originalname,
          mime_type: req.file.mimetype,
          size_bytes: req.file.size,
          kind: req.body.kind || attachment.kind,
        },
        { transaction: t }
      );

      // Delete old file
      if (oldStorageKey) {
        await fs.unlink(oldStorageKey).catch(console.error);
      }
    } else {
      // Update metadata only
      const { kind } = req.body;
      if (kind) {
        await attachment.update({ kind }, { transaction: t });
      }
    }

    // Create audit log
    await AuditLog.create(
      {
        actor_id: req.user?.id || null,
        action: "ATTACHMENT_UPDATE",
        entity_type: "Attachment",
        entity_id: attachment.id,
        diff: {
          before: beforeUpdate,
          after: attachment.toJSON(),
        },
      },
      { transaction: t }
    );

    await t.commit();
    res.json(attachment);
  } catch (e) {
    await t.rollback();
    if (req.file) {
      await fs.unlink(req.file.path).catch(console.error);
    }
    console.error("Attachment.update error:", e);
    res.status(500).json({ error: "Failed to update attachment" });
  }
};

// Download attachment
exports.download = async (req, res) => {
  try {
    const attachment = await Attachment.findByPk(req.params.id);
    if (!attachment) {
      return res.status(404).json({ error: "Attachment not found" });
    }

    const filePath = attachment.storage_key;

    // Check if file exists
    try {
      await fs.access(filePath);
    } catch {
      return res.status(404).json({ error: "File not found on server" });
    }

    // Set appropriate headers
    const dispositionType = req.query.inline === '1' ? 'inline' : 'attaachment';
    res.setHeader('Content-Disposition', `${dispositionType}; filename="${attachment.original_name || 'file'}"`);
    res.setHeader('Content-Type', attachment.mime_type || 'application/octet-stream');


    // Send file
    res.sendFile(path.resolve(filePath));
  } catch (e) {
    console.error("Attachment.download error:", e);
    res.status(500).json({ error: "Failed to download attachment" });
  }
};

// Delete attachment - COMPULSORY (deletes both record and file)
exports.destroy = async (req, res) => {
  const t = await sequelize.transaction();
  try {
    const att = await Attachment.findByPk(req.params.id, { transaction: t });
    if (!att) {
      await t.rollback();
      return res.status(404).json({ error: "Attachment not found" });
    }

    const storageKey = att.storage_key;
    const attachmentData = att.toJSON();

    // Delete database record
    await att.destroy({ transaction: t });

    // Create audit log
    await AuditLog.create(
      {
        actor_id: req.user?.id || null,
        action: "ATTACHMENT_DELETE",
        entity_type: "Attachment",
        entity_id: att.id,
        diff: { deleted: attachmentData },
      },
      { transaction: t }
    );

    await t.commit();

    // Delete physical file (after successful DB transaction)
    if (storageKey) {
      try {
        await fs.unlink(storageKey);
        console.log(`File deleted: ${storageKey}`);
      } catch (fileError) {
        console.error(`Failed to delete file ${storageKey}:`, fileError);
        // Don't fail the API call if file deletion fails
      }
    }

    res.json({ message: "Attachment deleted successfully" });
  } catch (e) {
    await t.rollback();
    console.error("Attachment.destroy error:", e);
    res.status(500).json({ error: "Failed to delete attachment" });
  }
};

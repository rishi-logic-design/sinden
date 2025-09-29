// controllers/orderController.js
const Database = require("../db/connect");
const {
  sequelize,
  Order,
  Customer,
  Plant,
  StatusHistory,
  AuditLog,
  Attachment,
  Signature,
} = Database;
const fs = require("fs").promises;

// CREATE
(exports.create = async (req, res) => {
  const t = await sequelize.transaction();
  try {
    const {
      order_number,
      customer_id,
      plant_id,
      estimated_delivery_at,
      total_amount,
      payment_status,
      meta,
    } = req.body;

    // Basic validation
    if (!order_number) {
      await t.rollback();
      return res.status(400).json({ error: "order_number is required" });
    }
    if (!customer_id || !Number.isInteger(Number(customer_id))) {
      await t.rollback();
      return res.status(400).json({ error: "valid customer_id is required" });
    }
    if (!plant_id || !Number.isInteger(Number(plant_id))) {
      await t.rollback();
      return res.status(400).json({ error: "valid plant_id is required" });
    }
    if (!estimated_delivery_at) {
      await t.rollback();
      return res
        .status(400)
        .json({ error: "estimated_delivery_at is required" });
    }

    // Ensure referenced customer and plant exist
    const customer = await Customer.findByPk(customer_id, { transaction: t });
    if (!customer) {
      await t.rollback();
      return res
        .status(400)
        .json({ error: `Customer with id ${customer_id} not found` });
    }
    const plant = await Plant.findByPk(plant_id, { transaction: t });
    if (!plant) {
      await t.rollback();
      return res
        .status(400)
        .json({ error: `Plant with id ${plant_id} not found` });
    }

    // Create order
    const order = await Order.create(
      {
        order_number,
        customer_id,
        plant_id,
        estimated_delivery_at,
        total_amount: total_amount ?? 0,
        payment_status: payment_status ?? "None",
        meta: meta ?? null,
      },
      { transaction: t }
    );

    // Audit log
    await AuditLog.create(
      {
        actor_id: req.user?.id || null,
        action: "ORDER_CREATE",
        entity_type: "Order",
        entity_id: order.id,
        diff: { created: order.toJSON() },
      },
      { transaction: t }
    );

    await t.commit();
    return res.status(201).json(order);
  } catch (err) {
    await t.rollback();
    console.error("Order.create error:", err);
    // Handle unique constraint on order_number
    if (err?.name === "SequelizeUniqueConstraintError") {
      return res.status(409).json({ error: "order_number already exists" });
    }
    return res.status(500).json({ error: "Failed to create order" });
  }
}),
  (exports.list = async (req, res) => {
    try {
      const { status, customer_id, plant_id } = req.query;
      const where = {};
      if (status) where.status = status;
      if (customer_id) where.customer_id = customer_id;
      if (plant_id) where.plant_id = plant_id;

      const orders = await Order.findAll({
        where,
        include: [
          { model: Customer, attributes: ["id", "name"] },
          { model: Plant, attributes: ["id", "name", "code"] },
        ],
        order: [["createdAt", "DESC"]],
      });
      res.json(orders);
    } catch (e) {
      console.error("Order.list error:", e);
      res.status(500).json({ error: "Failed to fetch orders" });
    }
  });

// GET BY ID
exports.getById = async (req, res) => {
  try {
    const order = await Order.findByPk(req.params.id, {
      include: [
        { model: Customer },
        { model: Plant },
        { model: Attachment },
        { model: Signature },
        { model: StatusHistory, order: [["createdAt", "DESC"]] },
      ],
    });
    if (!order) return res.status(404).json({ error: "Not found" });
    res.json(order);
  } catch (e) {
    console.error("Order.getById error:", e);
    res.status(500).json({ error: "Failed to fetch order" });
  }
};

// UPDATE (basic editable fields; respect lock)
exports.update = async (req, res) => {
  const t = await sequelize.transaction();
  try {
    const order = await Order.findByPk(req.params.id, {
      transaction: t,
      lock: t.LOCK.UPDATE,
    });
    if (!order) {
      await t.rollback();
      return res.status(404).json({ error: "Not found" });
    }

    if (order.locked_at) {
      await t.rollback();
      return res.status(400).json({ error: "Order is locked" });
    }

    const updatable = (({
      estimated_delivery_at,
      total_amount,
      payment_status,
      meta,
    }) => ({ estimated_delivery_at, total_amount, payment_status, meta }))(
      req.body
    );

    const before = order.toJSON();
    await order.update(updatable, { transaction: t });

    await AuditLog.create(
      {
        actor_id: req.user?.id || null,
        action: "ORDER_UPDATE",
        entity_type: "Order",
        entity_id: order.id,
        diff: { before, after: order.toJSON() },
      },
      { transaction: t }
    );

    await t.commit();
    res.json(order);
  } catch (e) {
    await t.rollback();
    console.error("Order.update error:", e);
    res.status(500).json({ error: "Failed to update order" });
  }
};

// DESTROY
exports.destroy = async (req, res) => {
  const t = await sequelize.transaction();
  try {
    const order = await Order.findByPk(req.params.id, {
      transaction: t,
      include: [{ model: Attachment }],
    });
    if (!order) {
      await t.rollback();
      return res.status(404).json({ error: "Not found" });
    }

    // Delete all associated files before deleting order
    if (order.Attachments && order.Attachments.length > 0) {
      for (const attachment of order.Attachments) {
        if (attachment.storage_key) {
          await fs.unlink(attachment.storage_key).catch(console.error);
        }
      }
    }

    await order.destroy({ transaction: t });

    await AuditLog.create(
      {
        actor_id: req.user?.id || null,
        action: "ORDER_DELETE",
        entity_type: "Order",
        entity_id: order.id,
        diff: null,
      },
      { transaction: t }
    );

    await t.commit();
    res.json({ message: "Order deleted successfully" });
  } catch (e) {
    await t.rollback();
    console.error("Order.destroy error:", e);
    res.status(500).json({ error: "Failed to delete order" });
  }
};

// CHANGE STATUS (writes StatusHistory + AuditLog)
exports.changeStatus = async (req, res) => {
  const t = await sequelize.transaction();
  try {
    const { to_status, reason } = req.body;
    const order = await Order.findByPk(req.params.id, {
      transaction: t,
      lock: t.LOCK.UPDATE,
    });
    if (!order) {
      await t.rollback();
      return res.status(404).json({ error: "Not found" });
    }

    const from = order.status;
    order.status = to_status;
    await order.save({ transaction: t });

    await StatusHistory.create(
      {
        order_id: order.id,
        from_status: from,
        to_status,
        changed_by: req.user?.id || null,
        reason,
        metadata: { source: "api" },
      },
      { transaction: t }
    );

    await AuditLog.create(
      {
        actor_id: req.user?.id || null,
        action: "ORDER_STATUS_CHANGE",
        entity_type: "Order",
        entity_id: order.id,
        diff: { from, to: to_status, reason },
      },
      { transaction: t }
    );

    await t.commit();
    res.json(order);
  } catch (e) {
    await t.rollback();
    console.error("Order.changeStatus error:", e);
    res.status(500).json({ error: "Failed to change status" });
  }
};

// ADD ATTACHMENT (enhanced with file upload)
exports.addAttachment = async (req, res) => {
  const t = await sequelize.transaction();
  try {
    if (!req.file) {
      await t.rollback();
      return res.status(400).json({ error: "No file uploaded" });
    }

    const { kind = "File" } = req.body;
    const order = await Order.findByPk(req.params.id, { transaction: t });

    if (!order) {
      // Clean up uploaded file
      await fs.unlink(req.file.path).catch(console.error);
      await t.rollback();
      return res.status(404).json({ error: "Order not found" });
    }

    const attachment = await Attachment.create(
      {
        order_id: order.id,
        storage_key: req.file.path,
        version_id: null,
        original_name: req.file.originalname,
        mime_type: req.file.mimetype,
        size_bytes: req.file.size,
        kind: kind,
        uploaded_by: req.user?.id || null,
      },
      { transaction: t }
    );

    await AuditLog.create(
      {
        actor_id: req.user?.id || null,
        action: "ATTACHMENT_ADD",
        entity_type: "Attachment",
        entity_id: attachment.id,
        diff: { order_id: order.id, filename: req.file.originalname },
      },
      { transaction: t }
    );

    await t.commit();
    res.status(201).json(attachment);
  } catch (e) {
    await t.rollback();
    if (req.file) {
      await fs.unlink(req.file.path).catch(console.error);
    }
    console.error("Order.addAttachment error:", e);
    res.status(500).json({ error: "Failed to add attachment" });
  }
};

// SIGN ORDER
// SIGN ORDER (accepts multipart file upload)
exports.sign = async (req, res) => {
  const t = await sequelize.transaction();
  try {
    // If file upload flow used, req.file will exist
    const order = await Order.findByPk(req.params.id, { transaction: t });
    if (!order) {
      // clean up uploaded file if any
      if (req.file) await fs.unlink(req.file.path).catch(() => {});
      await t.rollback();
      return res.status(404).json({ error: "Order not found" });
    }

    // Determine storage_key for the new signature
    let storageKey;
    if (req.file && req.file.path) {
      storageKey = req.file.path; // local disk path; in prod replace with S3 key
    } else {
      // fallback if client sends JSON with storage_key
      storageKey = req.body.storage_key || null;
    }

    if (!storageKey) {
      await t.rollback();
      return res.status(400).json({ error: "No signature provided" });
    }

    // Upsert signature: if existing, delete old file and update
    let signature = await Signature.findOne({
      where: { order_id: order.id },
      transaction: t,
    });

    if (signature) {
      // delete old file from disk if exists and is different
      if (signature.storage_key && signature.storage_key !== storageKey) {
        await fs.unlink(signature.storage_key).catch(() => {});
      }
      await signature.update(
        {
          storage_key: storageKey,
          version_id: req.body.version_id || null,
          signed_by_name: req.body.signed_by_name || null,
          signed_at: new Date(),
          signed_by_user_id: req.user?.id || null,
        },
        { transaction: t }
      );
    } else {
      signature = await Signature.create(
        {
          order_id: order.id,
          storage_key: storageKey,
          version_id: req.body.version_id || null,
          signed_by_name: req.body.signed_by_name || null,
          signed_by_user_id: req.user?.id || null,
          signed_at: new Date(),
        },
        { transaction: t }
      );
    }

    await AuditLog.create(
      {
        actor_id: req.user?.id || null,
        action: "ORDER_SIGN",
        entity_type: "Order",
        entity_id: order.id,
        diff: { signature_id: signature.id },
      },
      { transaction: t }
    );

    await t.commit();
    res.json(signature);
  } catch (e) {
    await t.rollback();
    // cleanup uploaded file on error
    if (req.file) {
      await fs.unlink(req.file.path).catch(() => {});
    }
    console.error("Order.sign error:", e);
    res.status(500).json({ error: "Failed to sign order" });
  }
};

exports.deleteAttachment = async (req, res) => {
  const t = await sequelize.transaction();
  try {
    const { id, attachmentId } = req.params;
    const attachment = await Attachment.findOne({
      where: { id: attachmentId, order_id: id },
      transaction: t,
    });
    if (!attachment) {
      await t.rollback();
      return res.status(404).json({ error: "Attachment not found" });
    }

    // remove file from disk
    if (attachment.storage_key) {
      await fs.unlink(attachment.storage_key).catch(console.error);
    }

    await attachment.destroy({ transaction: t });

    await AuditLog.create(
      {
        actor_id: req.user?.id || null,
        action: "ATTACHMENT_DELETE",
        entity_type: "Attachment",
        entity_id: attachment.id,
        diff: { order_id: id },
      },
      { transaction: t }
    );

    await t.commit();
    res.json({ message: "Attachment deleted" });
  } catch (e) {
    await t.rollback();
    console.error("Attachment.delete error:", e);
    res.status(500).json({ error: "Failed to delete attachment" });
  }
};

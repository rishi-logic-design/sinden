// controllers/orderController.js
const path = require("path");
const fs = require("fs").promises;
const QRCode = require("qrcode");
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
  OrderQRCode,
} = Database;
const PDFDocument = require("pdfkit");

function buildQRData(order) {
  return {
    id: order.id,
    order_number: order.order_number,
    status: order.status,
    total_amount: order.total_amount,
    estimated_delivery_at: order.estimated_delivery_at,
    createdAt: order.createdAt,
    meta: {
      clientName: order.meta?.clientName || null,
      contact: order.meta?.contact || null,
      serviceType: order.meta?.serviceType || null,
      pricing: order.meta?.pricing || null,
      items: order.meta?.items
        ? order.meta.items.map((i) => ({
            d: i.description,
            q: i.quantity,
            u: i.unitPrice,
            t: i.total,
          }))
        : null,
    },
  };
}

async function generateAndSaveOrderQR(order, t) {
  const qrData = buildQRData(order);

  const pngDir = path.join(process.cwd(), "uploads", "qrcodes");
  await fs.mkdir(pngDir, { recursive: true });
  const filePath = path.join(pngDir, `order-${order.id}.png`);

  // PNG buffer
  const buf = await QRCode.toBuffer(JSON.stringify(qrData), {
    type: "png",
    errorCorrectionLevel: "M",
    margin: 1,
    width: 512,
  });

  await fs.writeFile(filePath, buf);

  const existing = await OrderQRCode.findOne({
    where: { order_id: order.id },
    transaction: t,
  });

  if (existing) {
    // If path changed (unlikely), cleanup old
    if (existing.storage_key && existing.storage_key !== filePath) {
      await fs.unlink(existing.storage_key).catch(() => {});
    }
    await existing.update(
      {
        storage_key: filePath,
        size_bytes: buf.length,
        data_json: qrData,
        version: (existing.version || 1) + 1,
        mime_type: "image/png",
      },
      { transaction: t }
    );
    return existing;
  }

  return await OrderQRCode.create(
    {
      order_id: order.id,
      storage_key: filePath,
      mime_type: "image/png",
      size_bytes: buf.length,
      data_json: qrData,
      version: 1,
    },
    { transaction: t }
  );
}

// CREATE
exports.create = async (req, res) => {
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
      status,
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

    // Create order with explicit status (default to "Pending" if not provided)
    const orderStatus = status || "Pending";
    const order = await Order.create(
      {
        order_number,
        customer_id,
        plant_id,
        estimated_delivery_at,
        total_amount: total_amount ?? 0,
        payment_status: payment_status ?? "None",
        status: orderStatus,
        meta: meta ?? null,
      },
      { transaction: t }
    );

    // Create status history entry for initial status
    await StatusHistory.create(
      {
        order_id: order.id,
        from_status: null,
        to_status: orderStatus,
        changed_by: req.user?.id || null,
        reason: "Order created",
        metadata: {
          source: "api",
          created_at: new Date().toISOString(),
          order_number: order_number,
        },
      },
      { transaction: t }
    );
    await StatusHistory.create(
      {
        order_id: order.id,
        from_status: null,
        to_status: orderStatus,
        changed_by: req.user?.id || null,
        reason: "Order created",
        metadata: {
          source: "api",
          created_at: new Date().toISOString(),
          order_number: order_number,
        },
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
    await generateAndSaveOrderQR(order, t);

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
};

exports.list = async (req, res) => {
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
};

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
        { model: OrderQRCode },
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
      status,
    }) => ({
      estimated_delivery_at,
      total_amount,
      payment_status,
      meta,
      status,
    }))(req.body);

    const before = order.toJSON();
    await order.update(updatable, { transaction: t });

    if (req.body.status && req.body.status !== before.status) {
      await StatusHistory.create(
        {
          order_id: order.id,
          from_status: before.status,
          to_status: req.body.status,
          changed_by: req.user?.id || null,
          reason: req.body.reason || "Status updated",
          metadata: { source: "api", updated_at: new Date().toISOString() },
        },
        { transaction: t }
      );
    }

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
    const fieldsAffectingQR = [
      "status",
      "total_amount",
      "estimated_delivery_at",
      "meta",
    ];

    if (Object.keys(req.body).some((k) => fieldsAffectingQR.includes(k))) {
      await generateAndSaveOrderQR(order, t);
    }

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
      include: [{ model: Attachment }, { model: OrderQRCode }],
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

    if (order.OrderQRCode?.storage_key) {
      await fs.unlink(order.OrderQRCode.storage_key).catch(() => {});
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

    if (!to_status) {
      await t.rollback();
      return res.status(400).json({ error: "to_status is required" });
    }

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

    // Create status history entry
    await StatusHistory.create(
      {
        order_id: order.id,
        from_status: from,
        to_status: to_status,
        changed_by: req.user?.id || null,
        reason: reason || "Status changed",
        metadata: {
          source: "api",
          changed_at: new Date().toISOString(),
        },
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

// SIGN ORDER (accepts multipart file upload)
exports.sign = async (req, res) => {
  const t = await sequelize.transaction();
  try {
    const order = await Order.findByPk(req.params.id, { transaction: t });
    if (!order) {
      if (req.file) await fs.unlink(req.file.path).catch(() => {});
      await t.rollback();
      return res.status(404).json({ error: "Order not found" });
    }

    let storageKey;
    if (req.file && req.file.path) {
      storageKey = req.file.path;
    } else {
      storageKey = req.body.storage_key || null;
    }

    if (!storageKey) {
      await t.rollback();
      return res.status(400).json({ error: "No signature provided" });
    }

    let signature = await Signature.findOne({
      where: { order_id: order.id },
      transaction: t,
    });

    if (signature) {
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

exports.getQRCodePng = async (req, res) => {
  try {
    const qr = await OrderQRCode.findOne({
      where: { order_id: req.params.id },
    });
    if (!qr || !qr.storage_key)
      return res.status(404).json({ error: "QR not found" });

    res.setHeader("Content-Type", qr.mime_type || "image/png");
    const inline = req.query.inline === "1";
    res.setHeader(
      "Content-Disposition",
      `${inline ? "inline" : "attachment"}; filename="order-${
        req.params.id
      }.png"`
    );
    return res.sendFile(path.resolve(qr.storage_key));
  } catch (e) {
    console.error("getQRCodePng error:", e);
    res.status(500).json({ error: "Failed to fetch QR" });
  }
};

// GET /orders/:id/qrcode/data -> returns JSON snapshot encoded in QR
exports.getQRCodeData = async (req, res) => {
  try {
    const qr = await OrderQRCode.findOne({
      where: { order_id: req.params.id },
    });
    if (!qr) return res.status(404).json({ error: "QR not found" });
    res.json({
      order_id: Number(req.params.id),
      data: qr.data_json,
      version: qr.version,
    });
  } catch (e) {
    console.error("getQRCodeData error:", e);
    res.status(500).json({ error: "Failed to fetch QR data" });
  }
};

// POST /orders/:id/qrcode/regenerate
exports.regenerateQRCode = async (req, res) => {
  const t = await sequelize.transaction();
  try {
    const order = await Order.findByPk(req.params.id, { transaction: t });
    if (!order) {
      await t.rollback();
      return res.status(404).json({ error: "Not found" });
    }
    const qr = await generateAndSaveOrderQR(order, t);
    await t.commit();
    res.json({ success: true, id: qr.id, version: qr.version });
  } catch (e) {
    await t.rollback();
    console.error("regenerateQRCode error:", e);
    res.status(500).json({ error: "Failed to regenerate QR" });
  }
};

// GET ORDER HISTORY
exports.getOrderHistory = async (req, res) => {
  try {
    const { id } = req.params;

    // Fetch StatusHistory directly from database
    const statusHistories = await StatusHistory.findAll({
      where: { order_id: id },
      order: [["createdAt", "DESC"]],
    });

    // Fetch AuditLogs for additional context
    const auditLogs = await AuditLog.findAll({
      where: { entity_id: id, entity_type: "Order" },
      order: [["createdAt", "DESC"]],
      limit: 20,
    });

    // Transform StatusHistory into HistoryItem format
    const historyItems = statusHistories.map((sh) => {
      const user = sh.changed_by
        ? `User ID: ${sh.changed_by} (Administrative)`
        : "System";

      return {
        id: sh.id,
        title: `Status changed to ${sh.to_status}`,
        subtitle: `From ${sh.from_status || "Initial"} to ${sh.to_status}`,
        date: new Date(sh.createdAt)
          .toLocaleString("es-ES", {
            day: "2-digit",
            month: "2-digit",
            year: "numeric",
            hour: "2-digit",
            minute: "2-digit",
          })
          .replace(",", " -"),
        user: user,
        status: sh.to_status,
        reason: sh.reason || "No reason provided",
        timestamp: sh.createdAt,
      };
    });

    // Transform AuditLogs
    const auditItems = auditLogs.map((log) => {
      const actionLabels = {
        ORDER_CREATE: "Order created",
        ORDER_UPDATE: "Order updated",
        ORDER_STATUS_CHANGE: "Status changed",
        ATTACHMENT_ADD: "Attachment added",
        ATTACHMENT_DELETE: "Attachment deleted",
        ORDER_SIGN: "Order signed",
      };

      const subtitleMap = {
        ORDER_UPDATE: "Order details modified",
        ATTACHMENT_ADD: "Document attached",
        ATTACHMENT_DELETE: "Document removed",
        ORDER_CREATE: "Order initialized",
        ORDER_STATUS_CHANGE: "Status updated",
        ORDER_SIGN: "Order signed",
      };

      return {
        id: log.id,
        title: actionLabels[log.action] || log.action,
        subtitle: subtitleMap[log.action] || "Action performed",
        date: new Date(log.createdAt)
          .toLocaleString("es-ES", {
            day: "2-digit",
            month: "2-digit",
            year: "numeric",
            hour: "2-digit",
            minute: "2-digit",
          })
          .replace(",", " -"),
        user: `User ID: ${log.actor_id || "System"} (Administrative)`,
        status: log.action,
        timestamp: log.createdAt,
      };
    });

    // Combine and sort by timestamp descending (newest first)
    const allHistory = [...historyItems, ...auditItems].sort(
      (a, b) => new Date(b.timestamp) - new Date(a.timestamp)
    );

    res.json(allHistory);
  } catch (e) {
    console.error("Order.getOrderHistory error:", e);
    res.status(500).json({ error: "Failed to fetch order history" });
  }
};

exports.exportOrderPDF = async (req, res) => {
  try {
    const order = await Order.findByPk(req.params.id, {
      include: [
        { model: Customer },
        { model: Plant },
        { model: Attachment },
        { model: Signature },
      ],
    });

    if (!order) {
      return res.status(404).json({ error: "Order not found" });
    }

    const doc = new PDFDocument();
    res.setHeader("Content-Type", "application/pdf");
    res.setHeader(
      "Content-Disposition",
      `attachment; filename="Order_${order.order_number}.pdf"`
    );

    doc.pipe(res);

    // Title
    doc.fontSize(20).font("Helvetica-Bold").text("ORDER DETAILS", 50, 50);

    // Divider line
    doc.moveTo(50, 80).lineTo(550, 80).stroke();

    let yPos = 100;

    // Order Header Info
    doc.fontSize(12).font("Helvetica-Bold");
    doc.text("Order Information", 50, yPos);
    yPos += 20;

    doc.fontSize(10).font("Helvetica");
    doc.text(`Order Number: ${order.order_number}`, 50, yPos);
    yPos += 15;
    doc.text(`Status: ${order.status}`, 50, yPos);
    yPos += 15;
    doc.text(
      `Created: ${new Date(order.createdAt).toLocaleDateString("en-GB")}`,
      50,
      yPos
    );
    yPos += 15;
    doc.text(
      `Est. Delivery: ${new Date(
        order.estimated_delivery_at
      ).toLocaleDateString("en-GB")}`,
      50,
      yPos
    );
    yPos += 25;

    // Customer Info
    doc.fontSize(12).font("Helvetica-Bold");
    doc.text("Customer Information", 50, yPos);
    yPos += 20;

    doc.fontSize(10).font("Helvetica");
    doc.text(`Name: ${order.meta?.clientName || "N/A"}`, 50, yPos);
    yPos += 15;
    doc.text(`Contact: ${order.meta?.contact || "N/A"}`, 50, yPos);
    yPos += 15;
    doc.text(`Company: ${order.Customer?.name || "N/A"}`, 50, yPos);
    yPos += 25;

    // Service Info
    doc.fontSize(12).font("Helvetica-Bold");
    doc.text("Service Information", 50, yPos);
    yPos += 20;

    doc.fontSize(10).font("Helvetica");
    doc.text(`Type: ${order.meta?.serviceType || "N/A"}`, 50, yPos);
    yPos += 15;
    doc.text(`Total Amount: ${order.total_amount || "N/A"}`, 50, yPos);
    yPos += 15;
    doc.text(`Payment Status: ${order.payment_status || "N/A"}`, 50, yPos);
    yPos += 25;

    // Service Detail
    if (order.meta?.serviceDetail) {
      doc.fontSize(12).font("Helvetica-Bold");
      doc.text("Service Details", 50, yPos);
      yPos += 15;

      doc.fontSize(10).font("Helvetica");
      doc.text(order.meta.serviceDetail, 50, yPos, {
        width: 500,
        align: "left",
      });
      yPos += 60;
    }

    // Observations
    if (order.meta?.observations) {
      doc.fontSize(12).font("Helvetica-Bold");
      doc.text("Observations", 50, yPos);
      yPos += 15;

      doc.fontSize(10).font("Helvetica");
      doc.text(order.meta.observations, 50, yPos, {
        width: 500,
        align: "left",
      });
    }

    doc.end();
  } catch (e) {
    console.error("exportOrderPDF error:", e);
    res.status(500).json({ error: "Failed to export PDF" });
  }
};

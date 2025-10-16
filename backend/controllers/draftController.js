// controllers/draftController.js
const Database = require("../db/connect");
const { Draft, User } = Database;
const { Op } = require("sequelize");

// Auto-save draft (every 12 seconds from frontend)
exports.autoSave = async (req, res) => {
  try {
    const { id, data } = req.body;

    if (!data || !data.formData) {
      return res.status(400).json({
        success: false,
        error: "Form data is required",
      });
    }

    const draftId =
      id || `draft_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const userId = req.user?.id || null;

    const draftData = {
      id: draftId,
      form_data: data.formData,
      files_meta: data.files || [],
      has_signature: Boolean(data.signature),
      auto_saved: true,
      user_id: userId,
      status: "auto", // Auto-saved status
      timestamp: new Date(),
      last_modified: new Date(),
    };

    const [draft, created] = await Draft.upsert(draftData, { returning: true });

    res.status(200).json({
      success: true,
      draftId: draft.id,
      timestamp: new Date().toISOString(),
      message: created ? "Draft auto-saved" : "Draft updated",
    });
  } catch (error) {
    console.error("Draft.autoSave error:", error);
    res.status(500).json({
      success: false,
      error: "Failed to auto-save draft",
    });
  }
};

// Manual save draft (when user clicks "Save as Draft")
exports.manualSave = async (req, res) => {
  try {
    const { data } = req.body;

    if (!data || !data.formData) {
      return res.status(400).json({
        success: false,
        error: "Form data is required",
      });
    }

    const draftId = `draft_manual_${Date.now()}_${Math.random()
      .toString(36)
      .substr(2, 9)}`;
    const userId = req.user?.id || null;

    const draftData = {
      id: draftId,
      form_data: data.formData,
      files_meta: data.files || [],
      has_signature: Boolean(data.signature),
      auto_saved: false,
      user_id: userId,
      status: "draft", // Manually saved status
      timestamp: new Date(),
      last_modified: new Date(),
    };

    const [draft, created] = await Draft.upsert(draftData, { returning: true });

    res.status(200).json({
      success: true,
      draftId: draft.id,
      draft,
      message: "Draft saved successfully",
    });
  } catch (error) {
    console.error("Draft.manualSave error:", error);
    res.status(500).json({
      success: false,
      error: "Failed to save draft",
    });
  }
};

// Get all drafts with filtering
exports.list = async (req, res) => {
  try {
    const userId = req.user?.id || null;
    const limit = parseInt(req.query.limit) || 100;
    const offset = parseInt(req.query.offset) || 0;
    const status = req.query.status; // 'auto', 'draft', or undefined for all

    const where = {};
    if (userId) where.user_id = userId;
    if (status) where.status = status;

    const { count, rows: drafts } = await Draft.findAndCountAll({
      where,
      limit,
      offset,
      order: [["last_modified", "DESC"]],
      include: [
        { model: User, as: "user", attributes: ["id", "fullName", "email"] },
      ],
    });

    res.status(200).json({
      success: true,
      drafts,
      pagination: { total: count, limit, offset, count: drafts.length },
    });
  } catch (error) {
    console.error("Draft.list error:", error);
    res.status(500).json({ success: false, error: "Failed to fetch drafts" });
  }
};

// Get latest auto-saved draft for recovery
exports.getLatestAutoSave = async (req, res) => {
  try {
    const userId = req.user?.id || null;

    const where = { status: "auto" };
    if (userId) where.user_id = userId;

    const draft = await Draft.findOne({
      where,
      order: [["last_modified", "DESC"]],
    });
    if (!draft) {
      return res.status(200).json({ success: true, draft: null });
    }
    const draftData = draft.get({ plain: true });
    res.status(200).json({
      success: true,
      draft: draftData,
    });

    try {
      await Draft.destroy({ where: { id: draft.id } });
      console.log(`Auto-save draft ${draft.id} deleted after recovery`);
    } catch (delErr) {
      console.error("Failed to delete auto-saved draft after fetch:", delErr);
    }

  } catch (error) {
    console.error("Draft.getLatestAutoSave error:", error);
    res
      .status(500)
      .json({ success: false, error: "Failed to fetch latest draft" });
  }
};

// Get draft by ID
exports.getById = async (req, res) => {
  try {
    const { id } = req.params;

    const draft = await Draft.findByPk(id, {
      include: [
        { model: User, as: "user", attributes: ["id", "fullName", "email"] },
      ],
    });

    if (!draft) {
      return res.status(404).json({ success: false, error: "Draft not found" });
    }

    res.status(200).json({ success: true, draft });
  } catch (error) {
    console.error("Draft.getById error:", error);
    res.status(500).json({ success: false, error: "Failed to fetch draft" });
  }
};

// Update draft
exports.update = async (req, res) => {
  try {
    const { id } = req.params;
    const updateData = req.body;

    const draft = await Draft.findByPk(id);
    if (!draft) {
      return res.status(404).json({ success: false, error: "Draft not found" });
    }

    const updates = {
      form_data: updateData.formData || draft.form_data,
      files_meta: updateData.files || draft.files_meta,
      has_signature: Boolean(updateData.signature),
      last_modified: new Date(),
    };

    await draft.update(updates);

    res.status(200).json({ success: true, message: "Draft updated", draft });
  } catch (error) {
    console.error("Draft.update error:", error);
    res.status(500).json({ success: false, error: "Failed to update draft" });
  }
};

// Delete draft
exports.destroy = async (req, res) => {
  try {
    const { id } = req.params;

    const draft = await Draft.findByPk(id);
    if (!draft) {
      return res.status(404).json({ success: false, error: "Draft not found" });
    }

    await draft.destroy();
    res.status(200).json({ success: true, message: "Draft deleted" });
  } catch (error) {
    console.error("Draft.destroy error:", error);
    res.status(500).json({ success: false, error: "Failed to delete draft" });
  }
};

// Delete all auto-saved drafts for user
exports.deleteAutoSaved = async (req, res) => {
  try {
    const userId = req.user?.id;

    const where = { status: "auto" };
    if (userId) where.user_id = userId;

    const deletedCount = await Draft.destroy({ where });

    res.status(200).json({
      success: true,
      deletedCount,
      message: `Deleted ${deletedCount} auto-saved drafts`,
    });
  } catch (error) {
    console.error("Draft.deleteAutoSaved error:", error);
    res
      .status(500)
      .json({ success: false, error: "Failed to delete auto-saved drafts" });
  }
};

// Convert draft to order
exports.convertToOrder = async (req, res) => {
  try {
    const { id } = req.params;

    const draft = await Draft.findByPk(id);
    if (!draft) {
      return res.status(404).json({ success: false, error: "Draft not found" });
    }

    // Return draft data for frontend to create order
    res.status(200).json({
      success: true,
      draft,
      message: "Draft ready for conversion",
    });
  } catch (error) {
    console.error("Draft.convertToOrder error:", error);
    res.status(500).json({ success: false, error: "Failed to convert draft" });
  }
};

// Get draft count by status
exports.getCount = async (req, res) => {
  try {
    const userId = req.user?.id || null;
    const where = {};
    if (userId) where.user_id = userId;

    const [totalCount, autoCount, manualCount] = await Promise.all([
      Draft.count({ where }),
      Draft.count({ where: { ...where, status: "auto" } }),
      Draft.count({ where: { ...where, status: "draft" } }),
    ]);

    res.status(200).json({
      success: true,
      total: totalCount,
      autoSaved: autoCount,
      manual: manualCount,
    });
  } catch (error) {
    console.error("Draft.getCount error:", error);
    res.status(500).json({ success: false, error: "Failed to get count" });
  }
};

// Cleanup old auto-saved drafts (older than 7 days)
exports.cleanupOldAutoSaves = async (req, res) => {
  try {
    const daysOld = parseInt(req.query.days) || 7;
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - daysOld);

    const deletedCount = await Draft.destroy({
      where: {
        status: "auto",
        timestamp: { [Op.lt]: cutoffDate },
      },
    });

    res.status(200).json({
      success: true,
      deletedCount,
      message: `Deleted ${deletedCount} auto-saved drafts older than ${daysOld} days`,
    });
  } catch (error) {
    console.error("Draft.cleanupOldAutoSaves error:", error);
    res.status(500).json({ success: false, error: "Failed to cleanup" });
  }
};

// Search drafts
exports.search = async (req, res) => {
  try {
    const { q: searchTerm } = req.query;
    const userId = req.user?.id || null;
    const limit = parseInt(req.query.limit) || 50;

    if (!searchTerm || searchTerm.trim() === "") {
      return res
        .status(400)
        .json({ success: false, error: "Search term required" });
    }

    const where = {
      [Op.or]: [
        Database.sequelize.literal(
          `JSON_EXTRACT(form_data, '$.clientName') LIKE '%${searchTerm}%'`
        ),
        Database.sequelize.literal(
          `JSON_EXTRACT(form_data, '$.contact') LIKE '%${searchTerm}%'`
        ),
      ],
      status: "draft", // Only search manual drafts
    };

    if (userId) where.user_id = userId;

    const drafts = await Draft.findAll({
      where,
      order: [["last_modified", "DESC"]],
      limit,
    });

    res.status(200).json({
      success: true,
      drafts,
      count: drafts.length,
      searchTerm,
    });
  } catch (error) {
    console.error("Draft.search error:", error);
    res.status(500).json({ success: false, error: "Failed to search" });
  }
};

// Health check
exports.healthCheck = async (req, res) => {
  res.status(200).json({
    success: true,
    status: "healthy",
    timestamp: new Date().toISOString(),
    service: "Draft API",
  });
};

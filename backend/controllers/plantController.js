const Database = require("../db/connect");
const { Plant } = Database;

exports.create = async (req, res) => {
  try {
    const { name, location, code } = req.body;
    const plant = await Plant.create({ name, location, code });
    res.status(201).json(plant);
  } catch (e) {
    console.error("Plant.create error:", e);
    res.status(500).json({ error: "Failed to create plant" });
  }
};

exports.list = async (_req, res) => {
  try {
    const plants = await Plant.findAll({ order: [["name", "ASC"]] });
    res.json(plants);
  } catch (e) {
    console.error("Plant.list error:", e);
    res.status(500).json({ error: "Failed to fetch plants" });
  }
};

exports.getById = async (req, res) => {
  try {
    const plant = await Plant.findByPk(req.params.id);
    if (!plant) return res.status(404).json({ error: "Not found" });
    res.json(plant);
  } catch (e) {
    console.error("Plant.getById error:", e);
    res.status(500).json({ error: "Failed to fetch plant" });
  }
};

exports.update = async (req, res) => {
  try {
    const { name, location, code } = req.body;
    const plant = await Plant.findByPk(req.params.id);
    if (!plant) return res.status(404).json({ error: "Not found" });
    await plant.update({ name, location, code });
    res.json(plant);
  } catch (e) {
    console.error("Plant.update error:", e);
    res.status(500).json({ error: "Failed to update plant" });
  }
};

exports.destroy = async (req, res) => {
  try {
    const plant = await Plant.findByPk(req.params.id);
    if (!plant) return res.status(404).json({ error: "Not found" });
    await plant.destroy();
    res.json({ message: "Deleted" });
  } catch (e) {
    console.error("Plant.destroy error:", e);
    res.status(500).json({ error: "Failed to delete plant" });
  }
};

const Database = require("../db/connect");
const { Customer } = Database;

exports.create = async (req, res) => {
  try {
    const { name, email, phone, is_credit_customer, credit_limit } = req.body;
    const customer = await Customer.create({ name, email, phone, is_credit_customer, credit_limit });
    res.status(201).json(customer);
  } catch (e) {
    console.error("Customer.create error:", e);
    res.status(500).json({ error: "Failed to create customer" });
  }
};

exports.list = async (_req, res) => {
  try {
    const customers = await Customer.findAll({ order: [["createdAt", "DESC"]] });
    res.json(customers);
  } catch (e) {
    res.status(500).json({ error: "Failed to fetch customers" });
  }
};

exports.getById = async (req, res) => {
  try {
    const customer = await Customer.findByPk(req.params.id);
    if (!customer) return res.status(404).json({ error: "Not found" });
    res.json(customer);
  } catch (e) {
    res.status(500).json({ error: "Failed to fetch customer" });
  }
};

exports.update = async (req, res) => {
  try {
    const { name, email, phone, is_credit_customer, credit_limit } = req.body;
    const customer = await Customer.findByPk(req.params.id);
    if (!customer) return res.status(404).json({ error: "Not found" });
    await customer.update({ name, email, phone, is_credit_customer, credit_limit });
    res.json(customer);
  } catch (e) {
    res.status(500).json({ error: "Failed to update customer" });
  }
};

exports.destroy = async (req, res) => {
  try {
    const customer = await Customer.findByPk(req.params.id);
    if (!customer) return res.status(404).json({ error: "Not found" });
    await customer.destroy();
    res.json({ message: "Deleted" });
  } catch (e) {
    console.error("Customer.destroy error:", e);
    res.status(500).json({ error: "Failed to delete customer" });
  }
};

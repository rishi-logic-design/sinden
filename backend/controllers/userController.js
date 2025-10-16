const Database = require("../db/connect");
const { User } = Database;
const { Op } = require("sequelize");
const bcrypt = require("bcryptjs"); 


const ALLOWED_ROLES = ["Receptionist", "Operator", "Admin"];
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/i;

const pickDefined = (obj, keys) =>
  keys.reduce(
    (acc, k) => (obj && obj[k] !== undefined ? ((acc[k] = obj[k]), acc) : acc),
    {}
  );

// Create user
exports.create = async (req, res) => {
  try {
    const { fullName, email, role, password } = req.body;

    // Validate required fields
    if (!fullName || !email || !password) {
      return res
        .status(400)
        .json({ error: "Full name, email, and password are required" });
    }

    // Validate email
    if (!EMAIL_REGEX.test(email)) {
      return res.status(400).json({ error: "Invalid email format" });
    }

    // Validate role
    if (role && !ALLOWED_ROLES.includes(role)) {
      return res
        .status(400)
        .json({ error: `Invalid role. Allowed: ${ALLOWED_ROLES.join(", ")}` });
    }

    // Check duplicate email
    const existingUser = await User.findOne({ where: { email } });
    if (existingUser) {
      return res.status(409).json({ error: "Email already exists" });
    }

    // ✅ Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    const user = await User.create({
      fullName,
      email,
      role: role || "Receptionist",
      password_hash: hashedPassword,
    });

    res.status(201).json({
      message: "User created successfully",
      user,
    });
  } catch (e) {
    console.error("User.create error:", e);
    res.status(500).json({ error: "Failed to create user" });
  }
};

// List all users
exports.list = async (_req, res) => {
  try {
    const users = await User.findAll({
      order: [["createdAt", "DESC"]],
      attributes: { exclude: ["password_hash"] }, // ✅ don't return password
    });
    res.json(users);
  } catch (e) {
    console.error("User.list error:", e);
    res.status(500).json({ error: "Failed to fetch users" });
  }
};

// Get user by ID
exports.getById = async (req, res) => {
  try {
    const user = await User.findByPk(req.params.id, {
      attributes: { exclude: ["password_hash"] },
    });
    if (!user) return res.status(404).json({ error: "Not found" });
    res.json(user);
  } catch (e) {
    console.error("User.getById error:", e);
    res.status(500).json({ error: "Failed to fetch user" });
  }
};

// Update user
exports.update = async (req, res) => {
  try {
    const { fullName, email, role, password } = req.body || {};
    const user = await User.findByPk(req.params.id);

    if (!user) return res.status(404).json({ error: "Not found" });

    // Validate email if provided
    if (email && !EMAIL_REGEX.test(email)) {
      return res.status(400).json({ error: "Invalid email format" });
    }

    // Validate role if provided
    if (role && !ALLOWED_ROLES.includes(role)) {
      return res
        .status(400)
        .json({ error: `Invalid role. Allowed: ${ALLOWED_ROLES.join(", ")}` });
    }

    let updates = pickDefined(req.body, ["fullName", "email", "role"]);

    // ✅ Hash password if updating
    if (password) {
      updates.password_hash = await bcrypt.hash(password, 10);
    }

    await user.update(updates);

    res.json({ message: "User updated successfully", user });
  } catch (e) {
    console.error("User.update error:", e);
    res.status(500).json({ error: "Failed to update user" });
  }
};

// Delete user
exports.destroy = async (req, res) => {
  try {
    const user = await User.findByPk(req.params.id);
    if (!user) return res.status(404).json({ error: "Not found" });

    await user.destroy();
    res.json({ message: "User deleted successfully" });
  } catch (e) {
    console.error("User.destroy error:", e);
    res.status(500).json({ error: "Failed to delete user" });
  }
};

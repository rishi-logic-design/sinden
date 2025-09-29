const Database = require("../db/connect");
const { User } = Database;
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");

const JWT_SECRET =
  process.env.JWT_SECRET || "your-secret-key-change-in-production";
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || "24h";

// Helper function to generate JWT token
const generateToken = (user) => {
  return jwt.sign(
    {
      id: user.id,
      email: user.email,
      role: user.role,
      fullName: user.fullName,
    },
    JWT_SECRET,
    { expiresIn: JWT_EXPIRES_IN }
  );
};

// Register new user
exports.register = async (req, res) => {
  try {
    const { name, email, password } = req.body;

    // Validation
    if (!name || !email || !password) {
      return res.status(400).json({
        error: "Name, email, and password are required",
      });
    }

    if (password.length < 6) {
      return res.status(400).json({
        error: "Password must be at least 6 characters long",
      });
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({
        error: "Invalid email format",
      });
    }

    // Check if user already exists
    const existingUser = await User.findOne({ where: { email } });
    if (existingUser) {
      return res.status(409).json({
        error: "User with this email already exists",
      });
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 12);

    // Create user with Receptionist role by default
    const user = await User.create({
      fullName: name,
      email,
      password_hash: hashedPassword,
      role: "Receptionist", // Default role for new registrations
    });

    // Generate JWT token
    const token = generateToken(user);

    // Return user data without password
    const userData = {
      id: user.id,
      fullName: user.fullName,
      email: user.email,
      role: user.role,
      createdAt: user.createdAt,
    };

    res.status(201).json({
      message: "Registration successful",
      token,
      user: userData,
    });
  } catch (error) {
    console.error("Registration error:", error);
    res.status(500).json({
      error: "Internal server error during registration",
    });
  }
};

// Login user
exports.login = async (req, res) => {
  try {
    const { email, password } = req.body;

    // Validation
    if (!email || !password) {
      return res.status(400).json({
        error: "Email and password are required",
      });
    }

    // Find user by email
    const user = await User.findOne({ where: { email } });
    if (!user) {
      return res.status(401).json({
        error: "Invalid email or password",
      });
    }

    // Check password
    const isPasswordValid = await bcrypt.compare(password, user.password_hash);
    if (!isPasswordValid) {
      return res.status(401).json({
        error: "Invalid email or password",
      });
    }

    // Generate JWT token
    const token = generateToken(user);

    // Return user data without password
    const userData = {
      id: user.id,
      fullName: user.fullName,
      email: user.email,
      role: user.role,
      createdAt: user.createdAt,
    };

    res.json({
      message: "Login successful",
      token,
      user: userData,
    });
  } catch (error) {
    console.error("Login error:", error);
    res.status(500).json({
      error: "Internal server error during login",
    });
  }
};

// Get current user profile
exports.me = async (req, res) => {
  try {
    // req.user is set by auth middleware
    const user = await User.findByPk(req.user.id, {
      attributes: { exclude: ["password_hash"] },
    });

    if (!user) {
      return res.status(404).json({
        error: "User not found",
      });
    }

    res.json({
      user: {
        id: user.id,
        fullName: user.fullName,
        email: user.email,
        role: user.role,
        createdAt: user.createdAt,
        updatedAt: user.updatedAt,
      },
    });
  } catch (error) {
    console.error("Get profile error:", error);
    res.status(500).json({
      error: "Internal server error",
    });
  }
};

// Refresh token
exports.refresh = async (req, res) => {
  try {
    // req.user is set by auth middleware
    const user = await User.findByPk(req.user.id);

    if (!user) {
      return res.status(401).json({
        error: "User not found",
      });
    }

    // Generate new token
    const token = generateToken(user);

    res.json({
      message: "Token refreshed successfully",
      token,
      user: {
        id: user.id,
        fullName: user.fullName,
        email: user.email,
        role: user.role,
      },
    });
  } catch (error) {
    console.error("Token refresh error:", error);
    res.status(500).json({
      error: "Internal server error during token refresh",
    });
  }
};

// Logout
exports.logout = async (req, res) => {
  try {
    // In a real application, you might want to blacklist the token
    // For now, we'll just return success
    res.json({
      message: "Logged out successfully",
    });
  } catch (error) {
    console.error("Logout error:", error);
    res.status(500).json({
      error: "Internal server error during logout",
    });
  }
};

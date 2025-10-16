const Database = require("../db/connect");
const { User } = Database;
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");

// Change Password endpoint
exports.changePassword = async (req, res) => {
  try {
    const { current_password, new_password } = req.body;

    // Get user ID from JWT token (assuming you have auth middleware)
    const userId = req.user?.id || req.userId;

    if (!userId) {
      return res.status(401).json({ error: "Unauthorized - Please login again" });
    }

    // Validate inputs
    if (!current_password || !new_password) {
      return res.status(400).json({ 
        error: "Current password and new password are required" 
      });
    }

    // Password strength validation
    if (new_password.length < 8) {
      return res.status(400).json({ 
        error: "New password must be at least 8 characters long" 
      });
    }

    // Additional password strength checks
    const hasUpper = /[A-Z]/.test(new_password);
    const hasLower = /[a-z]/.test(new_password);
    const hasNumber = /[0-9]/.test(new_password);
    const hasSymbol = /[^A-Za-z0-9]/.test(new_password);

    if (!hasUpper || !hasLower || !hasNumber || !hasSymbol) {
      return res.status(400).json({ 
        error: "Password must contain uppercase, lowercase, number, and special character" 
      });
    }

    // Fetch user with password
    const user = await User.findByPk(userId);
    
    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    if (!user.password_hash) {
      return res.status(400).json({ 
        error: "Cannot change password for OAuth users" 
      });
    }

    // Verify current password
    const isMatch = await bcrypt.compare(current_password, user.password_hash);
    
    if (!isMatch) {
      return res.status(401).json({ error: "Current password is incorrect" });
    }

    // Check if new password is same as current
    const isSameAsOld = await bcrypt.compare(new_password, user.password_hash);
    if (isSameAsOld) {
      return res.status(400).json({ 
        error: "New password must be different from current password" 
      });
    }

    // Hash new password
    const hashedPassword = await bcrypt.hash(new_password, 10);

    // Update password
    await user.update({ password_hash: hashedPassword });

    res.json({ 
      success: true,
      message: "Password changed successfully" 
    });
  } catch (error) {
    console.error("Change password error:", error);
    res.status(500).json({ error: "Failed to change password" });
  }
};

// Get current user (for /auth/me endpoint)
exports.getCurrentUser = async (req, res) => {
  try {
    const userId = req.user?.id || req.userId;

    if (!userId) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    const user = await User.findByPk(userId, {
      attributes: { exclude: ["password_hash"] }
    });

    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    res.json({
      id: user.id,
      fullName: user.fullName,
      email: user.email,
      role: user.role,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt
    });
  } catch (error) {
    console.error("Get current user error:", error);
    res.status(500).json({ error: "Failed to fetch user details" });
  }
};

// Logout endpoint
exports.logout = async (req, res) => {
  try {
    const userId = req.user?.id || req.userId;

    // Clear refresh tokens from database if you're using them
    if (userId && Database.RefreshToken) {
      await Database.RefreshToken.destroy({ where: { user_id: userId } });
    }

    // Clear cookies
    res.clearCookie("access_token", {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict"
    });

    res.clearCookie("refresh_token", {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict"
    });

    res.json({ 
      success: true,
      message: "Logged out successfully" 
    });
  } catch (error) {
    console.error("Logout error:", error);
    res.status(500).json({ error: "Failed to logout" });
  }
};

// Login endpoint (basic implementation)
exports.login = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: "Email and password are required" });
    }

    const user = await User.findOne({ where: { email } });

    if (!user || !user.password_hash) {
      return res.status(401).json({ error: "Invalid credentials" });
    }

    const isMatch = await bcrypt.compare(password, user.password_hash);

    if (!isMatch) {
      return res.status(401).json({ error: "Invalid credentials" });
    }

    // Generate JWT token
    const token = jwt.sign(
      { id: user.id, email: user.email, role: user.role },
      process.env.JWT_SECRET || "your-secret-key",
      { expiresIn: "24h" }
    );

    // Set httpOnly cookie
    res.cookie("access_token", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
      maxAge: 24 * 60 * 60 * 1000 // 24 hours
    });

    res.json({
      success: true,
      message: "Login successful",
      user: {
        id: user.id,
        fullName: user.fullName,
        email: user.email,
        role: user.role
      },
      token
    });
  } catch (error) {
    console.error("Login error:", error);
    res.status(500).json({ error: "Failed to login" });
  }
};

// Register endpoint (basic implementation)
exports.register = async (req, res) => {
  try {
    const { name, email, password } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({ error: "All fields are required" });
    }

    // Check if user exists
    const existingUser = await User.findOne({ where: { email } });
    if (existingUser) {
      return res.status(409).json({ error: "Email already exists" });
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Create user
    const user = await User.create({
      fullName: name,
      email,
      password_hash: hashedPassword,
      role: "Receptionist"
    });

    // Generate token
    const token = jwt.sign(
      { id: user.id, email: user.email, role: user.role },
      process.env.JWT_SECRET || "your-secret-key",
      { expiresIn: "24h" }
    );

    res.status(201).json({
      success: true,
      message: "Registration successful",
      user: {
        id: user.id,
        fullName: user.fullName,
        email: user.email,
        role: user.role
      },
      token
    });
  } catch (error) {
    console.error("Register error:", error);
    res.status(500).json({ error: "Failed to register" });
  }
};

exports.refresh = async (req, res) => {
  try {
    // Try to get token from cookie or Authorization header
    const token = req.cookies?.access_token || 
                  req.headers.authorization?.replace('Bearer ', '');

    if (!token) {
      return res.status(401).json({ error: "No token provided" });
    }

    // Verify and decode the token (even if expired)
    const decoded = jwt.decode(token);
    
    if (!decoded || !decoded.id) {
      return res.status(401).json({ error: "Invalid token" });
    }

    // Generate new token
    const newToken = jwt.sign(
      { id: decoded.id, email: decoded.email, role: decoded.role },
      process.env.JWT_SECRET || "your-secret-key",
      { expiresIn: "24h" }
    );

    // Set new cookie
    res.cookie("access_token", newToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
      maxAge: 24 * 60 * 60 * 1000
    });

    res.json({
      success: true,
      token: newToken,
      message: "Token refreshed"
    });
  } catch (error) {
    console.error("Refresh token error:", error);
    res.status(401).json({ error: "Failed to refresh token" });
  }
};
const roleCheck = (allowedRoles) => {
  return (req, res, next) => {
    try {
      if (!req.user) {
        return res.status(401).json({
          error: "Authentication required",
        });
      }

      if (!allowedRoles.includes(req.user.role)) {
        return res.status(403).json({
          error: "Insufficient permissions",
        });
      }

      next();
    } catch (error) {
      console.error("Role check error:", error);
      res.status(500).json({
        error: "Internal server error",
      });
    }
  };
};

module.exports = roleCheck;

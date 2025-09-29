
const express = require("express");
const cors = require("cors");
const dotenv = require("dotenv");
const Database = require("./db/connect");

dotenv.config();
const app = express();

// Manual CORS setup - sabse pehle
app.use((req, res, next) => {
  res.setHeader('Access-Control-Allow-Origin', 'http://localhost:5173');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  res.setHeader('Access-Control-Allow-Credentials', 'true');

  // Preflight request handle karo
  if (req.method === 'OPTIONS') {
    return res.status(204).end();
  }
  next();
});

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use((req, res, next) => {
  console.log(`📍 ${req.method} ${req.path}`);
  next();
});

// Routes
app.use("/api/auth", require("./routes/authRoutes"));
app.use("/api/users", require("./routes/userRoutes"));
app.use("/api/plants", require("./routes/plantRoutes"));
app.use("/api/customers", require("./routes/customerRoutes"));
app.use("/api/orders", require("./routes/orderRoutes"));
app.use("/api/attachments", require("./routes/attachmentRoutes"));
app.use("/api/signatures", require("./routes/signatureRoutes"));
app.use("/api/status-history", require("./routes/statusHistoryRoutes"));
app.use("/api/audit-logs", require("./routes/auditLogRoutes"));
app.use("/api/reports", require("./routes/reportHistoryRoutes"));

app.use((err, req, res, next) => {
  console.error('❌ Error:', err);
  res.status(500).json({ error: err.message });
});

// Server Start
const port = process.env.PORT || 5001;
Database.sequelize
  .sync()
  .then(() => {
    app.listen(port, () => {
      console.log(`✅ Server running at http://localhost:${port}`);
    });
  })
  .catch((err) => console.error("❌ Error syncing DB:", err));
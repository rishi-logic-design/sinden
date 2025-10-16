const { Sequelize, DataTypes } = require("sequelize");
const dotenv = require("dotenv");
dotenv.config();

const sequelize = new Sequelize(
  process.env.DB_NAME,
  process.env.DB_USER,
  process.env.DB_PASSWORD,
  {
    host: process.env.DB_HOST,
    port: parseInt(process.env.DB_PORT),
    dialect: process.env.DB_DIALECT,
    timezone: "+05:30",
    pool: {
      max: parseInt(process.env.DB_POOL_MAX) || 5,
      min: parseInt(process.env.DB_POOL_MIN) || 0,
      acquire: parseInt(process.env.DB_POOL_ACQUIRE) || 30000,
      idle: parseInt(process.env.DB_POOL_IDLE) || 10000,
    },
  }
);

const Database = {};
Database.sequelize = sequelize;
Database.Sequelize = Sequelize;

// Load Models
Database.User = require("../models/User")(sequelize, DataTypes);
Database.Plant = require("../models/Plant")(sequelize, DataTypes);
Database.Customer = require("../models/Customer")(sequelize, DataTypes);
Database.Order = require("../models/Order")(sequelize, DataTypes);
Database.Attachment = require("../models/Attachment")(sequelize, DataTypes);
Database.Signature = require("../models/Signature")(sequelize, DataTypes);
Database.StatusHistory = require("../models/StatusHistory")(
  sequelize,
  DataTypes
);
Database.AuditLog = require("../models/AuditLog")(sequelize, DataTypes);
Database.ReportHistory = require("../models/ReportHistory")(
  sequelize,
  DataTypes
);
Database.RefreshToken = require("../models/RefreshToken")(sequelize, DataTypes);
Database.Draft = require("../models/Draft")(sequelize, DataTypes);
Database.OrderHistory = require("../models/OrderHistory")(sequelize, DataTypes);
Database.OrderQRCode = require("../models/OrderQRCode")(sequelize, DataTypes);

// ---- Relations ----
Database.Customer.hasMany(Database.Order, {
  foreignKey: { name: "customer_id", allowNull: false },
});
Database.Order.belongsTo(Database.Customer, { foreignKey: "customer_id" });

Database.Plant.hasMany(Database.Order, {
  foreignKey: { name: "plant_id", allowNull: false },
});
Database.Order.belongsTo(Database.Plant, { foreignKey: "plant_id" });

Database.Order.hasMany(Database.Attachment, {
  foreignKey: { name: "order_id", allowNull: false },
  onDelete: "CASCADE",
});
Database.Attachment.belongsTo(Database.Order, { foreignKey: "order_id" });

Database.Order.hasOne(Database.Signature, {
  foreignKey: { name: "order_id", allowNull: false },
  onDelete: "CASCADE",
});
Database.Signature.belongsTo(Database.Order, { foreignKey: "order_id" });

Database.User.hasMany(Database.Attachment, {
  foreignKey: { name: "uploaded_by", allowNull: true },
});
Database.Attachment.belongsTo(Database.User, { foreignKey: "uploaded_by" });

Database.User.hasMany(Database.Signature, {
  foreignKey: { name: "signed_by_user_id", allowNull: true },
});
Database.Signature.belongsTo(Database.User, {
  foreignKey: "signed_by_user_id",
});

Database.Order.hasMany(Database.StatusHistory, {
  foreignKey: { name: "order_id", allowNull: false },
  onDelete: "CASCADE",
});
Database.StatusHistory.belongsTo(Database.Order, { foreignKey: "order_id" });

Database.User.hasMany(Database.StatusHistory, {
  foreignKey: { name: "changed_by", allowNull: true },
});
Database.StatusHistory.belongsTo(Database.User, { foreignKey: "changed_by" });

Database.User.hasMany(Database.AuditLog, {
  foreignKey: { name: "actor_id", allowNull: true },
});
Database.AuditLog.belongsTo(Database.User, { foreignKey: "actor_id" });

Database.User.hasMany(Database.ReportHistory, {
  foreignKey: { name: "generated_by", allowNull: true },
});
Database.ReportHistory.belongsTo(Database.User, { foreignKey: "generated_by" });

Database.User.hasMany(Database.RefreshToken, {
  foreignKey: { name: "user_id", allowNull: false },
});
Database.RefreshToken.belongsTo(Database.User, { foreignKey: "user_id" });

Database.Order.hasMany(Database.OrderHistory, {
  foreignKey: { name: "order_id", allowNull: false },
  onDelete: "CASCADE",
});
Database.OrderHistory.belongsTo(Database.Order, { foreignKey: "order_id" });
// ADD DRAFT RELATIONS
Database.User.hasMany(Database.Draft, {
  foreignKey: { name: "user_id", allowNull: true },
});
Database.Draft.belongsTo(Database.User, { foreignKey: "user_id", as: "user" });

Database.Order.hasOne(Database.OrderQRCode, {
  foreignKey: { name: "order_id", allowNull: false },
  onDelete: "CASCADE",
});
Database.OrderQRCode.belongsTo(Database.Order, { foreignKey: "order_id" });

// Test Connection
sequelize
  .authenticate()
  .then(() => console.log("✅ PostgreSQL Connected"))
  .catch((err) => console.error("❌ PostgreSQL Connection Error:", err));

module.exports = Database;

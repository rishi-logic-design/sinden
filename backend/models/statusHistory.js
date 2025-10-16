// models/StatusHistory.js
module.exports = (sequelize, DataTypes) => {
  const StatusHistory = sequelize.define(
    "StatusHistory",
    {
      from_status: {
        type: DataTypes.ENUM(
          "Pending",
          "InProgress",
          "Executed",
          "Completed",
          "Cancelled",
          "Delivered",
          "PendingPayment",
          "Paid"
        ),
        allowNull: true,
      },
      to_status: {
        type: DataTypes.ENUM(
          "Pending",
          "InProgress",
          "Executed",
          "Completed",
          "Cancelled",
          "Delivered",
          "PendingPayment",
          "Paid"
        ),
        allowNull: false,
      },
      reason: { type: DataTypes.STRING, allowNull: true },
      metadata: { type: DataTypes.JSONB, allowNull: true },
      order_id: { type: DataTypes.INTEGER, allowNull: false },
      changed_by: { type: DataTypes.INTEGER, allowNull: true },
    },
    {
      tableName: "status_history",
      timestamps: true,
      updatedAt: false,
      indexes: [{ fields: ["order_id"] }, { fields: ["changed_by"] }],
    }
  );

  return StatusHistory;
};

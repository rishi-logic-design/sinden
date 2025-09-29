// models/Order.js
module.exports = (sequelize, DataTypes) => {
  const Order = sequelize.define(
    "Order",
    {
      customer_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
      },
      plant_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
      },
      order_number: {
        type: DataTypes.STRING,
        allowNull: false,
        unique: true,
      },
      status: {
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
        defaultValue: "Pending",
      },
      estimated_delivery_at: {
        type: DataTypes.DATE,
        allowNull: false,
      },
      delivery_confirmed_at: {
        type: DataTypes.DATE,
        allowNull: true,
      },
      locked_at: {
        type: DataTypes.DATE,
        allowNull: true,
      },
      total_amount: {
        type: DataTypes.DECIMAL(14, 2),
        allowNull: true,
        defaultValue: 0,
      },
      payment_status: {
        type: DataTypes.ENUM("None", "PendingPayment", "Paid"),
        allowNull: false,
        defaultValue: "None",
      },
      meta: {
        type: DataTypes.JSONB,
        allowNull: true,
      },
      version: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 0,
      },
    },
    {
      tableName: "orders",
      timestamps: true,
      indexes: [
        { fields: ["status"] },
        { fields: ["customer_id"] },
        { fields: ["plant_id"] },
        { fields: ["estimated_delivery_at"] },
        { unique: true, fields: ["order_number"] },
      ],
    }
  );

  return Order;
};

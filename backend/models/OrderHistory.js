// models/OrderHistory.js - Create this new file
module.exports = (sequelize, DataTypes) => {
  const OrderHistory = sequelize.define(
    "OrderHistory",
    {
      order_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
      },
      user_id: {
        type: DataTypes.INTEGER,
        allowNull: true,
      },
      action_type: {
        type: DataTypes.STRING,
        allowNull: false,
      },
      title: {
        type: DataTypes.STRING,
        allowNull: false,
      },
      subtitle: {
        type: DataTypes.TEXT,
        allowNull: true,
      },
      old_status: {
        type: DataTypes.STRING,
        allowNull: true,
      },
      new_status: {
        type: DataTypes.STRING,
        allowNull: true,
      },
      changed_fields: {
        type: DataTypes.JSONB,
        allowNull: true,
      },
      meta: {
        type: DataTypes.JSONB,
        allowNull: true,
      },
    },
    {
      tableName: "order_histories",
      timestamps: true,
      updatedAt: false,
    }
  );

  return OrderHistory;
};

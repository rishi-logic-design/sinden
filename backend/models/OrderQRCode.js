// models/OrderQRCode.js
module.exports = (sequelize, DataTypes) => {
  const OrderQRCode = sequelize.define(
    "OrderQRCode",
    {
      order_id: { type: DataTypes.INTEGER, allowNull: false },
      storage_key: { type: DataTypes.STRING, allowNull: false }, // png path
      mime_type: { type: DataTypes.STRING, allowNull: false, defaultValue: "image/png" },
      size_bytes: { type: DataTypes.INTEGER, allowNull: true },
      data_json: { type: DataTypes.JSONB, allowNull: true }, // snapshot of order payload shown in QR
      version: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 1 },
    },
    {
      tableName: "order_qrcodes",
      timestamps: true,
      updatedAt: false,
      indexes: [{ fields: ["order_id"] }],
    }
  );
  return OrderQRCode;
};

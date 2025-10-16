// models/Signature.js
module.exports = (sequelize, DataTypes) => {
  return sequelize.define(
    "Signature",
    {
      order_id: { type: DataTypes.INTEGER, allowNull: false },
      storage_key: { type: DataTypes.STRING, allowNull: false },
      version_id: { type: DataTypes.STRING, allowNull: true },
      signed_by_name: { type: DataTypes.STRING, allowNull: true },
      signed_at: { type: DataTypes.DATE, allowNull: true },
      signed_by_user_id: { type: DataTypes.INTEGER, allowNull: true },
    },
    { tableName: "signatures", timestamps: true }
  );
};

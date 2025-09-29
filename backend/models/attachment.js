// models/Attachment.js
module.exports = (sequelize, DataTypes) => {
  return sequelize.define(
    "Attachment",
    {
      order_id: { type: DataTypes.INTEGER, allowNull: false },
      storage_key: { type: DataTypes.STRING, allowNull: false },
      version_id: { type: DataTypes.STRING, allowNull: true },
      original_name: { type: DataTypes.STRING, allowNull: true },
      mime_type: { type: DataTypes.STRING, allowNull: true },
      size_bytes: { type: DataTypes.BIGINT, allowNull: true },
      kind: {
        type: DataTypes.ENUM("File", "Signature"),
        allowNull: false,
        defaultValue: "File",
      },
      uploaded_by: { type: DataTypes.INTEGER, allowNull: true },
    },
    { tableName: "attachments", timestamps: true }
  );
};

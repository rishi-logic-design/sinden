// models/AuditLog.js
module.exports = (sequelize, DataTypes) => {
  const AuditLog = sequelize.define(
    "AuditLog",
    {
      action: { type: DataTypes.STRING, allowNull: false },
      entity_type: { type: DataTypes.STRING, allowNull: false },
      entity_id: { type: DataTypes.INTEGER, allowNull: false },
      diff: { type: DataTypes.JSONB, allowNull: true },
      actor_id: { type: DataTypes.INTEGER, allowNull: true }, // <-- yeh line important
    },
    {
      tableName: "audit_logs",
      timestamps: true,
      updatedAt: false,
      indexes: [
        { fields: ["actor_id"] },
        { fields: ["entity_type", "entity_id"] },
      ],
    }
  );

  return AuditLog;
};

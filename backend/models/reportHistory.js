module.exports = (sequelize, DataTypes) => {
  const ReportHistory = sequelize.define(
    "ReportHistory",
    {
      report_type: { type: DataTypes.ENUM("CreditReport"), allowNull: false },
      filters: { type: DataTypes.JSONB }, // e.g. date range, customer, status filters
      file_key: { type: DataTypes.STRING }, // exported PDF/Excel S3 key
      generated_by: {
        type: DataTypes.INTEGER,
        allowNull: true,
      },
    },
    {
      tableName: "report_history",
      timestamps: true, // createdAt = generated time
      updatedAt: false,
    }
  );

  return ReportHistory;
};

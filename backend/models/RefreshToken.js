// models/RefreshToken.js
module.exports = (sequelize, DataTypes) => {
  return sequelize.define(
    "RefreshToken",
    {
      token: { type: DataTypes.STRING, allowNull: false, unique: true },
      user_id: { type: DataTypes.INTEGER, allowNull: false },
      expires_at: { type: DataTypes.DATE, allowNull: false },
      revoked: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: false,
      },
      meta: { type: DataTypes.JSONB, allowNull: true },
    },
    {
      tableName: "refresh_tokens",
      timestamps: true,
    }
  );
};

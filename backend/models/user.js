// models/User.js
module.exports = (sequelize, DataTypes) => {
  const User = sequelize.define(
    "User",
    {
      fullName: { type: DataTypes.STRING, allowNull: false },
      email: { type: DataTypes.STRING, allowNull: false, unique: true },
      password_hash: { type: DataTypes.STRING, allowNull: true }, // nullable for OAuth users
      role: {
        type: DataTypes.ENUM("Receptionist", "Operator", "Admin"),
        allowNull: false,
        defaultValue: "Receptionist",
      },
    },
    {
      tableName: "users",
      timestamps: true,
    }
  );

  return User;
};

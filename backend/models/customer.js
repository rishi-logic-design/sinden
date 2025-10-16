module.exports = (sequelize, DataTypes) => {
  const Customer = sequelize.define(
    "Customer",
    {
      name: { type: DataTypes.STRING, allowNull: false },
      email: { type: DataTypes.STRING, validate: { isEmail: true } },
      phone: { type: DataTypes.STRING },
      is_credit_customer: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: false,
      },
      credit_limit: { type: DataTypes.DECIMAL(14, 2) },
    },
    {
      tableName: "customers",
      timestamps: true,
    }
  );

  return Customer;
};

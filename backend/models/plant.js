module.exports = (sequelize, DataTypes) => {
  const Plant = sequelize.define("Plant", {
    name: { type: DataTypes.STRING, allowNull: false, unique: true },
    location: { type: DataTypes.STRING },
    code: { type: DataTypes.STRING, unique: true },
  }, {
    tableName: "plants",
    timestamps: true,
  });

  return Plant;
};

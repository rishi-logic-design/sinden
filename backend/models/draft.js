// models/Draft.js
module.exports = (sequelize, DataTypes) => {
    const Draft = sequelize.define(
        "Draft",
        {
            id: {
                type: DataTypes.STRING(255),
                primaryKey: true,
                allowNull: false,
            },
            form_data: {
                type: DataTypes.JSON,
                allowNull: false,
                comment: "Complete form data including all fields",
            },
            files_meta: {
                type: DataTypes.JSON,
                allowNull: true,
                defaultValue: [],
                comment: "File metadata (name, size, type) - not actual files",
            },
            has_signature: {
                type: DataTypes.BOOLEAN,
                allowNull: false,
                defaultValue: false,
                comment: "Whether signature is present",
            },
            auto_saved: {
                type: DataTypes.BOOLEAN,
                allowNull: false,
                defaultValue: true,
                comment: "Auto-saved (true) or manually saved (false)",
            },
            status: {
                type: DataTypes.ENUM('auto', 'draft'),
                allowNull: false,
                defaultValue: 'auto',
                comment: "Draft type: 'auto' for auto-saved, 'draft' for manual",
            },
            user_id: {
                type: DataTypes.INTEGER,
                allowNull: true,
                references: {
                    model: "users",
                    key: "id",
                },
                onDelete: "CASCADE",
                comment: "User who created this draft",
            },
            timestamp: {
                type: DataTypes.DATE,
                allowNull: false,
                defaultValue: DataTypes.NOW,
                comment: "When draft was first created",
            },
            last_modified: {
                type: DataTypes.DATE,
                allowNull: false,
                defaultValue: DataTypes.NOW,
                comment: "When draft was last updated",
            },
        },
        {
            tableName: "drafts",
            timestamps: false,
            indexes: [
                {
                    name: "idx_timestamp",
                    fields: ["timestamp"],
                    using: "BTREE",
                },
                {
                    name: "idx_last_modified",
                    fields: ["last_modified"],
                    using: "BTREE",
                },
                {
                    name: "idx_user_id",
                    fields: ["user_id"],
                },
                {
                    name: "idx_status",
                    fields: ["status"],
                },
                {
                    name: "idx_auto_saved",
                    fields: ["auto_saved"],
                },
            ],
            hooks: {
                beforeUpdate: (draft) => {
                    draft.last_modified = new Date();
                },
            },
        }
    );

    Draft.associate = (models) => {
        Draft.belongsTo(models.User, {
            foreignKey: "user_id",
            as: "user",
        });
    };

    return Draft;
};
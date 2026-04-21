// MenuItem model - Kasfbi (IT24102666) - Menu/Inventory Management Component
const { DataTypes } = require('sequelize');
const { sequelize } = require('../../config/db');

// define menu_items table schema
const MenuItem = sequelize.define('MenuItem', {
    id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true
    },
    name: {
        type: DataTypes.STRING(100),
        allowNull: false
    },
    description: {
        type: DataTypes.TEXT,
        allowNull: true
    },
    category: {
        type: DataTypes.ENUM('appetizer', 'main_course', 'dessert', 'beverage', 'snack', 'special'),
        defaultValue: 'main_course'
    },
    price: {
        type: DataTypes.DECIMAL(10, 2),
        allowNull: false
    },
    image: {
        type: DataTypes.STRING(255),
        allowNull: true
    },
    isAvailable: {
        type: DataTypes.BOOLEAN,
        defaultValue: true
    },
    preparationTime: {
        type: DataTypes.INTEGER,
        allowNull: true,
        comment: 'preparation time in minutes'
    }
}, {
    tableName: 'menu_items',
    timestamps: true
});

module.exports = MenuItem;

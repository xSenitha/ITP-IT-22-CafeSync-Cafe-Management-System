// Stock model - Kasfbi (IT24102666) - Menu/Inventory Management Component
const { DataTypes } = require('sequelize');
const { sequelize } = require('../../config/db');

// define stock_items table schema
const Stock = sequelize.define('Stock', {
    id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true
    },
    ingredientName: {
        type: DataTypes.STRING(100),
        allowNull: false
    },
    category: {
        type: DataTypes.ENUM('dairy', 'meat', 'vegetable', 'fruit', 'grain', 'spice', 'beverage', 'other'),
        defaultValue: 'other'
    },
    quantity: {
        type: DataTypes.DECIMAL(10, 2),
        allowNull: false,
        defaultValue: 0
    },
    unit: {
        type: DataTypes.ENUM('kg', 'g', 'l', 'ml', 'pieces', 'packets'),
        defaultValue: 'kg'
    },
    minimumStock: {
        type: DataTypes.DECIMAL(10, 2),
        defaultValue: 10
    },
    unitPrice: {
        type: DataTypes.DECIMAL(10, 2),
        allowNull: false
    },
    supplier: {
        type: DataTypes.STRING(100),
        allowNull: true
    },
    expiryDate: {
        type: DataTypes.DATE,
        allowNull: true
    },
    status: {
        type: DataTypes.ENUM('in_stock', 'low_stock', 'out_of_stock'),
        defaultValue: 'in_stock'
    }
}, {
    tableName: 'stock_items',
    timestamps: true
});

module.exports = Stock;

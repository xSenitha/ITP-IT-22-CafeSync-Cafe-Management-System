// Order model - Gihen (IT24103788) - Order Management Component
const { DataTypes } = require('sequelize');
const { sequelize } = require('../../config/db');

// define orders table schema
const Order = sequelize.define('Order', {
    id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true
    },
    orderNumber: {
        type: DataTypes.STRING(20),
        allowNull: false,
        unique: true
    },
    customerId: {
        type: DataTypes.INTEGER,
        allowNull: true
    },
    customerName: {
        type: DataTypes.STRING(100),
        allowNull: false
    },
    customerEmail: {
        type: DataTypes.STRING(100),
        allowNull: true
    },
    orderType: {
        type: DataTypes.ENUM('dine-in', 'takeaway', 'online'),
        defaultValue: 'dine-in'
    },
    status: {
        type: DataTypes.ENUM('pending', 'preparing', 'ready', 'completed', 'cancelled'),
        defaultValue: 'pending'
    },
    tableNumber: {
        type: DataTypes.INTEGER,
        allowNull: true
    },
    totalAmount: {
        type: DataTypes.DECIMAL(10, 2),
        defaultValue: 0.00
    },
    notes: {
        type: DataTypes.TEXT,
        allowNull: true
    },
    qrToken: {
        type: DataTypes.STRING(80),
        allowNull: true,
        unique: true
    }
}, {
    tableName: 'orders',
    timestamps: true
});

module.exports = Order;

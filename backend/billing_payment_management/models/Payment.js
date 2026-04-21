// Payment model - Bandara (IT24104140) - Billing & Payment Management Component
const { DataTypes } = require('sequelize');
const { sequelize } = require('../../config/db');

// define payments table schema
const Payment = sequelize.define('Payment', {
    id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true
    },
    paymentNumber: {
        type: DataTypes.STRING(20),
        allowNull: false,
        unique: true
    },
    orderId: {
        type: DataTypes.INTEGER,
        allowNull: false
    },
    amount: {
        type: DataTypes.DECIMAL(10, 2),
        allowNull: false
    },
    tax: {
        type: DataTypes.DECIMAL(10, 2),
        defaultValue: 0.00
    },
    discount: {
        type: DataTypes.DECIMAL(10, 2),
        defaultValue: 0.00
    },
    totalAmount: {
        type: DataTypes.DECIMAL(10, 2),
        allowNull: false
    },
    paymentMethod: {
        type: DataTypes.ENUM('cash', 'card', 'online'),
        defaultValue: 'cash'
    },
    paymentStatus: {
        type: DataTypes.ENUM('pending', 'completed', 'refunded', 'failed'),
        defaultValue: 'pending'
    },
    paidBy: {
        type: DataTypes.STRING(100),
        allowNull: true
    }
}, {
    tableName: 'payments',
    timestamps: true
});

module.exports = Payment;

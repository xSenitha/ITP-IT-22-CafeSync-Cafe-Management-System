// Invoice model - Bandara (IT24104140) - Billing & Payment Management Component
const { DataTypes } = require('sequelize');
const { sequelize } = require('../../config/db');
const Payment = require('./Payment');

// define invoices table schema
const Invoice = sequelize.define('Invoice', {
    id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true
    },
    invoiceNumber: {
        type: DataTypes.STRING(20),
        allowNull: false,
        unique: true
    },
    paymentId: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: { model: 'payments', key: 'id' }
    },
    customerName: {
        type: DataTypes.STRING(100),
        allowNull: false
    },
    customerEmail: {
        type: DataTypes.STRING(100),
        allowNull: true
    },
    subtotal: {
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
    grandTotal: {
        type: DataTypes.DECIMAL(10, 2),
        allowNull: false
    },
    invoiceDate: {
        type: DataTypes.DATE,
        defaultValue: DataTypes.NOW
    },
    status: {
        type: DataTypes.ENUM('draft', 'sent', 'paid', 'cancelled'),
        defaultValue: 'draft'
    }
}, {
    tableName: 'invoices',
    timestamps: true
});

// set up association - payment has many invoices
Payment.hasMany(Invoice, { foreignKey: 'paymentId', as: 'invoices' });
Invoice.belongsTo(Payment, { foreignKey: 'paymentId', as: 'payment' });

module.exports = Invoice;

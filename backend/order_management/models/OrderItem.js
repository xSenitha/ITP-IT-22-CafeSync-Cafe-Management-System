// OrderItem model - Gihen (IT24103788) - Order Management Component
const { DataTypes } = require('sequelize');
const { sequelize } = require('../../config/db');
const Order = require('./Order');

// define order_items table schema
const OrderItem = sequelize.define('OrderItem', {
    id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true
    },
    orderId: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: { model: 'orders', key: 'id' }
    },
    menuItemId: {
        type: DataTypes.INTEGER,
        allowNull: true,
        references: { model: 'menu_items', key: 'id' },
        comment: 'FK to menu_items — optional for custom/unlisted items'
    },
    itemName: {
        type: DataTypes.STRING(100),
        allowNull: false
    },
    quantity: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 1
    },
    unitPrice: {
        type: DataTypes.DECIMAL(10, 2),
        allowNull: false
    },
    totalPrice: {
        type: DataTypes.DECIMAL(10, 2),
        allowNull: false
    },
    specialInstructions: {
        type: DataTypes.TEXT,
        allowNull: true
    }
}, {
    tableName: 'order_items',
    timestamps: true
});

// set up association - order has many order items
Order.hasMany(OrderItem, { foreignKey: 'orderId', as: 'items' });
OrderItem.belongsTo(Order, { foreignKey: 'orderId', as: 'order' });

module.exports = OrderItem;

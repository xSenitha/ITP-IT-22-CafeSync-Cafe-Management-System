// Table model - Peiris (IT24100953) - Table/Reservation Management Component
const { DataTypes } = require('sequelize');
const { sequelize } = require('../../config/db');

// define cafe_tables table schema
const Table = sequelize.define('Table', {
    id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true
    },
    tableNumber: {
        type: DataTypes.INTEGER,
        allowNull: false,
        unique: true
    },
    seatingCapacity: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 4
    },
    location: {
        type: DataTypes.ENUM('indoor', 'outdoor', 'vip', 'balcony'),
        defaultValue: 'indoor'
    },
    status: {
        type: DataTypes.ENUM('available', 'occupied', 'reserved', 'maintenance'),
        defaultValue: 'available'
    },
    description: {
        type: DataTypes.TEXT,
        allowNull: true
    }
}, {
    tableName: 'cafe_tables',
    timestamps: true
});

module.exports = Table;

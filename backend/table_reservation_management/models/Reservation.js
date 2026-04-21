// Reservation model - Peiris (IT24100953) - Table/Reservation Management Component
const { DataTypes } = require('sequelize');
const { sequelize } = require('../../config/db');
const Table = require('./Table');

// define reservations table schema
const Reservation = sequelize.define('Reservation', {
    id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true
    },
    reservationNumber: {
        type: DataTypes.STRING(20),
        allowNull: false,
        unique: true
    },
    tableId: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: { model: 'cafe_tables', key: 'id' }
    },
    customerName: {
        type: DataTypes.STRING(100),
        allowNull: false
    },
    customerPhone: {
        type: DataTypes.STRING(15),
        allowNull: false
    },
    customerEmail: {
        type: DataTypes.STRING(100),
        allowNull: true
    },
    partySize: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 2
    },
    reservationDate: {
        type: DataTypes.DATEONLY,
        allowNull: false
    },
    reservationTime: {
        type: DataTypes.TIME,
        allowNull: false
    },
    duration: {
        type: DataTypes.INTEGER,
        defaultValue: 60,
        comment: 'duration in minutes'
    },
    status: {
        type: DataTypes.ENUM('confirmed', 'pending', 'cancelled', 'completed', 'no_show'),
        defaultValue: 'pending'
    },
    specialRequests: {
        type: DataTypes.TEXT,
        allowNull: true
    },
    qrToken: {
        type: DataTypes.STRING(80),
        allowNull: true,
        unique: true
    }
}, {
    tableName: 'reservations',
    timestamps: true
});

// set up association - table has many reservations
Table.hasMany(Reservation, { foreignKey: 'tableId', as: 'reservations' });
Reservation.belongsTo(Table, { foreignKey: 'tableId', as: 'table' });

module.exports = Reservation;

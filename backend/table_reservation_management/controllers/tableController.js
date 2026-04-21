// Table controller - Peiris (IT24100953) - CRUD operations for cafe tables
const { body } = require('express-validator');
const { Op } = require('sequelize');
const Table = require('../models/Table');
const Reservation = require('../models/Reservation');
const Order = require('../../order_management/models/Order');
const { handleValidationErrors } = require('../../common/utils/validation');
const { createPdfDocument, addDocumentHeader, addRecordBlock, addEmptyState, finalizePdf } = require('../../common/services/pdfService');

const ACTIVE_DINE_IN_STATUSES = ['pending', 'preparing', 'ready'];

const validateTable = [
    body('tableNumber').notEmpty().withMessage('Table number is required').isInt({ min: 1 }).withMessage('Table number must be positive'),
    body('seatingCapacity').notEmpty().withMessage('Seating capacity is required').isInt({ min: 1 }).withMessage('Seating capacity must be at least 1'),
    body('location').optional().isIn(['indoor', 'outdoor', 'vip', 'balcony']).withMessage('Invalid location selected'),
    body('status').optional().isIn(['available', 'occupied', 'reserved', 'maintenance']).withMessage('Invalid table status'),
    body('description').optional({ values: 'falsy' }).isLength({ max: 255 }).withMessage('Description is too long')
];

const getLocalDateString = () => {
    const today = new Date();
    const year = today.getFullYear();
    const month = String(today.getMonth() + 1).padStart(2, '0');
    const day = String(today.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
};

const getSelectedDate = (dateValue) => {
    if (!dateValue) {
        return getLocalDateString();
    }

    return String(dateValue).split('T')[0];
};

const buildDailyTableStatus = (table, selectedDate, activeDineInOrders = []) => {
    const plainTable = table.toJSON();
    const manualStatus = plainTable.status === 'reserved' ? 'available' : plainTable.status;
    const hasActiveDineInOrder = activeDineInOrders.some((order) => Number(order.tableNumber) === Number(plainTable.tableNumber));
    const reservationsForDate = (plainTable.reservations || [])
        .filter((reservation) => String(reservation.reservationDate).split('T')[0] === selectedDate)
        .sort((a, b) => String(a.reservationTime).localeCompare(String(b.reservationTime)));

    const hasReservationForDate = reservationsForDate.length > 0;
    const effectiveStatus = manualStatus === 'maintenance'
        ? 'maintenance'
        : ((hasActiveDineInOrder || manualStatus === 'occupied') ? 'occupied' : 'available');
    const displayStatus = ['occupied', 'maintenance'].includes(effectiveStatus)
        ? effectiveStatus
        : (hasReservationForDate ? 'reserved' : 'available');

    return {
        ...plainTable,
        status: effectiveStatus,
        manualStatus,
        displayStatus,
        selectedDate,
        hasActiveDineInOrder,
        reservationCountForDate: reservationsForDate.length,
        isReservedForDate: hasReservationForDate,
        reservationsForDate,
        activeReservation: reservationsForDate[0] || null
    };
};

// create a new table
const createTable = async (req, res) => {
    const validationResponse = handleValidationErrors(req, res);
    if (validationResponse) return validationResponse;

    try {
        const { tableNumber, seatingCapacity, location, status, description } = req.body;
        // check if table number already exists
        const existing = await Table.findOne({ where: { tableNumber } });
        if (existing) {
            return res.status(400).json({ message: 'Table with this number already exists' });
        }
        // create table
        const table = await Table.create({ tableNumber, seatingCapacity, location, status: status || 'available', description });
        res.status(201).json({ message: 'Table created successfully', table });
    } catch (error) {
        res.status(500).json({ message: 'Failed to create table', error: error.message });
    }
};

// get all tables
const getAllTables = async (req, res) => {
    try {
        // support status and location filter
        const whereClause = {};
        if (req.query.status && req.query.status !== 'reserved') whereClause.status = req.query.status;
        if (req.query.location) whereClause.location = req.query.location;
        const selectedDate = getSelectedDate(req.query.date);
        const [tables, reservations, activeDineInOrders] = await Promise.all([
            Table.findAll({
                where: whereClause,
                order: [['tableNumber', 'ASC']]
            }),
            Reservation.findAll({
                where: {
                    reservationDate: selectedDate,
                    status: { [Op.notIn]: ['cancelled', 'completed', 'no_show'] }
                },
                order: [['reservationTime', 'ASC']]
            }),
            selectedDate === getLocalDateString()
                ? Order.findAll({
                    where: {
                        orderType: 'dine-in',
                        tableNumber: { [Op.ne]: null },
                        status: { [Op.in]: ACTIVE_DINE_IN_STATUSES }
                    },
                    attributes: ['tableNumber']
                })
                : Promise.resolve([])
        ]);

        const reservationsByTableId = reservations.reduce((accumulator, reservation) => {
            const tableId = String(reservation.tableId);
            if (!accumulator[tableId]) {
                accumulator[tableId] = [];
            }
            accumulator[tableId].push(reservation.toJSON());
            return accumulator;
        }, {});

        const mappedTables = tables
            .map((table) => buildDailyTableStatus({
                toJSON: () => ({
                    ...table.toJSON(),
                    reservations: reservationsByTableId[String(table.id)] || []
                })
            }, selectedDate, activeDineInOrders))
            .filter((table) => !req.query.status || table.displayStatus === req.query.status || table.manualStatus === req.query.status);

        res.json(mappedTables);
    } catch (error) {
        res.status(500).json({ message: 'Failed to fetch tables', error: error.message });
    }
};

// get single table by id
const getTableById = async (req, res) => {
    try {
        const table = await Table.findByPk(req.params.id, { include: [{ model: Reservation, as: 'reservations' }] });
        if (!table) {
            return res.status(404).json({ message: 'Table not found' });
        }
        res.json(table);
    } catch (error) {
        res.status(500).json({ message: 'Failed to fetch table', error: error.message });
    }
};

// update table
const updateTable = async (req, res) => {
    const validationResponse = handleValidationErrors(req, res);
    if (validationResponse) return validationResponse;

    try {
        const table = await Table.findByPk(req.params.id);
        if (!table) {
            return res.status(404).json({ message: 'Table not found' });
        }
        const { tableNumber, seatingCapacity, location, status, description } = req.body;
        await table.update({
            tableNumber: tableNumber || table.tableNumber,
            seatingCapacity: seatingCapacity || table.seatingCapacity,
            location: location || table.location,
            status: status || table.status,
            description: description !== undefined ? description : table.description
        });
        res.json({ message: 'Table updated successfully', table });
    } catch (error) {
        res.status(500).json({ message: 'Failed to update table', error: error.message });
    }
};

// delete table
const deleteTable = async (req, res) => {
    try {
        const table = await Table.findByPk(req.params.id);
        if (!table) {
            return res.status(404).json({ message: 'Table not found' });
        }
        await Reservation.destroy({ where: { tableId: table.id } });
        await table.destroy();
        res.json({ message: 'Table deleted successfully' });
    } catch (error) {
        res.status(500).json({ message: 'Failed to delete table', error: error.message });
    }
};

const exportTablesPdf = async (req, res) => {
    try {
        const tables = await Table.findAll({
            include: [{ model: Reservation, as: 'reservations' }],
            order: [['tableNumber', 'ASC']]
        });

        const doc = createPdfDocument(res, 'tables-report.pdf');
        addDocumentHeader(doc, 'CafeSync Tables Report', `Total tables: ${tables.length}`);

        if (!tables.length) {
            addEmptyState(doc, 'No tables are available right now.');
            return finalizePdf(doc);
        }

        tables.forEach((table) => {
            addRecordBlock(doc, `Table ${table.tableNumber}`, [
                { label: 'Seating Capacity', value: `${table.seatingCapacity} seats` },
                { label: 'Location', value: table.location || '-' },
                { label: 'Status', value: table.status },
                { label: 'Description', value: table.description || '-' },
                { label: 'Reservations', value: String(table.reservations?.length || 0) }
            ]);
        });

        return finalizePdf(doc);
    } catch (error) {
        return res.status(500).json({ message: 'Failed to export tables PDF', error: error.message });
    }
};

module.exports = { validateTable, createTable, getAllTables, getTableById, updateTable, deleteTable, exportTablesPdf };

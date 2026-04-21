// Reservation controller - Peiris (IT24100953) - CRUD operations for reservations
const { body } = require('express-validator');
const { Op } = require('sequelize');
const Reservation = require('../models/Reservation');
const Table = require('../models/Table');
const { handleValidationErrors } = require('../../common/utils/validation');
const { generateQrDataUrl } = require('../../common/services/qrService');
const { sendMail } = require('../../common/services/mailService');
const { sendWorkbook } = require('../../common/services/exportService');
const { createPdfDocument, addDocumentHeader, addRecordBlock, addEmptyState, finalizePdf } = require('../../common/services/pdfService');

const isStaffUser = (user) => user?.role === 'admin' || user?.role === 'staff';

const isReservationOwner = (reservation, user) => {
    if (!user) {
        return false;
    }

    return !!reservation.customerEmail && reservation.customerEmail === user.email;
};

const validateReservation = [
    body('tableId').notEmpty().withMessage('Table is required').isInt({ min: 1 }).withMessage('Table must be valid'),
    body('customerName').trim().notEmpty().withMessage('Customer name is required').isLength({ max: 100 }).withMessage('Customer name is too long'),
    body('customerPhone').trim().notEmpty().withMessage('Customer phone is required').matches(/^\+?\d{9,15}$/).withMessage('Phone number must contain 9 to 15 digits'),
    body('customerEmail').optional({ values: 'falsy' }).isEmail().withMessage('Customer email must be valid'),
    body('partySize').notEmpty().withMessage('Party size is required').isInt({ min: 1 }).withMessage('Party size must be at least 1'),
    body('reservationDate').notEmpty().withMessage('Reservation date is required').isISO8601().withMessage('Reservation date must be valid'),
    body('reservationTime').notEmpty().withMessage('Reservation time is required'),
    body('duration').optional({ values: 'falsy' }).isInt({ min: 15, max: 480 }).withMessage('Duration must be between 15 and 480 minutes'),
    body('status').optional().isIn(['confirmed', 'pending', 'cancelled', 'completed', 'no_show']).withMessage('Invalid reservation status'),
    body('specialRequests').optional({ values: 'falsy' }).isLength({ max: 500 }).withMessage('Special requests are too long')
];

const validateReservationUpdate = [
    body('tableId').optional().isInt({ min: 1 }).withMessage('Table must be valid'),
    body('customerName').optional().trim().notEmpty().withMessage('Customer name is required').isLength({ max: 100 }).withMessage('Customer name is too long'),
    body('customerPhone').optional().trim().matches(/^\+?\d{9,15}$/).withMessage('Phone number must contain 9 to 15 digits'),
    body('customerEmail').optional({ values: 'falsy' }).isEmail().withMessage('Customer email must be valid'),
    body('partySize').optional().isInt({ min: 1 }).withMessage('Party size must be at least 1'),
    body('reservationDate').optional().isISO8601().withMessage('Reservation date must be valid'),
    body('reservationTime').optional(),
    body('duration').optional({ values: 'falsy' }).isInt({ min: 15, max: 480 }).withMessage('Duration must be between 15 and 480 minutes'),
    body('status').optional().isIn(['confirmed', 'pending', 'cancelled', 'completed', 'no_show']).withMessage('Invalid reservation status'),
    body('specialRequests').optional({ values: 'falsy' }).isLength({ max: 500 }).withMessage('Special requests are too long')
];

// generate unique reservation number
const generateReservationNumber = () => {
    const timestamp = Date.now().toString(36).toUpperCase();
    const random = Math.random().toString(36).substring(2, 5).toUpperCase();
    return `RES-${timestamp}-${random}`;
};

const generateReservationQrToken = () => {
    const timestamp = Date.now().toString(36).toUpperCase();
    const random = Math.random().toString(36).substring(2, 8).toUpperCase();
    return `RSV-${timestamp}-${random}`;
};

const timeToMinutes = (timeString) => {
    const [hours, minutes] = String(timeString).split(':').map(Number);
    return (hours * 60) + minutes;
};

const hasConflict = async ({ tableId, reservationDate, reservationTime, duration, excludeId = null }) => {
    const reservations = await Reservation.findAll({
        where: {
            tableId,
            reservationDate,
            status: { [Op.notIn]: ['cancelled', 'completed', 'no_show'] },
            ...(excludeId ? { id: { [Op.ne]: excludeId } } : {})
        }
    });

    const start = timeToMinutes(reservationTime);
    const end = start + Number(duration || 60);

    return reservations.some((reservation) => {
        const bookedStart = timeToMinutes(reservation.reservationTime);
        const bookedEnd = bookedStart + Number(reservation.duration || 60);
        return start < bookedEnd && end > bookedStart;
    });
};

const buildReservationQrValue = (reservation, table) => {
    return [
        `Reservation: ${reservation.reservationNumber}`,
        `Token: ${reservation.qrToken}`,
        `Customer: ${reservation.customerName}`,
        `Table: ${table.tableNumber}`
    ].join('\n');
};

const buildReservationEmailHtml = (reservation, table, qrDataUrl) => {
    return `
        <div style="font-family: Arial, sans-serif; color: #0f172a;">
            <h2>CafeSync Reservation Confirmation</h2>
            <p>Hello ${reservation.customerName},</p>
            <p>Your reservation is confirmed for Table ${table.tableNumber}.</p>
            <p>Date: ${reservation.reservationDate}</p>
            <p>Time: ${reservation.reservationTime}</p>
            <p>Party Size: ${reservation.partySize}</p>
            <p>Status: ${reservation.status}</p>
            <p>Please keep the QR code below for quick verification:</p>
            <img src="${qrDataUrl}" alt="Reservation QR" style="width: 180px; height: 180px;" />
        </div>
    `;
};

// create a new reservation
const createReservation = async (req, res) => {
    const validationResponse = handleValidationErrors(req, res);
    if (validationResponse) return validationResponse;

    try {
        const { tableId, customerName, customerPhone, customerEmail, partySize, reservationDate, reservationTime, duration, specialRequests, status } = req.body;
        const isCustomer = req.user?.role === 'customer';
        const table = await Table.findByPk(tableId);
        if (!table) {
            return res.status(404).json({ message: 'Table not found' });
        }

        if (isCustomer && customerEmail && customerEmail !== req.user.email) {
            return res.status(403).json({ message: 'Customers can only create reservations using their own account email' });
        }
        if (partySize > table.seatingCapacity) {
            return res.status(400).json({ message: `Party size exceeds table capacity of ${table.seatingCapacity}` });
        }

        const today = new Date();
        today.setHours(0, 0, 0, 0);
        if (new Date(reservationDate) < today) {
            return res.status(400).json({ message: 'Reservation date cannot be in the past' });
        }

        const durationValue = Number(duration || 60);
        const reservationConflict = await hasConflict({
            tableId,
            reservationDate,
            reservationTime,
            duration: durationValue
        });

        if (reservationConflict) {
            return res.status(400).json({ message: 'This table is already reserved for the selected time range' });
        }

        const reservationNumber = generateReservationNumber();
        const qrToken = generateReservationQrToken();

        const reservation = await Reservation.create({
            reservationNumber,
            tableId,
            customerName,
            customerPhone,
            customerEmail: isCustomer ? req.user.email : customerEmail,
            partySize,
            reservationDate,
            reservationTime,
            duration: durationValue,
            specialRequests,
            status: status || 'confirmed',
            qrToken
        });

        const fullReservation = await Reservation.findByPk(reservation.id, { include: [{ model: Table, as: 'table' }] });
        res.status(201).json({ message: 'Reservation created successfully', reservation: fullReservation });
    } catch (error) {
        res.status(500).json({ message: 'Failed to create reservation', error: error.message });
    }
};

// get all reservations
const getAllReservations = async (req, res) => {
    try {
        const whereClause = {};
        if (isStaffUser(req.user)) {
            if (req.query.status) whereClause.status = req.query.status;
            if (req.query.date) whereClause.reservationDate = req.query.date;
            if (req.query.email) whereClause.customerEmail = req.query.email;
            if (req.query.phone) whereClause.customerPhone = req.query.phone;
        } else {
            whereClause.customerEmail = req.user.email;
        }

        const reservations = await Reservation.findAll({
            where: whereClause,
            include: [{ model: Table, as: 'table' }],
            order: [['reservationDate', 'DESC'], ['reservationTime', 'ASC']]
        });
        res.json(reservations);
    } catch (error) {
        res.status(500).json({ message: 'Failed to fetch reservations', error: error.message });
    }
};

// get single reservation by id
const getReservationById = async (req, res) => {
    try {
        const reservation = await Reservation.findByPk(req.params.id, { include: [{ model: Table, as: 'table' }] });
        if (!reservation) {
            return res.status(404).json({ message: 'Reservation not found' });
        }

        if (!isStaffUser(req.user) && !isReservationOwner(reservation, req.user)) {
            return res.status(403).json({ message: 'Access denied for this reservation' });
        }

        res.json(reservation);
    } catch (error) {
        res.status(500).json({ message: 'Failed to fetch reservation', error: error.message });
    }
};

const getReservationQr = async (req, res) => {
    try {
        const reservation = await Reservation.findByPk(req.params.id, { include: [{ model: Table, as: 'table' }] });
        if (!reservation) {
            return res.status(404).json({ message: 'Reservation not found' });
        }

        const qrDataUrl = await generateQrDataUrl(buildReservationQrValue(reservation, reservation.table));
        return res.json({
            reservationNumber: reservation.reservationNumber,
            qrToken: reservation.qrToken,
            qrDataUrl
        });
    } catch (error) {
        return res.status(500).json({ message: 'Failed to generate reservation QR', error: error.message });
    }
};

const sendReservationEmail = async (req, res) => {
    try {
        const reservation = await Reservation.findByPk(req.params.id, { include: [{ model: Table, as: 'table' }] });
        if (!reservation) {
            return res.status(404).json({ message: 'Reservation not found' });
        }

        if (!reservation.customerEmail) {
            return res.status(400).json({ message: 'Customer email is required before sending reservation confirmation' });
        }

        const qrDataUrl = await generateQrDataUrl(buildReservationQrValue(reservation, reservation.table));
        const result = await sendMail({
            to: reservation.customerEmail,
            subject: `CafeSync Reservation ${reservation.reservationNumber}`,
            html: buildReservationEmailHtml(reservation, reservation.table, qrDataUrl),
            text: `Reservation ${reservation.reservationNumber} confirmed for Table ${reservation.table.tableNumber}`
        });

        if (!result.sent) {
            return res.status(400).json({ message: result.message });
        }

        return res.json({ message: 'Reservation email sent successfully' });
    } catch (error) {
        return res.status(500).json({ message: 'Failed to send reservation email', error: error.message });
    }
};

const exportReservations = async (req, res) => {
    try {
        const reservations = await Reservation.findAll({
            include: [{ model: Table, as: 'table' }],
            order: [['reservationDate', 'DESC'], ['reservationTime', 'ASC']]
        });

        const rows = reservations.map((reservation) => ({
            ReservationNumber: reservation.reservationNumber,
            CustomerName: reservation.customerName,
            CustomerPhone: reservation.customerPhone,
            CustomerEmail: reservation.customerEmail || '',
            TableNumber: reservation.table?.tableNumber || '',
            PartySize: reservation.partySize,
            ReservationDate: reservation.reservationDate,
            ReservationTime: reservation.reservationTime,
            Duration: reservation.duration,
            Status: reservation.status,
            QrToken: reservation.qrToken || ''
        }));

        return sendWorkbook(res, 'reservations-report.xlsx', [
            { name: 'Reservations', rows }
        ]);
    } catch (error) {
        return res.status(500).json({ message: 'Failed to export reservations', error: error.message });
    }
};

const exportReservationsPdf = async (req, res) => {
    try {
        const reservations = await Reservation.findAll({
            include: [{ model: Table, as: 'table' }],
            order: [['reservationDate', 'DESC'], ['reservationTime', 'ASC']]
        });

        const doc = createPdfDocument(res, 'reservations-report.pdf');
        addDocumentHeader(doc, 'CafeSync Reservations Report', `Total reservations: ${reservations.length}`);

        if (!reservations.length) {
            addEmptyState(doc, 'No reservations are available right now.');
            return finalizePdf(doc);
        }

        reservations.forEach((reservation) => {
            addRecordBlock(doc, reservation.reservationNumber, [
                { label: 'Customer Name', value: reservation.customerName },
                { label: 'Customer Email', value: reservation.customerEmail || '-' },
                { label: 'Customer Phone', value: reservation.customerPhone },
                { label: 'Table Number', value: reservation.table?.tableNumber || '-' },
                { label: 'Party Size', value: String(reservation.partySize) },
                { label: 'Date', value: reservation.reservationDate },
                { label: 'Time', value: reservation.reservationTime },
                { label: 'Duration', value: `${reservation.duration || 60} minutes` },
                { label: 'Status', value: reservation.status }
            ]);
        });

        return finalizePdf(doc);
    } catch (error) {
        return res.status(500).json({ message: 'Failed to export reservations PDF', error: error.message });
    }
};

// update reservation
const updateReservation = async (req, res) => {
    const validationResponse = handleValidationErrors(req, res);
    if (validationResponse) return validationResponse;

    try {
        const reservation = await Reservation.findByPk(req.params.id);
        if (!reservation) {
            return res.status(404).json({ message: 'Reservation not found' });
        }

        const isCustomer = req.user?.role === 'customer';
        if (isCustomer && !isReservationOwner(reservation, req.user)) {
            return res.status(403).json({ message: 'Access denied for this reservation' });
        }

        const {
            tableId,
            customerName,
            customerPhone,
            customerEmail,
            partySize,
            reservationDate,
            reservationTime,
            duration,
            status,
            specialRequests
        } = req.body;

        if (isCustomer) {
            const providedFields = Object.keys(req.body);
            const canCancelOnly = providedFields.length === 1 && status === 'cancelled';
            if (!canCancelOnly) {
                return res.status(403).json({ message: 'Customers can only cancel their own reservations' });
            }
        }

        const nextTableId = tableId || reservation.tableId;
        const nextDate = reservationDate || reservation.reservationDate;
        const nextTime = reservationTime || reservation.reservationTime;
        const nextDuration = Number(duration || reservation.duration || 60);

        const table = await Table.findByPk(nextTableId);
        if (!table) {
            return res.status(404).json({ message: 'Table not found' });
        }

        if ((partySize || reservation.partySize) > table.seatingCapacity) {
            return res.status(400).json({ message: `Party size exceeds table capacity of ${table.seatingCapacity}` });
        }

        const reservationConflict = await hasConflict({
            tableId: nextTableId,
            reservationDate: nextDate,
            reservationTime: nextTime,
            duration: nextDuration,
            excludeId: reservation.id
        });

        if (reservationConflict) {
            return res.status(400).json({ message: 'This table is already reserved for the selected time range' });
        }

        await reservation.update({
            tableId: nextTableId,
            customerName: customerName || reservation.customerName,
            customerPhone: customerPhone || reservation.customerPhone,
            customerEmail: customerEmail !== undefined ? customerEmail : reservation.customerEmail,
            partySize: partySize || reservation.partySize,
            reservationDate: nextDate,
            reservationTime: nextTime,
            duration: nextDuration,
            status: status || reservation.status,
            specialRequests: specialRequests !== undefined ? specialRequests : reservation.specialRequests
        });

        const updated = await Reservation.findByPk(reservation.id, { include: [{ model: Table, as: 'table' }] });
        res.json({ message: 'Reservation updated successfully', reservation: updated });
    } catch (error) {
        res.status(500).json({ message: 'Failed to update reservation', error: error.message });
    }
};

// delete reservation
const deleteReservation = async (req, res) => {
    try {
        const reservation = await Reservation.findByPk(req.params.id);
        if (!reservation) {
            return res.status(404).json({ message: 'Reservation not found' });
        }

        if (!isStaffUser(req.user) && !isReservationOwner(reservation, req.user)) {
            return res.status(403).json({ message: 'Access denied for this reservation' });
        }

        await reservation.destroy();
        res.json({ message: 'Reservation deleted successfully' });
    } catch (error) {
        res.status(500).json({ message: 'Failed to delete reservation', error: error.message });
    }
};

module.exports = {
    validateReservation,
    validateReservationUpdate,
    createReservation,
    getAllReservations,
    getReservationById,
    getReservationQr,
    sendReservationEmail,
    exportReservations,
    exportReservationsPdf,
    updateReservation,
    deleteReservation
};

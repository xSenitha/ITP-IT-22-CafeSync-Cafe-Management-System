// Table & Reservation routes - Peiris (IT24100953)
const express = require('express');
const router = express.Router();
const { validateTable, createTable, getAllTables, getTableById, updateTable, deleteTable, exportTablesPdf } = require('../controllers/tableController');
const { validateReservation, validateReservationUpdate, createReservation, getAllReservations, getReservationById, getReservationQr, sendReservationEmail, exportReservations, exportReservationsPdf, updateReservation, deleteReservation } = require('../controllers/reservationController');
const { authMiddleware, staffOrAdminMiddleware } = require('../../middleware/auth');

// table routes - full CRUD
router.post('/tables', authMiddleware, staffOrAdminMiddleware, validateTable, createTable);
router.get('/tables', getAllTables);
router.get('/tables/export/pdf', authMiddleware, staffOrAdminMiddleware, exportTablesPdf);
router.get('/tables/:id', getTableById);
router.put('/tables/:id', authMiddleware, staffOrAdminMiddleware, validateTable, updateTable);
router.delete('/tables/:id', authMiddleware, staffOrAdminMiddleware, deleteTable);

// reservation routes - full CRUD
router.get('/reservations/export/file', authMiddleware, staffOrAdminMiddleware, exportReservations);
router.get('/reservations/export/pdf', authMiddleware, staffOrAdminMiddleware, exportReservationsPdf);
router.post('/reservations', authMiddleware, validateReservation, createReservation);
router.get('/reservations', authMiddleware, getAllReservations);
router.get('/reservations/:id/qr', authMiddleware, staffOrAdminMiddleware, getReservationQr);
router.post('/reservations/:id/send-email', authMiddleware, staffOrAdminMiddleware, sendReservationEmail);
router.get('/reservations/:id', authMiddleware, getReservationById);
router.put('/reservations/:id', authMiddleware, validateReservationUpdate, updateReservation);
router.delete('/reservations/:id', authMiddleware, deleteReservation);

module.exports = router;

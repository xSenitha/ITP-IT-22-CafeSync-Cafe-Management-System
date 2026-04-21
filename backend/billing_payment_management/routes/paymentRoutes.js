// Billing & Payment routes - Bandara (IT24104140)
const express = require('express');
const router = express.Router();
const { validatePayment, createPayment, getAllPayments, getMyPayments, getPaymentById, getPaymentByOrder, updatePayment, deletePayment, exportPayments, exportPaymentsPdf } = require('../controllers/paymentController');
const { validateInvoice, createInvoice, getAllInvoices, getInvoiceById, getInvoiceQr, sendInvoiceEmail, updateInvoice, deleteInvoice, exportInvoices, downloadInvoicePdf, exportInvoicesPdf } = require('../controllers/invoiceController');
const { authMiddleware, staffOrAdminMiddleware } = require('../../middleware/auth');

// invoice routes
router.get('/invoices/export/file', authMiddleware, staffOrAdminMiddleware, exportInvoices);
router.get('/invoices/export/pdf', authMiddleware, staffOrAdminMiddleware, exportInvoicesPdf);
router.post('/invoices', authMiddleware, staffOrAdminMiddleware, validateInvoice, createInvoice);
router.get('/invoices', authMiddleware, staffOrAdminMiddleware, getAllInvoices);
router.get('/invoices/:id/pdf', authMiddleware, staffOrAdminMiddleware, downloadInvoicePdf);
router.get('/invoices/:id', authMiddleware, staffOrAdminMiddleware, getInvoiceById);
router.get('/invoices/:id/qr', authMiddleware, staffOrAdminMiddleware, getInvoiceQr);
router.post('/invoices/:id/send-email', authMiddleware, staffOrAdminMiddleware, sendInvoiceEmail);
router.put('/invoices/:id', authMiddleware, staffOrAdminMiddleware, validateInvoice, updateInvoice);
router.delete('/invoices/:id', authMiddleware, staffOrAdminMiddleware, deleteInvoice);

// payment by order - for auto-fill (before /:id to avoid conflict)
router.get('/order/:orderId', authMiddleware, staffOrAdminMiddleware, getPaymentByOrder);
router.get('/mine', authMiddleware, getMyPayments);
router.get('/export/file', authMiddleware, staffOrAdminMiddleware, exportPayments);
router.get('/export/pdf', authMiddleware, staffOrAdminMiddleware, exportPaymentsPdf);

// payment routes - full CRUD
router.post('/', authMiddleware, staffOrAdminMiddleware, validatePayment, createPayment);
router.get('/', authMiddleware, staffOrAdminMiddleware, getAllPayments);
router.get('/:id', authMiddleware, staffOrAdminMiddleware, getPaymentById);
router.put('/:id', authMiddleware, staffOrAdminMiddleware, validatePayment, updatePayment);
router.delete('/:id', authMiddleware, staffOrAdminMiddleware, deletePayment);

module.exports = router;

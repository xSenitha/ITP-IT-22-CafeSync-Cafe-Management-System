// Order management routes - Gihen (IT24103788)
const express = require('express');
const router = express.Router();
const { validateOrder, validateOrderItem, createOrder, getAllOrders, getOrderById, getOrderQr, getOrderByQrToken, sendOrderConfirmation, exportOrders, exportOrdersPdf, updateOrder, deleteOrder } = require('../controllers/orderController');
const { addOrderItem, getOrderItems, updateOrderItem, deleteOrderItem } = require('../controllers/orderItemController');
const { authMiddleware, optionalAuth, staffOrAdminMiddleware } = require('../../middleware/auth');

// order item routes
router.post('/items', authMiddleware, staffOrAdminMiddleware, validateOrderItem, addOrderItem);
router.get('/items/:orderId', authMiddleware, staffOrAdminMiddleware, getOrderItems);
router.put('/items/:id', authMiddleware, staffOrAdminMiddleware, validateOrderItem, updateOrderItem);
router.delete('/items/:id', authMiddleware, staffOrAdminMiddleware, deleteOrderItem);

// order routes - full CRUD
router.post('/', authMiddleware, validateOrder, createOrder);
router.get('/track/:qrToken', optionalAuth, getOrderByQrToken);
router.get('/export/file', authMiddleware, staffOrAdminMiddleware, exportOrders);
router.get('/export/pdf', authMiddleware, staffOrAdminMiddleware, exportOrdersPdf);
router.get('/', authMiddleware, getAllOrders);
router.get('/:id/qr', authMiddleware, getOrderQr);
router.post('/:id/send-email', authMiddleware, sendOrderConfirmation);
router.get('/:id', authMiddleware, getOrderById);
router.put('/:id', authMiddleware, staffOrAdminMiddleware, updateOrder);
router.delete('/:id', authMiddleware, staffOrAdminMiddleware, deleteOrder);

module.exports = router;

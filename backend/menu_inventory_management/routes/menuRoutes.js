// Menu & Inventory routes - Kasfbi (IT24102666)
const express = require('express');
const router = express.Router();
const { validateMenuItem, createMenuItem, getAllMenuItems, getMenuItemById, updateMenuItem, deleteMenuItem, exportMenuItemsPdf } = require('../controllers/menuItemController');
const { validateStock, createStock, getAllStock, getStockById, updateStock, deleteStock, getLowStockAlerts, exportStock, exportStockPdf, sendLowStockEmail } = require('../controllers/stockController');
const { authMiddleware, staffOrAdminMiddleware } = require('../../middleware/auth');
const upload = require('../../middleware/upload');

// menu item routes - full CRUD
router.post('/items', authMiddleware, staffOrAdminMiddleware, upload.single('image'), validateMenuItem, createMenuItem);
router.get('/items', getAllMenuItems);
router.get('/items/export/pdf', authMiddleware, staffOrAdminMiddleware, exportMenuItemsPdf);
router.get('/items/:id', getMenuItemById);
router.put('/items/:id', authMiddleware, staffOrAdminMiddleware, upload.single('image'), validateMenuItem, updateMenuItem);
router.delete('/items/:id', authMiddleware, staffOrAdminMiddleware, deleteMenuItem);

// stock routes - full CRUD
router.get('/stock/export/file', authMiddleware, staffOrAdminMiddleware, exportStock);
router.get('/stock/export/pdf', authMiddleware, staffOrAdminMiddleware, exportStockPdf);
router.post('/stock/alerts/email', authMiddleware, staffOrAdminMiddleware, sendLowStockEmail);
router.post('/stock', authMiddleware, staffOrAdminMiddleware, validateStock, createStock);
router.get('/stock', authMiddleware, staffOrAdminMiddleware, getAllStock);
router.get('/stock/alerts', authMiddleware, staffOrAdminMiddleware, getLowStockAlerts);
router.get('/stock/:id', authMiddleware, staffOrAdminMiddleware, getStockById);
router.put('/stock/:id', authMiddleware, staffOrAdminMiddleware, validateStock, updateStock);
router.delete('/stock/:id', authMiddleware, staffOrAdminMiddleware, deleteStock);

module.exports = router;

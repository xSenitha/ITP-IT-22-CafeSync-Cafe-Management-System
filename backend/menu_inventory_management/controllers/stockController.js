// Stock controller - Kasfbi (IT24102666) - CRUD operations for inventory stock
const { body } = require('express-validator');
const { Op } = require('sequelize');
const Stock = require('../models/Stock');
const { handleValidationErrors } = require('../../common/utils/validation');
const { sendWorkbook } = require('../../common/services/exportService');
const { sendMail } = require('../../common/services/mailService');
const { createPdfDocument, addDocumentHeader, addRecordBlock, addEmptyState, finalizePdf } = require('../../common/services/pdfService');

const validateStock = [
    body('ingredientName').trim().notEmpty().withMessage('Ingredient name is required').isLength({ max: 100 }).withMessage('Ingredient name is too long'),
    body('category').optional().isIn(['dairy', 'meat', 'vegetable', 'fruit', 'grain', 'spice', 'beverage', 'other']).withMessage('Invalid stock category'),
    body('quantity').notEmpty().withMessage('Quantity is required').isFloat({ min: 0 }).withMessage('Quantity cannot be negative'),
    body('unit').optional().isIn(['kg', 'g', 'l', 'ml', 'pieces', 'packets']).withMessage('Invalid unit selected'),
    body('minimumStock').optional().isFloat({ min: 0 }).withMessage('Minimum stock cannot be negative'),
    body('unitPrice').notEmpty().withMessage('Unit price is required').isFloat({ min: 0.01 }).withMessage('Unit price must be greater than 0'),
    body('supplier').optional({ values: 'falsy' }).isLength({ max: 100 }).withMessage('Supplier name is too long'),
    body('expiryDate').optional({ values: 'falsy' }).isISO8601().withMessage('Expiry date must be valid')
];

const resolveStockStatus = (quantity, minimumStock) => {
    if (quantity <= 0) return 'out_of_stock';
    if (quantity <= minimumStock) return 'low_stock';
    return 'in_stock';
};

const normalizeExpiryDate = (expiryDate) => {
    if (expiryDate === undefined) {
        return undefined;
    }

    if (expiryDate === null || expiryDate === '') {
        return null;
    }

    return expiryDate;
};

// create a new stock item
const createStock = async (req, res) => {
    const validationResponse = handleValidationErrors(req, res);
    if (validationResponse) return validationResponse;

    try {
        const { ingredientName, category, quantity, unit, minimumStock, unitPrice, supplier, expiryDate } = req.body;
        const quantityValue = parseFloat(quantity);
        const minimumValue = parseFloat(minimumStock || 10);
        const unitPriceValue = parseFloat(unitPrice);
        const status = resolveStockStatus(quantityValue, minimumValue);

        const stock = await Stock.create({
            ingredientName: ingredientName.trim(),
            category: category || 'other',
            quantity: quantityValue,
            unit: unit || 'kg',
            minimumStock: minimumValue,
            unitPrice: unitPriceValue,
            supplier: supplier || null,
            expiryDate: normalizeExpiryDate(expiryDate),
            status
        });
        res.status(201).json({ message: 'Stock item created successfully', stock });
    } catch (error) {
        res.status(500).json({ message: 'Failed to create stock item', error: error.message });
    }
};

// get all stock items
const getAllStock = async (req, res) => {
    try {
        // support status filter
        const whereClause = {};
        if (req.query.status) {
            whereClause.status = req.query.status;
        }
        if (req.query.category) {
            whereClause.category = req.query.category;
        }
        const stocks = await Stock.findAll({ where: whereClause, order: [['ingredientName', 'ASC']] });
        res.json(stocks);
    } catch (error) {
        res.status(500).json({ message: 'Failed to fetch stock items', error: error.message });
    }
};

// get single stock item by id
const getStockById = async (req, res) => {
    try {
        const stock = await Stock.findByPk(req.params.id);
        if (!stock) {
            return res.status(404).json({ message: 'Stock item not found' });
        }
        res.json(stock);
    } catch (error) {
        res.status(500).json({ message: 'Failed to fetch stock item', error: error.message });
    }
};

// update stock item
const updateStock = async (req, res) => {
    const validationResponse = handleValidationErrors(req, res);
    if (validationResponse) return validationResponse;

    try {
        const stock = await Stock.findByPk(req.params.id);
        if (!stock) {
            return res.status(404).json({ message: 'Stock item not found' });
        }
        const { ingredientName, category, quantity, unit, minimumStock, unitPrice, supplier, expiryDate } = req.body;
        const newQuantity = quantity !== undefined ? parseFloat(quantity) : parseFloat(stock.quantity);
        const newMinimumStock = minimumStock !== undefined ? parseFloat(minimumStock) : parseFloat(stock.minimumStock);
        const newUnitPrice = unitPrice !== undefined ? parseFloat(unitPrice) : parseFloat(stock.unitPrice);
        const status = resolveStockStatus(newQuantity, newMinimumStock);

        await stock.update({
            ingredientName: ingredientName ? ingredientName.trim() : stock.ingredientName,
            category: category || stock.category,
            quantity: newQuantity,
            unit: unit || stock.unit,
            minimumStock: newMinimumStock,
            unitPrice: newUnitPrice,
            supplier: supplier !== undefined ? (supplier || null) : stock.supplier,
            expiryDate: normalizeExpiryDate(expiryDate) !== undefined ? normalizeExpiryDate(expiryDate) : stock.expiryDate,
            status
        });
        res.json({ message: 'Stock item updated successfully', stock });
    } catch (error) {
        res.status(500).json({ message: 'Failed to update stock item', error: error.message });
    }
};

// delete stock item
const deleteStock = async (req, res) => {
    try {
        const stock = await Stock.findByPk(req.params.id);
        if (!stock) {
            return res.status(404).json({ message: 'Stock item not found' });
        }
        await stock.destroy();
        res.json({ message: 'Stock item deleted successfully' });
    } catch (error) {
        res.status(500).json({ message: 'Failed to delete stock item', error: error.message });
    }
};

// get low stock alerts
const getLowStockAlerts = async (req, res) => {
    try {
        const lowStock = await Stock.findAll({
            where: { status: { [Op.in]: ['low_stock', 'out_of_stock'] } },
            order: [['quantity', 'ASC']]
        });
        res.json(lowStock);
    } catch (error) {
        res.status(500).json({ message: 'Failed to fetch low stock alerts', error: error.message });
    }
};

const exportStock = async (req, res) => {
    try {
        const stocks = await Stock.findAll({ order: [['ingredientName', 'ASC']] });
        const rows = stocks.map((stock) => ({
            IngredientName: stock.ingredientName,
            Category: stock.category,
            Quantity: Number(stock.quantity),
            Unit: stock.unit,
            MinimumStock: Number(stock.minimumStock),
            UnitPrice: Number(stock.unitPrice),
            Supplier: stock.supplier || '',
            ExpiryDate: stock.expiryDate || '',
            Status: stock.status
        }));

        return sendWorkbook(res, 'stock-report.xlsx', [
            { name: 'Stock', rows }
        ]);
    } catch (error) {
        return res.status(500).json({ message: 'Failed to export stock items', error: error.message });
    }
};

const exportStockPdf = async (req, res) => {
    try {
        const stocks = await Stock.findAll({ order: [['ingredientName', 'ASC']] });
        const doc = createPdfDocument(res, 'stock-report.pdf');

        addDocumentHeader(doc, 'CafeSync Stock Report', `Total stock items: ${stocks.length}`);

        if (!stocks.length) {
            addEmptyState(doc, 'No stock items are available right now.');
            return finalizePdf(doc);
        }

        stocks.forEach((stock) => {
            addRecordBlock(doc, stock.ingredientName, [
                { label: 'Category', value: stock.category || 'other' },
                { label: 'Status', value: stock.status },
                { label: 'Quantity', value: `${Number(stock.quantity)} ${stock.unit}` },
                { label: 'Minimum Stock', value: `${Number(stock.minimumStock)} ${stock.unit}` },
                { label: 'Unit Price', value: `LKR ${Number(stock.unitPrice).toFixed(2)}` },
                { label: 'Supplier', value: stock.supplier || '-' },
                { label: 'Expiry Date', value: stock.expiryDate || '-' }
            ]);
        });

        return finalizePdf(doc);
    } catch (error) {
        return res.status(500).json({ message: 'Failed to export stock PDF', error: error.message });
    }
};

const sendLowStockEmail = async (req, res) => {
    try {
        const lowStockItems = await Stock.findAll({
            where: { status: { [Op.in]: ['low_stock', 'out_of_stock'] } },
            order: [['quantity', 'ASC']]
        });

        if (!lowStockItems.length) {
            return res.status(400).json({ message: 'There are no low stock items to email right now' });
        }

        const targetEmail = process.env.ALERT_EMAIL || process.env.MAIL_FROM;
        if (!targetEmail) {
            return res.status(400).json({ message: 'Add ALERT_EMAIL or MAIL_FROM in backend .env before sending alerts' });
        }

        const htmlRows = lowStockItems.map((item) => `
            <tr>
                <td style="padding: 8px; border: 1px solid #cbd5e1;">${item.ingredientName}</td>
                <td style="padding: 8px; border: 1px solid #cbd5e1;">${item.quantity} ${item.unit}</td>
                <td style="padding: 8px; border: 1px solid #cbd5e1;">${item.minimumStock}</td>
                <td style="padding: 8px; border: 1px solid #cbd5e1;">${item.status}</td>
            </tr>
        `).join('');

        const result = await sendMail({
            to: targetEmail,
            subject: 'CafeSync Low Stock Alert',
            html: `
                <div style="font-family: Arial, sans-serif; color: #0f172a;">
                    <h2>Low Stock Alert</h2>
                    <p>The following stock items need attention:</p>
                    <table style="border-collapse: collapse; width: 100%;">
                        <thead>
                            <tr>
                                <th style="padding: 8px; border: 1px solid #cbd5e1;">Item</th>
                                <th style="padding: 8px; border: 1px solid #cbd5e1;">Current Qty</th>
                                <th style="padding: 8px; border: 1px solid #cbd5e1;">Minimum</th>
                                <th style="padding: 8px; border: 1px solid #cbd5e1;">Status</th>
                            </tr>
                        </thead>
                        <tbody>${htmlRows}</tbody>
                    </table>
                </div>
            `,
            text: `Low stock items: ${lowStockItems.map((item) => item.ingredientName).join(', ')}`
        });

        if (!result.sent) {
            return res.status(400).json({ message: result.message });
        }

        return res.json({ message: 'Low stock email sent successfully' });
    } catch (error) {
        return res.status(500).json({ message: 'Failed to send low stock email', error: error.message });
    }
};

module.exports = {
    validateStock,
    createStock,
    getAllStock,
    getStockById,
    updateStock,
    deleteStock,
    getLowStockAlerts,
    exportStock,
    exportStockPdf,
    sendLowStockEmail
};

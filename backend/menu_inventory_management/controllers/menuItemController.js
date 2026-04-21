// MenuItem controller - Kasfbi (IT24102666) - CRUD operations for menu items
const { body } = require('express-validator');
const MenuItem = require('../models/MenuItem');
const { handleValidationErrors } = require('../../common/utils/validation');
const { createPdfDocument, addDocumentHeader, addRecordBlock, addEmptyState, finalizePdf } = require('../../common/services/pdfService');

const validateMenuItem = [
    body('name').trim().notEmpty().withMessage('Menu item name is required').isLength({ max: 100 }).withMessage('Menu item name is too long'),
    body('description').optional({ values: 'falsy' }).isLength({ max: 1000 }).withMessage('Description is too long'),
    body('category').isIn(['appetizer', 'main_course', 'dessert', 'beverage', 'snack', 'special']).withMessage('Invalid category selected'),
    body('price').notEmpty().withMessage('Price is required').isFloat({ min: 0.01 }).withMessage('Price must be greater than 0'),
    body('preparationTime').optional({ values: 'falsy' }).isInt({ min: 1, max: 300 }).withMessage('Preparation time must be between 1 and 300 minutes')
];

// create a new menu item
const createMenuItem = async (req, res) => {
    const validationResponse = handleValidationErrors(req, res);
    if (validationResponse) return validationResponse;

    try {
        const { name, description, category, price, isAvailable, preparationTime } = req.body;
        const image = req.file ? `/uploads/menu/${req.file.filename}` : (req.body.image || null);
        // check if item name already exists
        const existing = await MenuItem.findOne({ where: { name } });
        if (existing) {
            return res.status(400).json({ message: 'Menu item with this name already exists' });
        }
        // create menu item
        const menuItem = await MenuItem.create({
            name,
            description,
            category,
            price,
            image,
            isAvailable: isAvailable !== undefined ? isAvailable : true,
            preparationTime: preparationTime || null
        });
        res.status(201).json({ message: 'Menu item created successfully', menuItem });
    } catch (error) {
        res.status(500).json({ message: 'Failed to create menu item', error: error.message });
    }
};

// get all menu items
const getAllMenuItems = async (req, res) => {
    try {
        // support category filter via query param
        const whereClause = {};
        if (req.query.category) {
            whereClause.category = req.query.category;
        }
        if (req.query.available) {
            whereClause.isAvailable = req.query.available === 'true';
        }
        const menuItems = await MenuItem.findAll({ where: whereClause, order: [['category', 'ASC'], ['name', 'ASC']] });
        res.json(menuItems);
    } catch (error) {
        res.status(500).json({ message: 'Failed to fetch menu items', error: error.message });
    }
};

// get single menu item by id
const getMenuItemById = async (req, res) => {
    try {
        const menuItem = await MenuItem.findByPk(req.params.id);
        if (!menuItem) {
            return res.status(404).json({ message: 'Menu item not found' });
        }
        res.json(menuItem);
    } catch (error) {
        res.status(500).json({ message: 'Failed to fetch menu item', error: error.message });
    }
};

// update menu item
const updateMenuItem = async (req, res) => {
    const validationResponse = handleValidationErrors(req, res);
    if (validationResponse) return validationResponse;

    try {
        const menuItem = await MenuItem.findByPk(req.params.id);
        if (!menuItem) {
            return res.status(404).json({ message: 'Menu item not found' });
        }
        const { name, description, category, price, isAvailable, preparationTime } = req.body;
        const image = req.file ? `/uploads/menu/${req.file.filename}` : (req.body.image || menuItem.image);
        // update menu item
        await menuItem.update({
            name: name || menuItem.name,
            description: description !== undefined ? description : menuItem.description,
            category: category || menuItem.category,
            price: price !== undefined ? price : menuItem.price,
            image,
            isAvailable: isAvailable !== undefined ? isAvailable : menuItem.isAvailable,
            preparationTime: preparationTime !== undefined ? preparationTime : menuItem.preparationTime
        });
        res.json({ message: 'Menu item updated successfully', menuItem });
    } catch (error) {
        res.status(500).json({ message: 'Failed to update menu item', error: error.message });
    }
};

// delete menu item
const deleteMenuItem = async (req, res) => {
    try {
        const menuItem = await MenuItem.findByPk(req.params.id);
        if (!menuItem) {
            return res.status(404).json({ message: 'Menu item not found' });
        }
        await menuItem.destroy();
        res.json({ message: 'Menu item deleted successfully' });
    } catch (error) {
        res.status(500).json({ message: 'Failed to delete menu item', error: error.message });
    }
};

const exportMenuItemsPdf = async (req, res) => {
    try {
        const menuItems = await MenuItem.findAll({ order: [['category', 'ASC'], ['name', 'ASC']] });
        const doc = createPdfDocument(res, 'menu-items-report.pdf');

        addDocumentHeader(doc, 'CafeSync Menu Items Report', `Total menu items: ${menuItems.length}`);

        if (!menuItems.length) {
            addEmptyState(doc, 'No menu items are available right now.');
            return finalizePdf(doc);
        }

        menuItems.forEach((menuItem) => {
            addRecordBlock(doc, menuItem.name, [
                { label: 'Category', value: menuItem.category?.replace('_', ' ') || '-' },
                { label: 'Availability', value: menuItem.isAvailable ? 'Available' : 'Unavailable' },
                { label: 'Price', value: `LKR ${Number(menuItem.price).toFixed(2)}` },
                { label: 'Preparation Time', value: menuItem.preparationTime ? `${menuItem.preparationTime} minutes` : '-' },
                { label: 'Description', value: menuItem.description || '-' }
            ]);
        });

        return finalizePdf(doc);
    } catch (error) {
        return res.status(500).json({ message: 'Failed to export menu items PDF', error: error.message });
    }
};

module.exports = { validateMenuItem, createMenuItem, getAllMenuItems, getMenuItemById, updateMenuItem, deleteMenuItem, exportMenuItemsPdf };

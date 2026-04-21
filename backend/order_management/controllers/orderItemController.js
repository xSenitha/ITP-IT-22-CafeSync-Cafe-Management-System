// OrderItem controller - Gihen (IT24103788) - CRUD operations for order items
const OrderItem = require('../models/OrderItem');
const Order = require('../models/Order');
const { handleValidationErrors } = require('../../common/utils/validation');

const recalculateOrderTotal = async (orderId) => {
    const allItems = await OrderItem.findAll({ where: { orderId } });
    const newTotal = allItems.reduce((sum, item) => sum + parseFloat(item.totalPrice), 0);
    await Order.update({ totalAmount: newTotal }, { where: { id: orderId } });
};

// add item to an order
const addOrderItem = async (req, res) => {
    const validationResponse = handleValidationErrors(req, res);
    if (validationResponse) return validationResponse;

    try {
        const { orderId, itemName, quantity, unitPrice, specialInstructions } = req.body;
        // check if order exists
        const order = await Order.findByPk(orderId);
        if (!order) {
            return res.status(404).json({ message: 'Order not found' });
        }
        // calculate total price
        const totalPrice = quantity * unitPrice;
        // create the order item
        const orderItem = await OrderItem.create({ orderId, itemName, quantity, unitPrice, totalPrice, specialInstructions });
        await recalculateOrderTotal(orderId);
        res.status(201).json({ message: 'Item added to order', orderItem });
    } catch (error) {
        res.status(500).json({ message: 'Failed to add order item', error: error.message });
    }
};

// get all items for an order
const getOrderItems = async (req, res) => {
    try {
        const items = await OrderItem.findAll({
            where: { orderId: req.params.orderId },
            include: [{ model: Order, as: 'order' }]
        });
        res.json(items);
    } catch (error) {
        res.status(500).json({ message: 'Failed to fetch order items', error: error.message });
    }
};

// update an order item
const updateOrderItem = async (req, res) => {
    const validationResponse = handleValidationErrors(req, res);
    if (validationResponse) return validationResponse;

    try {
        const item = await OrderItem.findByPk(req.params.id);
        if (!item) {
            return res.status(404).json({ message: 'Order item not found' });
        }
        const { itemName, quantity, unitPrice, specialInstructions } = req.body;
        const totalPrice = (quantity || item.quantity) * (unitPrice || item.unitPrice);
        await item.update({ itemName, quantity, unitPrice, totalPrice, specialInstructions });
        await recalculateOrderTotal(item.orderId);
        res.json({ message: 'Order item updated', orderItem: item });
    } catch (error) {
        res.status(500).json({ message: 'Failed to update order item', error: error.message });
    }
};

// delete an order item
const deleteOrderItem = async (req, res) => {
    try {
        const item = await OrderItem.findByPk(req.params.id);
        if (!item) {
            return res.status(404).json({ message: 'Order item not found' });
        }
        const orderId = item.orderId;
        await item.destroy();
        await recalculateOrderTotal(orderId);
        res.json({ message: 'Order item deleted' });
    } catch (error) {
        res.status(500).json({ message: 'Failed to delete order item', error: error.message });
    }
};

module.exports = { addOrderItem, getOrderItems, updateOrderItem, deleteOrderItem };

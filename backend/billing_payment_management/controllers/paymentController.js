// Payment controller - Bandara (IT24104140) - CRUD operations for payments
const { body } = require('express-validator');
const { Op } = require('sequelize');
const Payment = require('../models/Payment');
const Invoice = require('../models/Invoice');
const Order = require('../../order_management/models/Order');
const { handleValidationErrors } = require('../../common/utils/validation');
const { sendWorkbook } = require('../../common/services/exportService');
const { createPdfDocument, addDocumentHeader, addRecordBlock, addEmptyState, finalizePdf } = require('../../common/services/pdfService');

// validation rules
const validatePayment = [
    body('orderId').notEmpty().withMessage('Order ID is required').isInt({ min: 1 }).withMessage('Order ID must be a positive integer'),
    body('amount').notEmpty().withMessage('Amount is required').isFloat({ min: 0.01 }).withMessage('Amount must be greater than 0'),
    body('tax').optional().isFloat({ min: 0 }).withMessage('Tax cannot be negative'),
    body('discount').optional().isFloat({ min: 0 }).withMessage('Discount cannot be negative'),
    body('paymentMethod').isIn(['cash', 'card', 'online']).withMessage('Invalid payment method'),
    body('paymentStatus').optional().isIn(['pending', 'completed', 'refunded', 'failed']).withMessage('Invalid payment status'),
    body('paidBy').optional({ values: 'falsy' }).isLength({ max: 100 }).withMessage('Paid by name is too long')
];

// generate unique payment number
const generatePaymentNumber = () => {
    const timestamp = Date.now().toString(36).toUpperCase();
    const random = Math.random().toString(36).substring(2, 5).toUpperCase();
    return `PAY-${timestamp}-${random}`;
};

// get payment by order id - for auto-populating payment form
const getPaymentByOrder = async (req, res) => {
    try {
        const order = await Order.findByPk(req.params.orderId);
        if (!order) return res.status(404).json({ message: 'Order not found' });
        res.json({
            orderId: order.id,
            orderNumber: order.orderNumber,
            customerName: order.customerName,
            customerEmail: order.customerEmail || null,
            totalAmount: order.totalAmount
        });
    } catch (error) {
        res.status(500).json({ message: 'Failed to fetch order', error: error.message });
    }
};

// create a new payment
const createPayment = async (req, res) => {
    const validationResponse = handleValidationErrors(req, res);
    if (validationResponse) return validationResponse;

    try {
        const { orderId, amount, tax, discount, paymentMethod, paymentStatus, paidBy } = req.body;
        const order = await Order.findByPk(orderId);
        if (!order) {
            return res.status(404).json({ message: 'Selected order was not found' });
        }

        const taxAmount = parseFloat(tax || 0);
        const discountAmount = parseFloat(discount || 0);
        const amountValue = parseFloat(amount);
        const totalAmount = amountValue + taxAmount - discountAmount;

        if (totalAmount <= 0) {
            return res.status(400).json({ message: 'Total payment amount must be greater than 0' });
        }

        const paymentNumber = generatePaymentNumber();
        const payment = await Payment.create({
            paymentNumber,
            orderId,
            amount: amountValue,
            tax: taxAmount,
            discount: discountAmount,
            totalAmount,
            paymentMethod,
            paymentStatus: paymentStatus || 'pending',
            paidBy: paidBy || order.customerName || null
        });

        res.status(201).json({ message: 'Payment created successfully', payment });
    } catch (error) {
        res.status(500).json({ message: 'Failed to create payment', error: error.message });
    }
};

// get all payments
const getAllPayments = async (req, res) => {
    try {
        const payments = await Payment.findAll({
            include: [{ model: Invoice, as: 'invoices' }],
            order: [['createdAt', 'DESC']]
        });
        res.json(payments);
    } catch (error) {
        res.status(500).json({ message: 'Failed to fetch payments', error: error.message });
    }
};

// get logged-in user's own payments
const getMyPayments = async (req, res) => {
    try {
        const orderWhere = {
            [Op.or]: [
                { customerId: req.user.id },
                { customerEmail: req.user.email }
            ]
        };

        const orders = await Order.findAll({
            where: orderWhere,
            attributes: ['id', 'orderNumber', 'orderType', 'status', 'customerName', 'customerEmail', 'createdAt'],
            order: [['createdAt', 'DESC']]
        });

        if (!orders.length) {
            return res.json([]);
        }

        const ordersById = orders.reduce((accumulator, order) => {
            accumulator[String(order.id)] = order;
            return accumulator;
        }, {});

        const payments = await Payment.findAll({
            where: {
                orderId: { [Op.in]: orders.map((order) => order.id) }
            },
            include: [{ model: Invoice, as: 'invoices' }],
            order: [['createdAt', 'DESC']]
        });

        const enrichedPayments = payments.map((payment) => {
            const plainPayment = payment.toJSON();
            return {
                ...plainPayment,
                order: ordersById[String(payment.orderId)] || null
            };
        });

        return res.json(enrichedPayments);
    } catch (error) {
        return res.status(500).json({ message: 'Failed to fetch payment history', error: error.message });
    }
};

// get single payment by id
const getPaymentById = async (req, res) => {
    try {
        const payment = await Payment.findByPk(req.params.id, { include: [{ model: Invoice, as: 'invoices' }] });
        if (!payment) return res.status(404).json({ message: 'Payment not found' });
        res.json(payment);
    } catch (error) {
        res.status(500).json({ message: 'Failed to fetch payment', error: error.message });
    }
};

// update payment
const updatePayment = async (req, res) => {
    const validationResponse = handleValidationErrors(req, res);
    if (validationResponse) return validationResponse;

    try {
        const payment = await Payment.findByPk(req.params.id);
        if (!payment) return res.status(404).json({ message: 'Payment not found' });

        const { amount, tax, discount, paymentMethod, paymentStatus, paidBy } = req.body;
        const newAmount = amount !== undefined ? parseFloat(amount) : parseFloat(payment.amount);
        const newTax = tax !== undefined ? parseFloat(tax) : parseFloat(payment.tax);
        const newDiscount = discount !== undefined ? parseFloat(discount) : parseFloat(payment.discount);
        const totalAmount = newAmount + newTax - newDiscount;

        if (totalAmount <= 0) {
            return res.status(400).json({ message: 'Total payment amount must be greater than 0' });
        }

        await payment.update({
            amount: newAmount,
            tax: newTax,
            discount: newDiscount,
            totalAmount,
            paymentMethod: paymentMethod || payment.paymentMethod,
            paymentStatus: paymentStatus || payment.paymentStatus,
            paidBy: paidBy !== undefined ? paidBy : payment.paidBy
        });

        res.json({ message: 'Payment updated successfully', payment });
    } catch (error) {
        res.status(500).json({ message: 'Failed to update payment', error: error.message });
    }
};

// delete payment
const deletePayment = async (req, res) => {
    try {
        const payment = await Payment.findByPk(req.params.id);
        if (!payment) return res.status(404).json({ message: 'Payment not found' });
        await Invoice.destroy({ where: { paymentId: payment.id } });
        await payment.destroy();
        res.json({ message: 'Payment deleted successfully' });
    } catch (error) {
        res.status(500).json({ message: 'Failed to delete payment', error: error.message });
    }
};

// export payments to excel
const exportPayments = async (req, res) => {
    try {
        const payments = await Payment.findAll({ order: [['createdAt', 'DESC']] });
        const rows = payments.map((payment) => ({
            PaymentNumber: payment.paymentNumber,
            OrderId: payment.orderId,
            Amount: Number(payment.amount),
            Tax: Number(payment.tax),
            Discount: Number(payment.discount),
            TotalAmount: Number(payment.totalAmount),
            PaymentMethod: payment.paymentMethod,
            PaymentStatus: payment.paymentStatus,
            PaidBy: payment.paidBy || '',
            CreatedAt: payment.createdAt
        }));

        return sendWorkbook(res, 'payments-report.xlsx', [
            { name: 'Payments', rows }
        ]);
    } catch (error) {
        return res.status(500).json({ message: 'Failed to export payments', error: error.message });
    }
};

const exportPaymentsPdf = async (req, res) => {
    try {
        const payments = await Payment.findAll({ order: [['createdAt', 'DESC']] });
        const doc = createPdfDocument(res, 'payments-report.pdf');

        addDocumentHeader(doc, 'CafeSync Payments Report', `Total payments: ${payments.length}`);

        if (!payments.length) {
            addEmptyState(doc, 'No payments are available right now.');
            return finalizePdf(doc);
        }

        payments.forEach((payment) => {
            addRecordBlock(doc, payment.paymentNumber, [
                { label: 'Order ID', value: String(payment.orderId) },
                { label: 'Method', value: payment.paymentMethod },
                { label: 'Status', value: payment.paymentStatus },
                { label: 'Paid By', value: payment.paidBy || '-' },
                { label: 'Amount', value: `LKR ${Number(payment.amount).toFixed(2)}` },
                { label: 'Tax', value: `LKR ${Number(payment.tax).toFixed(2)}` },
                { label: 'Discount', value: `LKR ${Number(payment.discount).toFixed(2)}` },
                { label: 'Total', value: `LKR ${Number(payment.totalAmount).toFixed(2)}` }
            ]);
        });

        return finalizePdf(doc);
    } catch (error) {
        return res.status(500).json({ message: 'Failed to export payments PDF', error: error.message });
    }
};

module.exports = {
    validatePayment,
    createPayment,
    getAllPayments,
    getMyPayments,
    getPaymentById,
    getPaymentByOrder,
    updatePayment,
    deletePayment,
    exportPayments,
    exportPaymentsPdf
};

// Order controller - Gihen (IT24103788) - CRUD operations for orders
const { body } = require('express-validator');
const { Op } = require('sequelize');
const { sequelize } = require('../../config/db');
const Order = require('../models/Order');
const OrderItem = require('../models/OrderItem');
const MenuItem = require('../../menu_inventory_management/models/MenuItem');
const User = require('../../common/user_management/models/User');
const Table = require('../../table_reservation_management/models/Table');
const Reservation = require('../../table_reservation_management/models/Reservation');
const Payment = require('../../billing_payment_management/models/Payment');
const { handleValidationErrors } = require('../../common/utils/validation');
const { generateQrDataUrl } = require('../../common/services/qrService');
const { sendMail } = require('../../common/services/mailService');
const { sendWorkbook } = require('../../common/services/exportService');
const { createPdfDocument, addDocumentHeader, addRecordBlock, addEmptyState, finalizePdf } = require('../../common/services/pdfService');

const ORDER_META_MARKER = '[[ORDER_META]]';
const ACTIVE_DINE_IN_STATUSES = ['pending', 'preparing', 'ready'];

const isStaffUser = (user) => user?.role === 'admin' || user?.role === 'staff';

const isOrderOwner = (order, user) => {
    if (!user) {
        return false;
    }

    return Number(order.customerId) === Number(user.id) || (!!order.customerEmail && order.customerEmail === user.email);
};

// validation rules for create order
const validateOrder = [
    body('customerName').trim().notEmpty().withMessage('Customer name is required'),
    body('customerEmail').optional({ values: 'falsy' }).isEmail().withMessage('Customer email must be valid'),
    body('orderType').isIn(['dine-in', 'takeaway', 'online']).withMessage('Invalid order type'),
    body('tableNumber').optional({ values: 'falsy' }).isInt({ min: 1 }).withMessage('Table number must be a positive integer'),
    body('contactPhone').optional({ values: 'falsy' }).matches(/^\+?\d{9,15}$/).withMessage('Contact phone must contain 9 to 15 digits'),
    body('pickupName').optional({ values: 'falsy' }).isLength({ max: 100 }).withMessage('Pickup name is too long'),
    body('pickupPhone').optional({ values: 'falsy' }).matches(/^\+?\d{9,15}$/).withMessage('Pickup phone must contain 9 to 15 digits'),
    body('deliveryAddress').optional({ values: 'falsy' }).isLength({ max: 255 }).withMessage('Delivery address is too long'),
    body('onlinePaymentMethod').optional({ values: 'falsy' }).isIn(['card', 'bank_transfer', 'digital_wallet']).withMessage('Invalid online payment method'),
    body('onlinePaymentReference').optional({ values: 'falsy' }).isLength({ max: 120 }).withMessage('Online payment reference is too long'),
    body('notes').optional({ values: 'falsy' }).isLength({ max: 500 }).withMessage('Notes are too long'),
    body('items').isArray({ min: 1 }).withMessage('At least one order item is required'),
    body('items.*.quantity').isInt({ min: 1 }).withMessage('Item quantity must be at least 1'),
    body('items.*.unitPrice').optional().isFloat({ min: 0 }).withMessage('Unit price must be a positive number'),
    body('items.*.menuItemId').optional({ values: 'falsy' }).isInt({ min: 1 }).withMessage('Menu item ID must be valid')
];

const validateOrderItem = [
    body('orderId').optional({ values: 'falsy' }).isInt({ min: 1 }).withMessage('Order ID must be valid'),
    body('itemName').trim().notEmpty().withMessage('Item name is required').isLength({ max: 100 }).withMessage('Item name is too long'),
    body('quantity').isInt({ min: 1 }).withMessage('Quantity must be at least 1'),
    body('unitPrice').isFloat({ min: 0.01 }).withMessage('Unit price must be greater than 0'),
    body('specialInstructions').optional({ values: 'falsy' }).isLength({ max: 255 }).withMessage('Special instructions are too long')
];

// generate unique order number
const generateOrderNumber = () => {
    const timestamp = Date.now().toString(36).toUpperCase();
    const random = Math.random().toString(36).substring(2, 5).toUpperCase();
    return `ORD-${timestamp}-${random}`;
};

const generateOrderQrToken = () => {
    const timestamp = Date.now().toString(36).toUpperCase();
    const random = Math.random().toString(36).substring(2, 8).toUpperCase();
    return `QR-${timestamp}-${random}`;
};

const generatePaymentNumber = () => {
    const timestamp = Date.now().toString(36).toUpperCase();
    const random = Math.random().toString(36).substring(2, 5).toUpperCase();
    return `PAY-${timestamp}-${random}`;
};

const buildFrontendBaseUrl = (req) => {
    const configuredBaseUrl = process.env.FRONTEND_URL || req.headers.origin || 'http://localhost:3000';
    return String(configuredBaseUrl).replace(/\/$/, '');
};

const sanitizePhone = (value) => {
    if (!value) {
        return '';
    }

    return String(value).replace(/\s/g, '').trim();
};

const parseStoredOrderNotes = (rawNotes) => {
    if (!rawNotes) {
        return {
            customerNotes: '',
            fulfillmentDetails: null
        };
    }

    const noteText = String(rawNotes);
    const markerIndex = noteText.indexOf(ORDER_META_MARKER);

    if (markerIndex === -1) {
        return {
            customerNotes: noteText.trim(),
            fulfillmentDetails: null
        };
    }

    const customerNotes = noteText.slice(0, markerIndex).trim();
    const jsonText = noteText.slice(markerIndex + ORDER_META_MARKER.length).trim();

    try {
        const fulfillmentDetails = JSON.parse(jsonText);
        return {
            customerNotes,
            fulfillmentDetails
        };
    } catch (_) {
        return {
            customerNotes: noteText.trim(),
            fulfillmentDetails: null
        };
    }
};

const buildStoredOrderNotes = (customerNotes, fulfillmentDetails = null) => {
    const cleanNotes = String(customerNotes || '').trim();
    const metadata = fulfillmentDetails && typeof fulfillmentDetails === 'object'
        ? Object.fromEntries(
            Object.entries(fulfillmentDetails).filter(([, value]) => value !== undefined && value !== null && value !== '')
        )
        : {};

    if (!Object.keys(metadata).length) {
        return cleanNotes || null;
    }

    const serializedMetadata = `${ORDER_META_MARKER}${JSON.stringify(metadata)}`;
    return cleanNotes ? `${cleanNotes}\n${serializedMetadata}` : serializedMetadata;
};

const normalizeFulfillmentDetails = (orderType, details = {}) => {
    const nextDetails = { serviceMode: orderType };
    const resolvedContactPhone = sanitizePhone(details.contactPhone || details.pickupPhone);

    if (resolvedContactPhone) {
        nextDetails.contactPhone = resolvedContactPhone;
    }

    if (orderType === 'dine-in') {
        if (details.tableNumber) nextDetails.tableNumber = Number(details.tableNumber);
        if (details.tableLocation) nextDetails.tableLocation = details.tableLocation;
        if (details.tableCapacity) nextDetails.tableCapacity = Number(details.tableCapacity);
    }

    if (orderType === 'takeaway') {
        if (details.pickupName) nextDetails.pickupName = String(details.pickupName).trim();
        if (resolvedContactPhone) nextDetails.pickupPhone = resolvedContactPhone;
    }

    if (orderType === 'online') {
        if (details.deliveryAddress) nextDetails.deliveryAddress = String(details.deliveryAddress).trim();
        if (details.onlinePaymentMethod) nextDetails.onlinePaymentMethod = details.onlinePaymentMethod;
        if (details.onlinePaymentReference) nextDetails.onlinePaymentReference = String(details.onlinePaymentReference).trim();
        if (details.onlinePaymentStatus) nextDetails.onlinePaymentStatus = details.onlinePaymentStatus;
        if (details.paymentNumber) nextDetails.paymentNumber = details.paymentNumber;
    }

    return nextDetails;
};

const serializeOrder = (order) => {
    const plainOrder = order?.toJSON ? order.toJSON() : order;

    if (!plainOrder) {
        return plainOrder;
    }

    const { customerNotes, fulfillmentDetails } = parseStoredOrderNotes(plainOrder.notes);
    const fallbackFulfillmentDetails = fulfillmentDetails || plainOrder.fulfillmentDetails || {};

    return {
        ...plainOrder,
        notes: customerNotes,
        customerNotes,
        fulfillmentDetails: normalizeFulfillmentDetails(plainOrder.orderType, fallbackFulfillmentDetails)
    };
};

const serializeOrders = (orders) => orders.map((order) => serializeOrder(order));

const getTodayString = () => {
    const today = new Date();
    const year = today.getFullYear();
    const month = String(today.getMonth() + 1).padStart(2, '0');
    const day = String(today.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
};

const findActiveDineInOrder = async (tableNumber, excludeOrderId = null, transaction = undefined) => {
    const whereClause = {
        orderType: 'dine-in',
        tableNumber: Number(tableNumber),
        status: { [Op.in]: ACTIVE_DINE_IN_STATUSES }
    };

    if (excludeOrderId) {
        whereClause.id = { [Op.ne]: Number(excludeOrderId) };
    }

    return Order.findOne({
        where: whereClause,
        transaction
    });
};

const syncTableOccupancy = async (tableNumber, transaction = undefined) => {
    if (!tableNumber) {
        return;
    }

    const table = await Table.findOne({
        where: { tableNumber: Number(tableNumber) },
        transaction
    });

    if (!table || table.status === 'maintenance') {
        return;
    }

    const activeOrder = await findActiveDineInOrder(tableNumber, null, transaction);

    if (activeOrder && table.status !== 'occupied') {
        await table.update({ status: 'occupied' }, { transaction });
        return;
    }

    if (!activeOrder && table.status === 'occupied') {
        await table.update({ status: 'available' }, { transaction });
    }
};

const canMoveToStatus = (currentStatus, nextStatus) => {
    if (!nextStatus || currentStatus === nextStatus) {
        return true;
    }

    const transitions = {
        pending: ['preparing', 'completed', 'cancelled'],
        preparing: ['ready', 'completed', 'cancelled'],
        ready: ['completed', 'cancelled'],
        completed: [],
        cancelled: []
    };

    return transitions[currentStatus]?.includes(nextStatus);
};

const resolveDineInTable = async (tableNumber, transaction = undefined) => {
    const numericTableNumber = Number(tableNumber);
    const table = await Table.findOne({
        where: { tableNumber: numericTableNumber },
        transaction
    });

    if (!table) {
        return { error: 'Selected dine-in table was not found' };
    }

    if (['occupied', 'maintenance', 'reserved'].includes(table.status)) {
        return { error: 'Selected table is not available for dine-in orders right now' };
    }

    const activeReservation = await Reservation.findOne({
        where: {
            tableId: table.id,
            reservationDate: getTodayString(),
            status: { [Op.notIn]: ['cancelled', 'completed', 'no_show'] }
        },
        transaction
    });

    if (activeReservation) {
        return { error: 'Selected table already has an active reservation for today' };
    }

    const activeOrder = await findActiveDineInOrder(tableNumber, null, transaction);
    if (activeOrder) {
        return { error: 'Selected table already has an active dine-in order' };
    }

    return { table };
};

const buildFulfillmentSummary = (order) => {
    const serializedOrder = serializeOrder(order);
    const fulfillment = serializedOrder.fulfillmentDetails || {};

    if (serializedOrder.orderType === 'dine-in') {
        return serializedOrder.tableNumber
            ? `Dine-in at Table ${serializedOrder.tableNumber}`
            : 'Dine-in order';
    }

    if (serializedOrder.orderType === 'takeaway') {
        const pickupContact = fulfillment.pickupPhone || fulfillment.contactPhone || '-';
        return `Takeaway pickup (${pickupContact})`;
    }

    if (serializedOrder.orderType === 'online') {
        const paymentMethod = fulfillment.onlinePaymentMethod
            ? fulfillment.onlinePaymentMethod.replace('_', ' ')
            : 'online';
        const paymentReference = fulfillment.onlinePaymentReference || '-';
        return `Online delivery - ${paymentMethod} - Ref ${paymentReference}`;
    }

    return serializedOrder.orderType;
};

const buildOrderTrackingUrl = (req, qrToken) => `${buildFrontendBaseUrl(req)}/order-tracking/${encodeURIComponent(qrToken)}`;

const buildOrderQrValue = (req, order) => {
    const serializedOrder = serializeOrder(order);
    return buildOrderTrackingUrl(req, serializedOrder.qrToken);
};

const buildOrderEmailHtml = (order) => {
    const serializedOrder = serializeOrder(order);
    const fulfillment = serializedOrder.fulfillmentDetails || {};
    const itemRows = (serializedOrder.items || []).map((item) => `
        <tr>
            <td style="padding: 8px; border: 1px solid #cbd5e1;">${item.itemName}</td>
            <td style="padding: 8px; border: 1px solid #cbd5e1;">${item.quantity}</td>
            <td style="padding: 8px; border: 1px solid #cbd5e1;">LKR ${parseFloat(item.totalPrice).toFixed(2)}</td>
        </tr>
    `).join('');

    const extraRows = [];

    if (serializedOrder.orderType === 'dine-in' && serializedOrder.tableNumber) {
        extraRows.push(`<tr><td style="padding: 8px; border: 1px solid #cbd5e1;">Table</td><td style="padding: 8px; border: 1px solid #cbd5e1;">${serializedOrder.tableNumber}</td></tr>`);
    }

    if (serializedOrder.orderType === 'takeaway') {
        if (fulfillment.pickupName) {
            extraRows.push(`<tr><td style="padding: 8px; border: 1px solid #cbd5e1;">Pickup Name</td><td style="padding: 8px; border: 1px solid #cbd5e1;">${fulfillment.pickupName}</td></tr>`);
        }
        if (fulfillment.pickupPhone || fulfillment.contactPhone) {
            extraRows.push(`<tr><td style="padding: 8px; border: 1px solid #cbd5e1;">Pickup Phone</td><td style="padding: 8px; border: 1px solid #cbd5e1;">${fulfillment.pickupPhone || fulfillment.contactPhone}</td></tr>`);
        }
    }

    if (serializedOrder.orderType === 'online') {
        if (fulfillment.contactPhone) {
            extraRows.push(`<tr><td style="padding: 8px; border: 1px solid #cbd5e1;">Contact Phone</td><td style="padding: 8px; border: 1px solid #cbd5e1;">${fulfillment.contactPhone}</td></tr>`);
        }
        if (fulfillment.deliveryAddress) {
            extraRows.push(`<tr><td style="padding: 8px; border: 1px solid #cbd5e1;">Delivery Address</td><td style="padding: 8px; border: 1px solid #cbd5e1;">${fulfillment.deliveryAddress}</td></tr>`);
        }
        if (fulfillment.onlinePaymentMethod) {
            extraRows.push(`<tr><td style="padding: 8px; border: 1px solid #cbd5e1;">Payment Method</td><td style="padding: 8px; border: 1px solid #cbd5e1;">${fulfillment.onlinePaymentMethod.replace('_', ' ')}</td></tr>`);
        }
        if (fulfillment.onlinePaymentReference) {
            extraRows.push(`<tr><td style="padding: 8px; border: 1px solid #cbd5e1;">Payment Reference</td><td style="padding: 8px; border: 1px solid #cbd5e1;">${fulfillment.onlinePaymentReference}</td></tr>`);
        }
        if (fulfillment.paymentNumber) {
            extraRows.push(`<tr><td style="padding: 8px; border: 1px solid #cbd5e1;">Linked Payment</td><td style="padding: 8px; border: 1px solid #cbd5e1;">${fulfillment.paymentNumber}</td></tr>`);
        }
    }

    return `
        <div style="font-family: Arial, sans-serif; color: #0f172a;">
            <h2>CafeSync Order Confirmation</h2>
            <p>Hello ${serializedOrder.customerName},</p>
            <p>Your order <strong>${serializedOrder.orderNumber}</strong> is confirmed.</p>
            <table style="border-collapse: collapse; width: 100%; max-width: 520px;">
                <tr><td style="padding: 8px; border: 1px solid #cbd5e1;">Order Type</td><td style="padding: 8px; border: 1px solid #cbd5e1;">${serializedOrder.orderType}</td></tr>
                <tr><td style="padding: 8px; border: 1px solid #cbd5e1;">Status</td><td style="padding: 8px; border: 1px solid #cbd5e1;">${serializedOrder.status}</td></tr>
                <tr><td style="padding: 8px; border: 1px solid #cbd5e1;">Total</td><td style="padding: 8px; border: 1px solid #cbd5e1;">LKR ${parseFloat(serializedOrder.totalAmount).toFixed(2)}</td></tr>
                ${extraRows.join('')}
            </table>
            ${itemRows ? `
                <h3 style="margin-top: 20px;">Order Items</h3>
                <table style="border-collapse: collapse; width: 100%; max-width: 520px;">
                    <tr>
                        <th style="padding: 8px; border: 1px solid #cbd5e1; text-align: left;">Item</th>
                        <th style="padding: 8px; border: 1px solid #cbd5e1; text-align: left;">Qty</th>
                        <th style="padding: 8px; border: 1px solid #cbd5e1; text-align: left;">Total</th>
                    </tr>
                    ${itemRows}
                </table>
            ` : ''}
            <p style="margin-top: 16px;">Thank you for ordering with CafeSync.</p>
        </div>
    `;
};

const resolveOrderRecipientEmail = async (order) => {
    if (order.customerId) {
        const customer = await User.findByPk(order.customerId);
        if (customer?.email) {
            return customer.email;
        }
    }

    if (order.customerEmail) {
        return order.customerEmail;
    }

    if (order.customerName) {
        const [firstName, ...rest] = String(order.customerName).trim().split(/\s+/);
        const lastName = rest.join(' ');
        if (firstName) {
            const customerByName = await User.findOne({
                where: {
                    firstName,
                    ...(lastName ? { lastName } : {}),
                    role: 'customer'
                }
            });

            if (customerByName?.email) {
                return customerByName.email;
            }
        }
    }

    return '';
};

const createLinkedOnlinePayment = async (order, fulfillmentDetails, transaction) => {
    const paymentMethod = fulfillmentDetails?.onlinePaymentMethod === 'card' ? 'card' : 'online';

    return Payment.create({
        paymentNumber: generatePaymentNumber(),
        orderId: order.id,
        amount: Number(order.totalAmount),
        tax: 0,
        discount: 0,
        totalAmount: Number(order.totalAmount),
        paymentMethod,
        paymentStatus: 'completed',
        paidBy: order.customerName
    }, { transaction });
};

const serializePublicOrder = (order, req = null) => {
    const serializedOrder = serializeOrder(order);
    return {
        id: serializedOrder.id,
        orderNumber: serializedOrder.orderNumber,
        customerName: serializedOrder.customerName,
        orderType: serializedOrder.orderType,
        status: serializedOrder.status,
        tableNumber: serializedOrder.tableNumber,
        totalAmount: serializedOrder.totalAmount,
        customerNotes: serializedOrder.customerNotes,
        fulfillmentDetails: serializedOrder.fulfillmentDetails,
        qrToken: serializedOrder.qrToken,
        trackingUrl: req ? buildOrderTrackingUrl(req, serializedOrder.qrToken) : null,
        createdAt: serializedOrder.createdAt,
        updatedAt: serializedOrder.updatedAt,
        items: (serializedOrder.items || []).map((item) => ({
            id: item.id,
            itemName: item.itemName,
            quantity: item.quantity,
            unitPrice: item.unitPrice,
            totalPrice: item.totalPrice,
            specialInstructions: item.specialInstructions || ''
        }))
    };
};

// create a new order
const createOrder = async (req, res) => {
    const validationResponse = handleValidationErrors(req, res);
    if (validationResponse) return validationResponse;

    const transaction = await sequelize.transaction();

    try {
        const {
            customerId,
            customerName,
            customerEmail,
            orderType,
            tableNumber,
            notes,
            items,
            contactPhone,
            pickupName,
            pickupPhone,
            deliveryAddress,
            onlinePaymentMethod,
            onlinePaymentReference
        } = req.body;

        const isCustomer = req.user?.role === 'customer';
        const trimmedCustomerName = String(customerName).trim();
        const trimmedNotes = String(notes || '').trim();

        if (isCustomer && customerEmail && customerEmail !== req.user.email) {
            await transaction.rollback();
            return res.status(403).json({ message: 'Customers can only place orders using their own account email' });
        }

        let selectedCustomer = null;
        if (customerId) {
            selectedCustomer = await User.findByPk(customerId, { transaction });
        }

        const currentUser = req.user?.id
            ? await User.findByPk(req.user.id, { transaction })
            : null;

        const resolvedCustomerName = isCustomer
            ? [currentUser?.firstName, currentUser?.lastName].filter(Boolean).join(' ').trim() || trimmedCustomerName
            : trimmedCustomerName;

        const resolvedCustomerEmail = isCustomer
            ? (currentUser?.email || req.user.email)
            : (customerEmail || selectedCustomer?.email || currentUser?.email || null);

        const resolvedPrimaryPhone = sanitizePhone(contactPhone)
            || sanitizePhone(pickupPhone)
            || sanitizePhone(currentUser?.phone)
            || sanitizePhone(selectedCustomer?.phone);

        let dineInTable = null;
        if (orderType === 'dine-in') {
            if (!tableNumber) {
                await transaction.rollback();
                return res.status(400).json({ message: 'Table number is required for dine-in orders' });
            }

            const { table, error } = await resolveDineInTable(tableNumber, transaction);
            if (error) {
                await transaction.rollback();
                return res.status(400).json({ message: error });
            }
            dineInTable = table;
        }

        if (orderType === 'takeaway' && !resolvedPrimaryPhone) {
            await transaction.rollback();
            return res.status(400).json({ message: 'A contact phone number is required for takeaway orders' });
        }

        if (orderType === 'online') {
            if (!resolvedPrimaryPhone) {
                await transaction.rollback();
                return res.status(400).json({ message: 'A contact phone number is required for online orders' });
            }
            if (!String(deliveryAddress || '').trim()) {
                await transaction.rollback();
                return res.status(400).json({ message: 'Delivery address is required for online orders' });
            }
            if (!onlinePaymentMethod) {
                await transaction.rollback();
                return res.status(400).json({ message: 'Online payment method is required for online orders' });
            }
            if (!String(onlinePaymentReference || '').trim()) {
                await transaction.rollback();
                return res.status(400).json({ message: 'Online payment reference is required for online orders' });
            }
        }

        const orderNumber = generateOrderNumber();
        const qrToken = generateOrderQrToken();

        const resolvedItems = [];
        for (const item of items) {
            let resolvedName = item.itemName;
            let resolvedPrice = item.unitPrice !== undefined ? parseFloat(item.unitPrice) : null;

            if (item.menuItemId) {
                const menuItem = await MenuItem.findByPk(item.menuItemId, { transaction });
                if (!menuItem) {
                    await transaction.rollback();
                    return res.status(404).json({ message: `Menu item not found: ID ${item.menuItemId}` });
                }
                resolvedName = menuItem.name;
                resolvedPrice = parseFloat(menuItem.price);
            }

            if (!resolvedName || !resolvedPrice || resolvedPrice <= 0) {
                await transaction.rollback();
                return res.status(400).json({ message: 'Each order item must have a valid name and unit price' });
            }

            resolvedItems.push({
                menuItemId: item.menuItemId || null,
                itemName: resolvedName,
                quantity: parseInt(item.quantity, 10),
                unitPrice: resolvedPrice,
                totalPrice: parseInt(item.quantity, 10) * resolvedPrice,
                specialInstructions: item.specialInstructions || null
            });
        }

        const totalAmount = resolvedItems.reduce((sum, item) => sum + item.totalPrice, 0);

        let fulfillmentDetails = normalizeFulfillmentDetails(orderType, {
            contactPhone: resolvedPrimaryPhone,
            tableNumber: dineInTable?.tableNumber,
            tableLocation: dineInTable?.location,
            tableCapacity: dineInTable?.seatingCapacity,
            pickupName: pickupName || resolvedCustomerName,
            pickupPhone: resolvedPrimaryPhone,
            deliveryAddress,
            onlinePaymentMethod,
            onlinePaymentReference,
            onlinePaymentStatus: orderType === 'online' ? 'paid' : null
        });

        const order = await Order.create({
            orderNumber,
            customerId: isCustomer ? req.user.id : (customerId || null),
            customerName: resolvedCustomerName,
            customerEmail: resolvedCustomerEmail,
            orderType,
            status: 'pending',
            tableNumber: orderType === 'dine-in' ? parseInt(dineInTable.tableNumber, 10) : null,
            totalAmount,
            notes: buildStoredOrderNotes(trimmedNotes, fulfillmentDetails),
            qrToken
        }, { transaction });

        await OrderItem.bulkCreate(
            resolvedItems.map((item) => ({ ...item, orderId: order.id })),
            { transaction }
        );

        let linkedPaymentNumber = null;
        if (orderType === 'online') {
            const payment = await createLinkedOnlinePayment(order, fulfillmentDetails, transaction);
            linkedPaymentNumber = payment.paymentNumber;
            fulfillmentDetails = normalizeFulfillmentDetails(orderType, {
                ...fulfillmentDetails,
                paymentNumber: payment.paymentNumber,
                onlinePaymentStatus: 'paid'
            });
            await order.update({
                notes: buildStoredOrderNotes(trimmedNotes, fulfillmentDetails)
            }, { transaction });
        }

        if (orderType === 'dine-in') {
            await syncTableOccupancy(dineInTable.tableNumber, transaction);
        }

        await transaction.commit();

        const completeOrder = await Order.findByPk(order.id, {
            include: [{ model: OrderItem, as: 'items' }]
        });

        return res.status(201).json({
            message: orderType === 'online'
                ? 'Online order placed and payment recorded successfully'
                : 'Order created successfully',
            order: serializeOrder(completeOrder),
            linkedPaymentNumber
        });
    } catch (error) {
        await transaction.rollback();
        return res.status(500).json({ message: 'Failed to create order', error: error.message });
    }
};

// get all orders
const getAllOrders = async (req, res) => {
    try {
        const whereClause = isStaffUser(req.user)
            ? {}
            : {
                [Op.or]: [
                    { customerId: req.user.id },
                    { customerEmail: req.user.email }
                ]
            };

        const orders = await Order.findAll({
            where: whereClause,
            include: [{ model: OrderItem, as: 'items' }],
            order: [['createdAt', 'DESC']]
        });
        res.json(serializeOrders(orders));
    } catch (error) {
        res.status(500).json({ message: 'Failed to fetch orders', error: error.message });
    }
};

// get single order by id
const getOrderById = async (req, res) => {
    try {
        const order = await Order.findByPk(req.params.id, { include: [{ model: OrderItem, as: 'items' }] });
        if (!order) {
            return res.status(404).json({ message: 'Order not found' });
        }

        if (!isStaffUser(req.user) && !isOrderOwner(order, req.user)) {
            return res.status(403).json({ message: 'Access denied for this order' });
        }

        res.json(serializeOrder(order));
    } catch (error) {
        res.status(500).json({ message: 'Failed to fetch order', error: error.message });
    }
};

const getOrderQr = async (req, res) => {
    try {
        const order = await Order.findByPk(req.params.id);
        if (!order) {
            return res.status(404).json({ message: 'Order not found' });
        }

        if (!isStaffUser(req.user) && !isOrderOwner(order, req.user)) {
            return res.status(403).json({ message: 'Access denied for this order' });
        }

        const serializedOrder = serializeOrder(order);
        const trackingUrl = buildOrderTrackingUrl(req, serializedOrder.qrToken);
        const qrDataUrl = await generateQrDataUrl(buildOrderQrValue(req, serializedOrder));
        return res.json({
            orderNumber: serializedOrder.orderNumber,
            orderType: serializedOrder.orderType,
            qrDataUrl,
            qrToken: serializedOrder.qrToken,
            trackingUrl,
            fulfillmentDetails: serializedOrder.fulfillmentDetails,
            customerNotes: serializedOrder.customerNotes
        });
    } catch (error) {
        return res.status(500).json({ message: 'Failed to generate order QR', error: error.message });
    }
};

const getOrderByQrToken = async (req, res) => {
    try {
        const order = await Order.findOne({
            where: { qrToken: req.params.qrToken },
            include: [{ model: OrderItem, as: 'items' }]
        });

        if (!order) {
            return res.status(404).json({ message: 'Order not found for this QR code' });
        }

        return res.json({
            order: serializePublicOrder(order, req)
        });
    } catch (error) {
        return res.status(500).json({ message: 'Failed to fetch order by QR token', error: error.message });
    }
};

const sendOrderConfirmation = async (req, res) => {
    try {
        const order = await Order.findByPk(req.params.id, { include: [{ model: OrderItem, as: 'items' }] });
        if (!order) {
            return res.status(404).json({ message: 'Order not found' });
        }

        if (!isStaffUser(req.user) && !isOrderOwner(order, req.user)) {
            return res.status(403).json({ message: 'Access denied for this order' });
        }

        const recipientEmail = await resolveOrderRecipientEmail(order);

        if (recipientEmail && recipientEmail !== order.customerEmail) {
            await order.update({ customerEmail: recipientEmail });
        }

        const serializedOrder = serializeOrder({
            ...order.toJSON(),
            customerEmail: recipientEmail || order.customerEmail
        });

        if (!recipientEmail) {
            return res.status(400).json({ message: 'Customer email is not available for this order' });
        }

        const result = await sendMail({
            to: recipientEmail,
            subject: `CafeSync Order ${serializedOrder.orderNumber}`,
            html: buildOrderEmailHtml(serializedOrder),
            text: `Order ${serializedOrder.orderNumber} confirmed. ${buildFulfillmentSummary(serializedOrder)}. Total LKR ${parseFloat(serializedOrder.totalAmount).toFixed(2)}`
        });

        if (!result.sent) {
            return res.status(400).json({ message: result.message });
        }

        return res.json({ message: `Order confirmation email sent successfully to ${recipientEmail}` });
    } catch (error) {
        return res.status(500).json({ message: 'Failed to send order email', error: error.message });
    }
};

const exportOrders = async (req, res) => {
    try {
        const orders = await Order.findAll({
            include: [{ model: OrderItem, as: 'items' }],
            order: [['createdAt', 'DESC']]
        });

        const rows = serializeOrders(orders).map((order) => ({
            OrderNumber: order.orderNumber,
            CustomerName: order.customerName,
            CustomerEmail: order.customerEmail || '',
            OrderType: order.orderType,
            Status: order.status,
            TableNumber: order.tableNumber || '',
            FulfillmentSummary: buildFulfillmentSummary(order),
            ContactPhone: order.fulfillmentDetails?.contactPhone || order.fulfillmentDetails?.pickupPhone || '',
            DeliveryAddress: order.fulfillmentDetails?.deliveryAddress || '',
            PaymentMethod: order.fulfillmentDetails?.onlinePaymentMethod || '',
            PaymentReference: order.fulfillmentDetails?.onlinePaymentReference || '',
            PaymentNumber: order.fulfillmentDetails?.paymentNumber || '',
            ItemCount: order.items?.length || 0,
            TotalAmount: Number(order.totalAmount),
            QrToken: order.qrToken || '',
            CreatedAt: order.createdAt
        }));

        return sendWorkbook(res, 'orders-report.xlsx', [
            { name: 'Orders', rows }
        ]);
    } catch (error) {
        return res.status(500).json({ message: 'Failed to export orders', error: error.message });
    }
};

const exportOrdersPdf = async (req, res) => {
    try {
        const orders = await Order.findAll({
            include: [{ model: OrderItem, as: 'items' }],
            order: [['createdAt', 'DESC']]
        });

        const serializedOrders = serializeOrders(orders);
        const doc = createPdfDocument(res, 'orders-report.pdf');
        addDocumentHeader(doc, 'CafeSync Orders Report', `Total orders: ${serializedOrders.length}`);

        if (!serializedOrders.length) {
            addEmptyState(doc, 'No orders are available right now.');
            return finalizePdf(doc);
        }

        serializedOrders.forEach((order) => {
            addRecordBlock(doc, order.orderNumber, [
                { label: 'Customer Name', value: order.customerName },
                { label: 'Customer Email', value: order.customerEmail || '-' },
                { label: 'Order Type', value: order.orderType },
                { label: 'Status', value: order.status },
                { label: 'Table Number', value: order.tableNumber || '-' },
                { label: 'Fulfillment', value: buildFulfillmentSummary(order) },
                { label: 'Item Count', value: String(order.items?.length || 0) },
                { label: 'Total Amount', value: `LKR ${Number(order.totalAmount).toFixed(2)}` },
                { label: 'QR Token', value: order.qrToken || '-' }
            ]);
        });

        return finalizePdf(doc);
    } catch (error) {
        return res.status(500).json({ message: 'Failed to export orders PDF', error: error.message });
    }
};

// update order
const updateOrder = async (req, res) => {
    try {
        const order = await Order.findByPk(req.params.id);
        if (!order) {
            return res.status(404).json({ message: 'Order not found' });
        }
        const previousTableNumber = order.tableNumber;
        const previousOrderType = order.orderType;
        const {
            customerName,
            customerEmail,
            orderType,
            status,
            tableNumber,
            notes,
            contactPhone,
            pickupName,
            pickupPhone,
            deliveryAddress,
            onlinePaymentMethod,
            onlinePaymentReference
        } = req.body;
        const existingNotes = parseStoredOrderNotes(order.notes);
        const existingFulfillmentDetails = existingNotes.fulfillmentDetails || {};
        const nextOrderType = orderType || order.orderType;
        const nextCustomerName = customerName !== undefined ? String(customerName).trim() : order.customerName;
        const nextCustomerEmail = customerEmail !== undefined ? String(customerEmail).trim() : order.customerEmail;
        const nextCustomerNotes = notes !== undefined ? String(notes).trim() : existingNotes.customerNotes;
        const resolvedContactPhone = contactPhone !== undefined
            ? sanitizePhone(contactPhone)
            : sanitizePhone(existingFulfillmentDetails.contactPhone || existingFulfillmentDetails.pickupPhone);
        const resolvedPickupPhone = pickupPhone !== undefined
            ? sanitizePhone(pickupPhone)
            : sanitizePhone(existingFulfillmentDetails.pickupPhone || existingFulfillmentDetails.contactPhone);
        const activePhone = resolvedContactPhone || resolvedPickupPhone;

        if (customerName !== undefined && !nextCustomerName) {
            return res.status(400).json({ message: 'Customer name is required' });
        }

        if (nextCustomerEmail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(nextCustomerEmail)) {
            return res.status(400).json({ message: 'Customer email must be valid' });
        }

        if (nextOrderType && !['dine-in', 'takeaway', 'online'].includes(nextOrderType)) {
            return res.status(400).json({ message: 'Invalid order type' });
        }

        if (tableNumber !== undefined && tableNumber !== null && tableNumber !== '' && (!Number.isInteger(Number(tableNumber)) || Number(tableNumber) < 1)) {
            return res.status(400).json({ message: 'Table number must be a positive integer' });
        }

        if (!canMoveToStatus(order.status, status)) {
            return res.status(400).json({ message: `Cannot move order from ${order.status} to ${status}` });
        }

        if (contactPhone !== undefined && resolvedContactPhone && !/^\+?\d{9,15}$/.test(resolvedContactPhone)) {
            return res.status(400).json({ message: 'Contact phone must contain 9 to 15 digits' });
        }

        if (pickupPhone !== undefined && resolvedPickupPhone && !/^\+?\d{9,15}$/.test(resolvedPickupPhone)) {
            return res.status(400).json({ message: 'Pickup phone must contain 9 to 15 digits' });
        }

        if (pickupName !== undefined && String(pickupName).trim().length > 100) {
            return res.status(400).json({ message: 'Pickup name is too long' });
        }

        if (deliveryAddress !== undefined && String(deliveryAddress).trim().length > 255) {
            return res.status(400).json({ message: 'Delivery address is too long' });
        }

        if (onlinePaymentMethod !== undefined && onlinePaymentMethod && !['card', 'bank_transfer', 'digital_wallet'].includes(onlinePaymentMethod)) {
            return res.status(400).json({ message: 'Invalid online payment method' });
        }

        if (onlinePaymentReference !== undefined && String(onlinePaymentReference).trim().length > 120) {
            return res.status(400).json({ message: 'Online payment reference is too long' });
        }

        if (notes !== undefined && nextCustomerNotes.length > 500) {
            return res.status(400).json({ message: 'Notes are too long' });
        }

        let nextTableNumber = null;
        let nextFulfillmentDetails = normalizeFulfillmentDetails(nextOrderType, {
            ...existingFulfillmentDetails,
            contactPhone: activePhone,
            pickupName: pickupName !== undefined ? String(pickupName).trim() : (existingFulfillmentDetails.pickupName || nextCustomerName),
            pickupPhone: resolvedPickupPhone || activePhone,
            deliveryAddress: deliveryAddress !== undefined ? String(deliveryAddress).trim() : existingFulfillmentDetails.deliveryAddress,
            onlinePaymentMethod: onlinePaymentMethod !== undefined ? onlinePaymentMethod : existingFulfillmentDetails.onlinePaymentMethod,
            onlinePaymentReference: onlinePaymentReference !== undefined ? String(onlinePaymentReference).trim() : existingFulfillmentDetails.onlinePaymentReference,
            paymentNumber: existingFulfillmentDetails.paymentNumber,
            onlinePaymentStatus: existingFulfillmentDetails.onlinePaymentStatus || (existingFulfillmentDetails.paymentNumber ? 'paid' : undefined)
        });

        if (nextOrderType === 'dine-in') {
            const candidateTableNumber = tableNumber || order.tableNumber || nextFulfillmentDetails.tableNumber;
            if (!candidateTableNumber) {
                return res.status(400).json({ message: 'Table number is required for dine-in orders' });
            }

            const shouldRevalidateTable = Number(candidateTableNumber) !== Number(order.tableNumber) || order.orderType !== 'dine-in';
            if (shouldRevalidateTable) {
                const { table, error } = await resolveDineInTable(candidateTableNumber);
                if (error) {
                    return res.status(400).json({ message: error });
                }
                nextTableNumber = table.tableNumber;
                nextFulfillmentDetails = normalizeFulfillmentDetails(nextOrderType, {
                    ...nextFulfillmentDetails,
                    tableNumber: table.tableNumber,
                    tableLocation: table.location,
                    tableCapacity: table.seatingCapacity
                });
            } else {
                nextTableNumber = Number(candidateTableNumber);
                nextFulfillmentDetails = normalizeFulfillmentDetails(nextOrderType, {
                    ...nextFulfillmentDetails,
                    tableNumber: candidateTableNumber
                });
            }
        }

        if (nextOrderType === 'takeaway') {
            if (!activePhone) {
                return res.status(400).json({ message: 'A contact phone number is required for takeaway orders' });
            }

            if (!nextFulfillmentDetails.pickupName) {
                nextFulfillmentDetails = normalizeFulfillmentDetails(nextOrderType, {
                    ...nextFulfillmentDetails,
                    pickupName: nextCustomerName
                });
            }
        }

        if (nextOrderType === 'online') {
            if (!activePhone) {
                return res.status(400).json({ message: 'A contact phone number is required for online orders' });
            }

            if (!nextFulfillmentDetails.deliveryAddress) {
                return res.status(400).json({ message: 'Delivery address is required for online orders' });
            }

            if (!nextFulfillmentDetails.onlinePaymentMethod) {
                return res.status(400).json({ message: 'Online payment method is required for online orders' });
            }

            if (!nextFulfillmentDetails.onlinePaymentReference) {
                return res.status(400).json({ message: 'Online payment reference is required for online orders' });
            }
        }

        await order.update({
            customerName: nextCustomerName,
            customerEmail: nextCustomerEmail,
            orderType: nextOrderType,
            status: status || order.status,
            tableNumber: nextOrderType === 'dine-in' ? nextTableNumber : null,
            notes: buildStoredOrderNotes(
                nextCustomerNotes,
                nextFulfillmentDetails
            )
        });

        const tablesToSync = new Set();
        if (previousOrderType === 'dine-in' && previousTableNumber) {
            tablesToSync.add(Number(previousTableNumber));
        }
        if (nextOrderType === 'dine-in' && nextTableNumber) {
            tablesToSync.add(Number(nextTableNumber));
        }

        for (const occupiedTableNumber of tablesToSync) {
            await syncTableOccupancy(occupiedTableNumber);
        }

        const updatedOrder = await Order.findByPk(order.id, { include: [{ model: OrderItem, as: 'items' }] });
        res.json({ message: 'Order updated successfully', order: serializeOrder(updatedOrder) });
    } catch (error) {
        res.status(500).json({ message: 'Failed to update order', error: error.message });
    }
};

// delete order
const deleteOrder = async (req, res) => {
    try {
        const order = await Order.findByPk(req.params.id);
        if (!order) {
            return res.status(404).json({ message: 'Order not found' });
        }
        const releaseTableNumber = order.orderType === 'dine-in' ? order.tableNumber : null;
        await OrderItem.destroy({ where: { orderId: order.id } });
        await order.destroy();
        if (releaseTableNumber) {
            await syncTableOccupancy(releaseTableNumber);
        }
        res.json({ message: 'Order deleted successfully' });
    } catch (error) {
        res.status(500).json({ message: 'Failed to delete order', error: error.message });
    }
};

module.exports = {
    validateOrder,
    validateOrderItem,
    createOrder,
    getAllOrders,
    getOrderById,
    getOrderQr,
    getOrderByQrToken,
    sendOrderConfirmation,
    exportOrders,
    exportOrdersPdf,
    updateOrder,
    deleteOrder
};

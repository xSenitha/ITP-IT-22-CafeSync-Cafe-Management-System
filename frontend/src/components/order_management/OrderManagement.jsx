import { useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { FaDownload, FaEnvelope, FaMinus, FaPlus, FaQrcode, FaXmark } from 'react-icons/fa6';
import { useNavigate } from 'react-router-dom';
import API, { downloadApiFile } from '../../services/api';
import toast from 'react-hot-toast';

const statusBadge = (status) => ({ pending: 'badge-warning', preparing: 'badge-info', ready: 'badge-purple', completed: 'badge-success', cancelled: 'badge-danger' }[status] || 'badge-muted');
const getTodayString = () => {
    const today = new Date();
    const year = today.getFullYear();
    const month = String(today.getMonth() + 1).padStart(2, '0');
    const day = String(today.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
};
const formatLabel = (value) => String(value || '').replace(/_/g, ' ');
const sanitizePhone = (value) => String(value || '').replace(/\s/g, '').trim();
const orderStatusOptions = [
    { value: 'pending', label: 'Pending' },
    { value: 'preparing', label: 'Preparing' },
    { value: 'ready', label: 'Ready' },
    { value: 'completed', label: 'Completed' },
    { value: 'cancelled', label: 'Cancelled' }
];
const orderStatusTransitions = {
    pending: ['pending', 'preparing', 'completed', 'cancelled'],
    preparing: ['preparing', 'ready', 'completed', 'cancelled'],
    ready: ['ready', 'completed', 'cancelled'],
    completed: ['completed'],
    cancelled: ['cancelled']
};

const getAllowedStatusOptions = (currentStatus, isEditing) => {
    if (!isEditing) {
        return orderStatusOptions.filter((option) => option.value === 'pending');
    }

    const allowedValues = orderStatusTransitions[currentStatus] || [currentStatus];
    return orderStatusOptions.filter((option) => allowedValues.includes(option.value));
};

const FieldLabel = ({ icon, children }) => (
    <label style={{ display: 'block', fontSize: '0.7rem', fontWeight: 700, color: '#6b84b0', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 5 }}>
        {icon && <i className={`fa-solid ${icon} mr-1.5`} style={{ color: 'rgba(0,229,255,0.6)', fontSize: 10 }}></i>}
        {children}
    </label>
);

const ModalBox = ({ title, icon, onClose, children }) => (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        style={{ position: 'fixed', inset: 0, background: 'rgba(7,11,20,0.85)', backdropFilter: 'blur(8px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 50, padding: '1rem' }}>
        <motion.div initial={{ scale: 0.92, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.92, opacity: 0 }}
            style={{ background: '#0d1526', border: '1px solid rgba(0,229,255,0.18)', borderRadius: '1.25rem', width: '100%', maxWidth: 560, maxHeight: '90vh', overflowY: 'auto', boxShadow: '0 0 60px rgba(0,229,255,0.1)' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '1.25rem 1.5rem', borderBottom: '1px solid rgba(0,229,255,0.08)', background: 'rgba(0,229,255,0.03)' }}>
                <h2 style={{ fontFamily: "'Rajdhani', sans-serif", fontSize: '1.15rem', fontWeight: 700, color: '#e2eaf7', display: 'flex', alignItems: 'center', gap: 8 }}>
                    <i className={`fa-solid ${icon}`} style={{ color: '#00e5ff', fontSize: 14 }}></i> {title}
                </h2>
                <button onClick={onClose} style={{ color: '#3d5278', background: 'none', border: 'none', cursor: 'pointer', padding: 4 }}>
                    <FaXmark size={18} />
                </button>
            </div>
            {children}
        </motion.div>
    </motion.div>
);

const buildEmptyOrderForm = () => ({
    customerId: '',
    customerName: '',
    customerEmail: '',
    orderType: 'dine-in',
    tableNumber: '',
    status: 'pending',
    notes: '',
    contactPhone: '',
    pickupName: '',
    pickupPhone: '',
    deliveryAddress: '',
    onlinePaymentMethod: 'card',
    onlinePaymentReference: ''
});
const emptyItemForm = { menuItemId: '', itemName: '', quantity: 1, unitPrice: '', specialInstructions: '' };
const emptyQuickCustomerForm = { firstName: '', lastName: '', email: '', password: '', phone: '' };

const OrderManagement = () => {
    const navigate = useNavigate();
    const [orders, setOrders] = useState([]);
    const [customers, setCustomers] = useState([]);
    const [menuItems, setMenuItems] = useState([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [showOrderModal, setShowOrderModal] = useState(false);
    const [showItemModal, setShowItemModal] = useState(false);
    const [showQrModal, setShowQrModal] = useState(false);
    const [editingOrder, setEditingOrder] = useState(null);
    const [editingItem, setEditingItem] = useState(null);
    const [selectedOrder, setSelectedOrder] = useState(null);
    const [showQuickCustomer, setShowQuickCustomer] = useState(false);
    const [formData, setFormData] = useState(buildEmptyOrderForm());
    const [itemForm, setItemForm] = useState(emptyItemForm);
    const [orderItems, setOrderItems] = useState([]);
    const [quickCustForm, setQuickCustForm] = useState(emptyQuickCustomerForm);
    const [qrPreview, setQrPreview] = useState({ title: '', image: '' });
    const [availableTables, setAvailableTables] = useState([]);
    const [tablesLoading, setTablesLoading] = useState(false);

    useEffect(() => {
        fetchAll();
    }, []);

    useEffect(() => {
        if (showOrderModal && formData.orderType === 'dine-in') {
            fetchAvailableTables(formData.tableNumber);
        }
    }, [showOrderModal, formData.orderType]);

    const fetchAll = async () => {
        try {
            const [ordersRes, customersRes, menuRes] = await Promise.all([
                API.get('/orders').catch(() => ({ data: [] })),
                API.get('/users/all').catch(() => ({ data: [] })),
                API.get('/menu/items').catch(() => ({ data: [] }))
            ]);

            setOrders(ordersRes.data);
            setCustomers(customersRes.data.filter((user) => user.role === 'customer'));
            setMenuItems(menuRes.data.filter((item) => item.isAvailable));
        } catch {
            toast.error('Failed to load order data');
        } finally {
            setLoading(false);
        }
    };

    const validateOrderForm = () => {
        if (!formData.customerName.trim()) return 'Customer name is required';
        if (formData.customerEmail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.customerEmail)) return 'Customer email is invalid';
        if (formData.orderType === 'dine-in' && !formData.tableNumber) return 'Table number is required for dine-in orders';
        if (formData.orderType === 'takeaway') {
            if (!formData.pickupName.trim()) return 'Pickup name is required for takeaway orders';
            if (!/^\+?\d{9,15}$/.test(sanitizePhone(formData.pickupPhone || formData.contactPhone))) return 'Pickup phone must contain 9 to 15 digits';
        }
        if (formData.orderType === 'online') {
            if (!/^\+?\d{9,15}$/.test(sanitizePhone(formData.contactPhone || formData.pickupPhone))) return 'Contact phone must contain 9 to 15 digits';
            if (!formData.deliveryAddress.trim()) return 'Delivery address is required for online orders';
            if (!formData.onlinePaymentMethod) return 'Payment method is required for online orders';
            if (!formData.onlinePaymentReference.trim()) return 'Payment reference is required for online orders';
        }
        if (formData.notes.trim().length > 500) return 'Notes are too long';
        if (!editingOrder && orderItems.length === 0) return 'Add at least one item to the order';
        return '';
    };

    const validateItemForm = () => {
        if (!itemForm.itemName.trim()) return 'Item name is required';
        if (!itemForm.quantity || parseInt(itemForm.quantity, 10) < 1) return 'Quantity must be at least 1';
        if (!itemForm.unitPrice || parseFloat(itemForm.unitPrice) <= 0) return 'Unit price must be greater than 0';
        if (itemForm.specialInstructions && itemForm.specialInstructions.length > 255) return 'Special instructions are too long';
        return '';
    };

    const resetForm = () => {
        setFormData(buildEmptyOrderForm());
        setOrderItems([]);
        setItemForm(emptyItemForm);
        setShowQuickCustomer(false);
        setQuickCustForm(emptyQuickCustomerForm);
        setAvailableTables([]);
    };

    const fetchAvailableTables = async (selectedTableNumber = '') => {
        setTablesLoading(true);

        try {
            const response = await API.get(`/tables/tables?date=${getTodayString()}`);
            const dineInTables = response.data.filter((table) => table.displayStatus === 'available' || String(table.tableNumber) === String(selectedTableNumber));
            setAvailableTables(dineInTables);
            setFormData((current) => ({
                ...current,
                tableNumber: dineInTables.some((table) => String(table.tableNumber) === String(current.tableNumber))
                    ? current.tableNumber
                    : ''
            }));
        } catch {
            setAvailableTables([]);
            toast.error('Failed to load available tables');
        } finally {
            setTablesLoading(false);
        }
    };

    const selectCustomer = (customerId) => {
        const customer = customers.find((item) => item.id === parseInt(customerId, 10));
        if (!customer) {
            setFormData((current) => ({ ...current, customerId: '', customerName: '', customerEmail: '', contactPhone: '', pickupPhone: '', pickupName: '' }));
            return;
        }
        setFormData((current) => ({
            ...current,
            customerId: customer.id,
            customerName: `${customer.firstName} ${customer.lastName}`,
            customerEmail: customer.email || '',
            contactPhone: current.contactPhone || customer.phone || '',
            pickupPhone: current.pickupPhone || customer.phone || '',
            pickupName: current.pickupName || `${customer.firstName} ${customer.lastName}`
        }));
    };

    const handleOrderTypeChange = (orderType) => {
        setFormData((current) => ({
            ...current,
            orderType,
            tableNumber: orderType === 'dine-in' ? current.tableNumber : '',
            onlinePaymentMethod: orderType === 'online' ? current.onlinePaymentMethod || 'card' : 'card',
            onlinePaymentReference: orderType === 'online' ? current.onlinePaymentReference : ''
        }));
    };

    const selectMenuItem = (menuItemId) => {
        const menuItem = menuItems.find((item) => item.id === parseInt(menuItemId, 10));
        if (!menuItem) {
            setItemForm((current) => ({ ...current, menuItemId: '', itemName: '', unitPrice: '' }));
            return;
        }
        setItemForm((current) => ({
            ...current,
            menuItemId: menuItem.id,
            itemName: menuItem.name,
            unitPrice: parseFloat(menuItem.price).toFixed(2)
        }));
    };

    const addItemToOrder = () => {
        const errorMessage = validateItemForm();
        if (errorMessage) {
            toast.error(errorMessage);
            return;
        }

        setOrderItems((current) => ([
            ...current,
            {
                id: Date.now(),
                menuItemId: itemForm.menuItemId || null,
                itemName: itemForm.itemName.trim(),
                quantity: parseInt(itemForm.quantity, 10),
                unitPrice: parseFloat(itemForm.unitPrice),
                specialInstructions: itemForm.specialInstructions.trim()
            }
        ]));
        setItemForm(emptyItemForm);
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        const errorMessage = validateOrderForm();
        if (errorMessage) {
            toast.error(errorMessage);
            return;
        }

        const payload = {
            customerId: formData.customerId || null,
            customerName: formData.customerName.trim(),
            customerEmail: formData.customerEmail.trim(),
            orderType: formData.orderType,
            tableNumber: formData.orderType === 'dine-in' ? parseInt(formData.tableNumber, 10) : null,
            status: formData.status,
            contactPhone: ['takeaway', 'online'].includes(formData.orderType) ? sanitizePhone(formData.contactPhone || formData.pickupPhone) : '',
            pickupName: formData.orderType === 'takeaway' ? formData.pickupName.trim() : '',
            pickupPhone: formData.orderType === 'takeaway' ? sanitizePhone(formData.pickupPhone || formData.contactPhone) : '',
            deliveryAddress: formData.orderType === 'online' ? formData.deliveryAddress.trim() : '',
            onlinePaymentMethod: formData.orderType === 'online' ? formData.onlinePaymentMethod : '',
            onlinePaymentReference: formData.orderType === 'online' ? formData.onlinePaymentReference.trim() : '',
            notes: formData.notes.trim(),
            items: orderItems.map((item) => ({
                menuItemId: item.menuItemId || undefined,
                itemName: item.itemName,
                quantity: item.quantity,
                unitPrice: item.unitPrice,
                specialInstructions: item.specialInstructions
            }))
        };

        try {
            if (editingOrder) {
                await API.put(`/orders/${editingOrder.id}`, payload);
                toast.success('Order updated');
            } else {
                await API.post('/orders', payload);
                toast.success('Order created');
            }
            setShowOrderModal(false);
            setEditingOrder(null);
            resetForm();
            fetchAll();
        } catch (error) {
            toast.error(error.response?.data?.message || 'Failed to save order');
        }
    };

    const handleItemSubmit = async (e) => {
        e.preventDefault();
        const errorMessage = validateItemForm();
        if (errorMessage) {
            toast.error(errorMessage);
            return;
        }

        try {
            const payload = {
                itemName: itemForm.itemName.trim(),
                quantity: parseInt(itemForm.quantity, 10),
                unitPrice: parseFloat(itemForm.unitPrice),
                specialInstructions: itemForm.specialInstructions.trim()
            };

            if (editingItem) {
                await API.put(`/orders/items/${editingItem.id}`, payload);
                toast.success('Order item updated');
            } else {
                await API.post('/orders/items', { ...payload, orderId: selectedOrder.id });
                toast.success('Order item added');
            }

            setShowItemModal(false);
            setEditingItem(null);
            setItemForm(emptyItemForm);
            fetchAll();
        } catch (error) {
            toast.error(error.response?.data?.message || 'Failed to save order item');
        }
    };

    const handleDelete = async (id) => {
        if (!confirm('Delete this order?')) return;
        try {
            await API.delete(`/orders/${id}`);
            toast.success('Order deleted');
            fetchAll();
        } catch {
            toast.error('Failed to delete order');
        }
    };

    const handleDeleteItem = async (id) => {
        if (!confirm('Delete this order item?')) return;
        try {
            await API.delete(`/orders/items/${id}`);
            toast.success('Order item deleted');
            fetchAll();
        } catch {
            toast.error('Failed to delete order item');
        }
    };

    const handleQuickAddCustomer = async (e) => {
        e.preventDefault();
        if (!quickCustForm.firstName.trim() || !quickCustForm.lastName.trim()) {
            toast.error('Customer first name and last name are required');
            return;
        }
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(quickCustForm.email)) {
            toast.error('Customer email is invalid');
            return;
        }
        if (quickCustForm.phone && !/^\+?\d{9,15}$/.test(quickCustForm.phone.replace(/\s/g, ''))) {
            toast.error('Customer phone number must contain 9 to 15 digits');
            return;
        }
        if (quickCustForm.password.length < 6) {
            toast.error('Customer password must be at least 6 characters');
            return;
        }

        try {
            await API.post('/users/register', quickCustForm);
            toast.success('Customer created');
            const customersRes = await API.get('/users/all');
            const customerList = customersRes.data.filter((user) => user.role === 'customer');
            setCustomers(customerList);
            const createdCustomer = customerList.find((user) => user.email === quickCustForm.email);
            if (createdCustomer) {
                setFormData((current) => ({
                    ...current,
                    customerId: createdCustomer.id,
                    customerName: `${createdCustomer.firstName} ${createdCustomer.lastName}`,
                    customerEmail: createdCustomer.email,
                    contactPhone: current.contactPhone || createdCustomer.phone || '',
                    pickupPhone: current.pickupPhone || createdCustomer.phone || '',
                    pickupName: current.pickupName || `${createdCustomer.firstName} ${createdCustomer.lastName}`
                }));
            }
            setShowQuickCustomer(false);
            setQuickCustForm(emptyQuickCustomerForm);
        } catch (error) {
            toast.error(error.response?.data?.message || 'Failed to create customer');
        }
    };

    const openEdit = (order) => {
        const fulfillment = order.fulfillmentDetails || {};
        setEditingOrder(order);
        setFormData({
            ...buildEmptyOrderForm(),
            customerId: order.customerId || '',
            customerName: order.customerName,
            customerEmail: order.customerEmail || '',
            orderType: order.orderType,
            tableNumber: order.tableNumber || '',
            status: order.status,
            notes: order.customerNotes || order.notes || '',
            contactPhone: fulfillment.contactPhone || fulfillment.pickupPhone || '',
            pickupName: fulfillment.pickupName || order.customerName,
            pickupPhone: fulfillment.pickupPhone || fulfillment.contactPhone || '',
            deliveryAddress: fulfillment.deliveryAddress || '',
            onlinePaymentMethod: fulfillment.onlinePaymentMethod || 'card',
            onlinePaymentReference: fulfillment.onlinePaymentReference || ''
        });
        setOrderItems([]);
        setShowOrderModal(true);
    };

    const openAddItem = (order) => {
        setSelectedOrder(order);
        setEditingItem(null);
        setItemForm(emptyItemForm);
        setShowItemModal(true);
    };

    const openEditItem = (order, item) => {
        setSelectedOrder(order);
        setEditingItem(item);
        setItemForm({
            menuItemId: item.menuItemId || '',
            itemName: item.itemName,
            quantity: item.quantity,
            unitPrice: String(item.unitPrice),
            specialInstructions: item.specialInstructions || ''
        });
        setShowItemModal(true);
    };

    const openNewOrder = () => {
        setEditingOrder(null);
        resetForm();
        setShowOrderModal(true);
    };

    const previewOrderQr = async (order) => {
        try {
            const response = await API.get(`/orders/${order.id}/qr`);
            setQrPreview({ title: order.orderNumber, image: response.data.qrDataUrl });
            setShowQrModal(true);
        } catch {
            toast.error('Failed to load order QR');
        }
    };

    const sendOrderEmail = async (order) => {
        try {
            await API.post(`/orders/${order.id}/send-email`);
            toast.success('Order email sent');
        } catch (error) {
            toast.error(error.response?.data?.message || 'Failed to send order email');
        }
    };

    const exportOrders = async () => {
        try {
            await downloadApiFile('/orders/export/file', 'orders-report.xlsx');
            toast.success('Orders report downloaded');
        } catch {
            toast.error('Failed to download order report');
        }
    };

    const exportOrdersPdf = async () => {
        try {
            await downloadApiFile('/orders/export/pdf', 'orders-report.pdf');
            toast.success('Orders PDF downloaded');
        } catch {
            toast.error('Failed to download order PDF');
        }
    };

    const filteredOrders = orders.filter((order) =>
        order.orderNumber?.toLowerCase().includes(search.toLowerCase())
        || order.customerName?.toLowerCase().includes(search.toLowerCase())
        || order.status?.toLowerCase().includes(search.toLowerCase())
    );

    const orderItemsTotal = orderItems.reduce((sum, item) => sum + item.quantity * parseFloat(item.unitPrice || 0), 0);
    const allowedStatusOptions = getAllowedStatusOptions(editingOrder?.status || 'pending', !!editingOrder);
    const statusTransitionHint = editingOrder
        ? `Current status: ${formatLabel(editingOrder.status)}. You can move forward, cancel, or complete the order.`
        : 'New orders always start as pending.';

    return (
        <div style={{ fontFamily: "'Inter', sans-serif" }}>
            <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="page-header">
                <div>
                    <h1 className="page-title"><i className="fa-solid fa-cart-shopping" style={{ color: '#00e5ff', marginRight: 10 }}></i>Order Management</h1>
                    <p className="page-subtitle">Manage orders, item validation, exports, QR tokens, and order emails</p>
                </div>
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                    <button onClick={exportOrders} className="btn-neon-cyan">
                        <FaDownload style={{ fontSize: 12 }} /> Orders Excel
                    </button>
                    <button onClick={exportOrdersPdf} className="btn-neon-cyan">
                        <FaDownload style={{ fontSize: 12 }} /> Orders PDF
                    </button>
                    <button onClick={openNewOrder} className="btn-solid-cyan">
                        <FaPlus style={{ fontSize: 12 }} /> New Order
                    </button>
                </div>
            </motion.div>

            <div className="section-card" style={{ marginBottom: '1.25rem' }}>
                <div style={{ padding: '0.875rem 1.25rem', display: 'flex', alignItems: 'center', gap: 10 }}>
                    <div style={{ position: 'relative', flex: 1, maxWidth: 380 }}>
                        <i className="fa-solid fa-magnifying-glass" style={{ position: 'absolute', left: '0.875rem', top: '50%', transform: 'translateY(-50%)', color: '#3d5278', fontSize: 12 }}></i>
                        <input type="text" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search by order number, customer, or status..." className="input-dark" style={{ paddingLeft: '2.5rem' }} />
                    </div>
                    <div className="badge badge-info"><span className="dot-live" style={{ width: 5, height: 5 }}></span>{orders.length} Orders</div>
                </div>
            </div>

            {loading ? (
                <div style={{ display: 'flex', justifyContent: 'center', padding: '4rem 0' }}>
                    <div style={{ width: 36, height: 36, borderRadius: '50%', border: '2px solid rgba(0,229,255,0.2)', borderTopColor: '#00e5ff', animation: 'spin 0.8s linear infinite' }} />
                </div>
            ) : (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '1rem' }}>
                    {filteredOrders.map((order) => {
                        const fulfillment = order.fulfillmentDetails || {};

                        return (
                            <div key={order.id} style={{ background: 'rgba(13,21,38,0.7)', border: '1px solid rgba(0,229,255,0.1)', borderRadius: '0.875rem', overflow: 'hidden' }}>
                                <div style={{ padding: '1rem 1.125rem' }}>
                                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.75rem' }}>
                                        <h3 style={{ fontSize: '0.85rem', fontWeight: 700, color: '#00e5ff', fontFamily: "'Rajdhani', sans-serif" }}>{order.orderNumber}</h3>
                                        <span className={`badge ${statusBadge(order.status)}`}>{order.status}</span>
                                    </div>
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                                        <p style={{ fontSize: '0.78rem', color: '#c2d3f0' }}>{order.customerName}</p>
                                        {order.customerEmail && <p style={{ fontSize: '0.72rem', color: '#6b84b0' }}>{order.customerEmail}</p>}
                                        <div style={{ display: 'flex', gap: 16, fontSize: '0.77rem', color: '#6b84b0', flexWrap: 'wrap' }}>
                                            <span>{formatLabel(order.orderType)}</span>
                                            {order.tableNumber && <span>Table #{order.tableNumber}</span>}
                                            {fulfillment.paymentNumber && <span>{fulfillment.paymentNumber}</span>}
                                        </div>
                                        <p style={{ fontFamily: "'Rajdhani', sans-serif", fontSize: '1.2rem', fontWeight: 700, color: '#e2eaf7' }}>LKR {parseFloat(order.totalAmount).toFixed(2)}</p>
                                    </div>

                                    {(order.orderType !== 'dine-in' || order.customerNotes) && (
                                        <div style={{ marginTop: '0.75rem', display: 'flex', flexDirection: 'column', gap: 8 }}>
                                            {order.orderType === 'takeaway' && (
                                                <div style={{ background: 'rgba(245,158,11,0.08)', border: '1px solid rgba(245,158,11,0.14)', borderRadius: 8, padding: '0.65rem 0.75rem' }}>
                                                    <p style={{ fontSize: '0.64rem', color: '#f59e0b', textTransform: 'uppercase', letterSpacing: '0.08em', fontWeight: 700 }}>Pickup Details</p>
                                                    <p style={{ color: '#c2d3f0', fontSize: '0.78rem', marginTop: 4 }}>{fulfillment.pickupName || order.customerName}</p>
                                                    <p style={{ color: '#6b84b0', fontSize: '0.72rem', marginTop: 4 }}>Phone: {fulfillment.pickupPhone || fulfillment.contactPhone || '-'}</p>
                                                </div>
                                            )}

                                            {order.orderType === 'online' && (
                                                <div style={{ background: 'rgba(168,85,247,0.08)', border: '1px solid rgba(168,85,247,0.14)', borderRadius: 8, padding: '0.65rem 0.75rem' }}>
                                                    <p style={{ fontSize: '0.64rem', color: '#a855f7', textTransform: 'uppercase', letterSpacing: '0.08em', fontWeight: 700 }}>Online Fulfillment</p>
                                                    {fulfillment.deliveryAddress && <p style={{ color: '#c2d3f0', fontSize: '0.78rem', lineHeight: 1.5, marginTop: 4 }}>{fulfillment.deliveryAddress}</p>}
                                                    <div style={{ display: 'flex', flexDirection: 'column', gap: 3, marginTop: 6, color: '#6b84b0', fontSize: '0.72rem' }}>
                                                        <span>Contact: {fulfillment.contactPhone || fulfillment.pickupPhone || '-'}</span>
                                                        <span>Method: {formatLabel(fulfillment.onlinePaymentMethod) || '-'}</span>
                                                        <span>Reference: {fulfillment.onlinePaymentReference || '-'}</span>
                                                        {fulfillment.paymentNumber && <span>Payment: {fulfillment.paymentNumber}</span>}
                                                    </div>
                                                </div>
                                            )}

                                            {order.customerNotes && (
                                                <div style={{ background: 'rgba(0,0,0,0.18)', borderRadius: 8, padding: '0.6rem 0.75rem' }}>
                                                    <p style={{ fontSize: '0.64rem', color: '#3d5278', textTransform: 'uppercase', letterSpacing: '0.08em', fontWeight: 700 }}>Order Note</p>
                                                    <p style={{ color: '#c2d3f0', fontSize: '0.75rem', lineHeight: 1.5, marginTop: 4 }}>{order.customerNotes}</p>
                                                </div>
                                            )}
                                        </div>
                                    )}

                                    {order.items?.length > 0 && (
                                        <div style={{ marginTop: '0.75rem', paddingTop: '0.75rem', borderTop: '1px solid rgba(0,229,255,0.07)' }}>
                                            <span style={{ fontSize: '0.68rem', color: '#3d5278', textTransform: 'uppercase', letterSpacing: '0.08em', fontWeight: 700 }}>Items ({order.items.length})</span>
                                            <div style={{ display: 'flex', flexDirection: 'column', gap: 4, marginTop: 6 }}>
                                                {order.items.slice(0, 3).map((item) => (
                                                    <div key={item.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: 'rgba(0,0,0,0.2)', borderRadius: 5, padding: '0.35rem 0.5rem', fontSize: '0.72rem' }}>
                                                        <span style={{ color: '#c2d3f0' }}>{item.itemName} x{item.quantity}</span>
                                                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                                            <span style={{ color: '#6b84b0' }}>LKR {parseFloat(item.totalPrice).toFixed(2)}</span>
                                                            <button onClick={() => openEditItem(order, item)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#00e5ff', fontSize: 10 }}><i className="fa-solid fa-pen"></i></button>
                                                            <button onClick={() => handleDeleteItem(item.id)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#ef4444', fontSize: 10 }}><i className="fa-solid fa-trash"></i></button>
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    )}
                                </div>
                                <div className="card-actions" style={{ flexWrap: 'wrap', justifyContent: 'flex-start' }}>
                                    <button onClick={() => openEdit(order)} className="btn-neon-cyan" style={{ padding: '0.3rem 0.7rem', fontSize: '0.72rem' }}><i className="fa-solid fa-pen" style={{ fontSize: 10 }}></i> Edit</button>
                                    <button onClick={() => openAddItem(order)} style={{ display: 'inline-flex', alignItems: 'center', gap: 5, padding: '0.3rem 0.7rem', borderRadius: 6, fontSize: '0.72rem', fontWeight: 600, cursor: 'pointer', background: 'rgba(16,185,129,0.1)', border: '1px solid rgba(16,185,129,0.2)', color: '#10b981' }}>
                                        <FaPlus style={{ fontSize: 10 }} /> Item
                                    </button>
                                    <button onClick={() => previewOrderQr(order)} className="btn-neon-cyan" style={{ padding: '0.3rem 0.7rem', fontSize: '0.72rem' }}>
                                        <FaQrcode style={{ fontSize: 10 }} /> QR
                                    </button>
                                    <button onClick={() => sendOrderEmail(order)} style={{ display: 'inline-flex', alignItems: 'center', gap: 5, padding: '0.3rem 0.7rem', borderRadius: 6, fontSize: '0.72rem', fontWeight: 600, cursor: 'pointer', background: 'rgba(245,158,11,0.1)', border: '1px solid rgba(245,158,11,0.2)', color: '#f59e0b' }}>
                                        <FaEnvelope style={{ fontSize: 10 }} /> Email
                                    </button>
                                    {(order.status === 'completed' || order.status === 'ready') && !fulfillment.paymentNumber && (
                                        <button onClick={() => navigate('/payments')} style={{ display: 'inline-flex', alignItems: 'center', gap: 5, padding: '0.3rem 0.7rem', borderRadius: 6, fontSize: '0.72rem', fontWeight: 600, cursor: 'pointer', background: 'rgba(168,85,247,0.1)', border: '1px solid rgba(168,85,247,0.2)', color: '#a855f7' }}>
                                            <i className="fa-solid fa-credit-card" style={{ fontSize: 10 }}></i> Pay
                                        </button>
                                    )}
                                    <button onClick={() => handleDelete(order.id)} className="btn-danger" style={{ padding: '0.3rem 0.7rem', fontSize: '0.72rem' }}><i className="fa-solid fa-trash" style={{ fontSize: 10 }}></i> Delete</button>
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}

            <AnimatePresence>
                {showOrderModal && (
                    <ModalBox title={editingOrder ? 'Edit Order' : 'New Order'} icon="fa-cart-shopping" onClose={() => setShowOrderModal(false)}>
                        <form onSubmit={handleSubmit} style={{ padding: '1.25rem 1.5rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                            <div>
                                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 5 }}>
                                    <FieldLabel icon="fa-user">Customer</FieldLabel>
                                    <button type="button" onClick={() => setShowQuickCustomer(!showQuickCustomer)} style={{ fontSize: '0.7rem', color: '#00e5ff', background: 'none', border: 'none', cursor: 'pointer' }}>
                                        {showQuickCustomer ? 'Cancel' : 'New Customer'}
                                    </button>
                                </div>
                                {showQuickCustomer ? (
                                    <div style={{ background: 'rgba(0,229,255,0.04)', border: '1px solid rgba(0,229,255,0.12)', borderRadius: 8, padding: '0.875rem', display: 'flex', flexDirection: 'column', gap: 8 }}>
                                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                                            <input type="text" placeholder="First name" value={quickCustForm.firstName} onChange={(e) => setQuickCustForm({ ...quickCustForm, firstName: e.target.value })} className="input-dark" style={{ fontSize: '0.78rem' }} />
                                            <input type="text" placeholder="Last name" value={quickCustForm.lastName} onChange={(e) => setQuickCustForm({ ...quickCustForm, lastName: e.target.value })} className="input-dark" style={{ fontSize: '0.78rem' }} />
                                        </div>
                                        <input type="email" placeholder="Email" value={quickCustForm.email} onChange={(e) => setQuickCustForm({ ...quickCustForm, email: e.target.value })} className="input-dark" style={{ fontSize: '0.78rem' }} />
                                        <input type="password" placeholder="Password" value={quickCustForm.password} onChange={(e) => setQuickCustForm({ ...quickCustForm, password: e.target.value })} className="input-dark" style={{ fontSize: '0.78rem' }} />
                                        <input type="text" placeholder="Phone" value={quickCustForm.phone} onChange={(e) => setQuickCustForm({ ...quickCustForm, phone: e.target.value })} className="input-dark" style={{ fontSize: '0.78rem' }} />
                                        <button type="button" onClick={handleQuickAddCustomer} className="btn-solid-cyan" style={{ fontSize: '0.78rem', padding: '0.45rem' }}>Create &amp; Select</button>
                                    </div>
                                ) : (
                                    <select value={formData.customerId} onChange={(e) => selectCustomer(e.target.value)} className="input-dark">
                                        <option value="">Select customer</option>
                                        {customers.map((customer) => (
                                            <option key={customer.id} value={customer.id}>{customer.firstName} {customer.lastName} ({customer.email})</option>
                                        ))}
                                    </select>
                                )}
                            </div>

                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                                <div>
                                    <FieldLabel icon="fa-user">Customer Name</FieldLabel>
                                    <input type="text" value={formData.customerName} onChange={(e) => setFormData({ ...formData, customerName: e.target.value })} className="input-dark" />
                                </div>
                                <div>
                                    <FieldLabel icon="fa-envelope">Customer Email</FieldLabel>
                                    <input type="email" value={formData.customerEmail} onChange={(e) => setFormData({ ...formData, customerEmail: e.target.value })} className="input-dark" />
                                </div>
                            </div>

                            <div style={{ display: 'grid', gridTemplateColumns: formData.orderType === 'dine-in' ? '1fr 1fr' : '1fr', gap: '0.75rem' }}>
                                <div>
                                    <FieldLabel icon="fa-utensils">Order Type</FieldLabel>
                                    <select value={formData.orderType} onChange={(e) => handleOrderTypeChange(e.target.value)} className="input-dark">
                                        <option value="dine-in">Dine In</option>
                                        <option value="takeaway">Takeaway</option>
                                        <option value="online">Online</option>
                                    </select>
                                </div>
                                {formData.orderType === 'dine-in' && (
                                    <div>
                                        <FieldLabel icon="fa-chair">Table</FieldLabel>
                                        {tablesLoading ? (
                                            <div className="input-dark" style={{ display: 'flex', alignItems: 'center', minHeight: 42, color: '#6b84b0' }}>
                                                Loading available tables...
                                            </div>
                                        ) : (
                                            <select value={formData.tableNumber} onChange={(e) => setFormData({ ...formData, tableNumber: e.target.value })} className="input-dark">
                                                <option value="">Select table</option>
                                                {availableTables.map((table) => (
                                                    <option key={table.id} value={table.tableNumber}>Table {table.tableNumber} ({table.seatingCapacity} seats, {formatLabel(table.location)})</option>
                                                ))}
                                            </select>
                                        )}
                                        {!tablesLoading && availableTables.length === 0 && (
                                            <p style={{ color: '#ef4444', fontSize: '0.72rem', marginTop: 6 }}>No dine-in tables are currently available for today.</p>
                                        )}
                                    </div>
                                )}
                            </div>

                            {formData.orderType === 'takeaway' && (
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                                    <div style={{ background: 'rgba(245,158,11,0.08)', border: '1px solid rgba(245,158,11,0.16)', borderRadius: 8, padding: '0.75rem 0.85rem' }}>
                                        <p style={{ color: '#f59e0b', fontSize: '0.72rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 4 }}>Takeaway Pickup</p>
                                        <p style={{ color: '#6b84b0', fontSize: '0.76rem' }}>Collect the pickup name and contact number so kitchen and counter staff can verify the order.</p>
                                    </div>
                                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                                        <div>
                                            <FieldLabel icon="fa-user">Pickup Name</FieldLabel>
                                            <input type="text" value={formData.pickupName} onChange={(e) => setFormData({ ...formData, pickupName: e.target.value })} className="input-dark" />
                                        </div>
                                        <div>
                                            <FieldLabel icon="fa-phone">Pickup Phone</FieldLabel>
                                            <input type="text" value={formData.pickupPhone} onChange={(e) => setFormData({ ...formData, pickupPhone: e.target.value, contactPhone: e.target.value })} className="input-dark" placeholder="+94 71 234 5678" />
                                        </div>
                                    </div>
                                </div>
                            )}

                            {formData.orderType === 'online' && (
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                                    <div style={{ background: 'rgba(168,85,247,0.08)', border: '1px solid rgba(168,85,247,0.16)', borderRadius: 8, padding: '0.75rem 0.85rem' }}>
                                        <p style={{ color: '#a855f7', fontSize: '0.72rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 4 }}>Online Delivery and Payment</p>
                                        <p style={{ color: '#6b84b0', fontSize: '0.76rem' }}>Online orders need a delivery address, payment method, and payment reference so the linked payment record stays complete.</p>
                                    </div>
                                    <div>
                                        <FieldLabel icon="fa-phone">Contact Phone</FieldLabel>
                                        <input type="text" value={formData.contactPhone} onChange={(e) => setFormData({ ...formData, contactPhone: e.target.value })} className="input-dark" placeholder="+94 71 234 5678" />
                                    </div>
                                    <div>
                                        <FieldLabel icon="fa-location-dot">Delivery Address</FieldLabel>
                                        <textarea value={formData.deliveryAddress} onChange={(e) => setFormData({ ...formData, deliveryAddress: e.target.value })} className="input-dark" rows={2} style={{ resize: 'vertical', minHeight: 72 }} />
                                    </div>
                                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                                        <div>
                                            <FieldLabel icon="fa-credit-card">Payment Method</FieldLabel>
                                            <select value={formData.onlinePaymentMethod} onChange={(e) => setFormData({ ...formData, onlinePaymentMethod: e.target.value })} className="input-dark">
                                                <option value="card">Card</option>
                                                <option value="bank_transfer">Bank Transfer</option>
                                                <option value="digital_wallet">Digital Wallet</option>
                                            </select>
                                        </div>
                                        <div>
                                            <FieldLabel icon="fa-receipt">Payment Reference</FieldLabel>
                                            <input type="text" value={formData.onlinePaymentReference} onChange={(e) => setFormData({ ...formData, onlinePaymentReference: e.target.value })} className="input-dark" placeholder="e.g. TXN-20491" />
                                        </div>
                                    </div>
                                </div>
                            )}

                            <div>
                                <FieldLabel icon="fa-circle-dot">Status</FieldLabel>
                                <select
                                    value={formData.status}
                                    onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                                    className="input-dark"
                                    disabled={!editingOrder}
                                >
                                    {allowedStatusOptions.map((option) => (
                                        <option key={option.value} value={option.value}>{option.label}</option>
                                    ))}
                                </select>
                                <p style={{ color: '#6b84b0', fontSize: '0.72rem', marginTop: 6 }}>{statusTransitionHint}</p>
                            </div>

                            {!editingOrder && (
                                <div>
                                    <FieldLabel icon="fa-book-open">Menu Items</FieldLabel>
                                    <div style={{ background: 'rgba(0,0,0,0.2)', border: '1px solid rgba(0,229,255,0.08)', borderRadius: 8, padding: '0.75rem', display: 'flex', flexDirection: 'column', gap: 8 }}>
                                        <div style={{ display: 'grid', gridTemplateColumns: '1fr auto auto auto', gap: 6, alignItems: 'end' }}>
                                            <select value={itemForm.menuItemId} onChange={(e) => selectMenuItem(e.target.value)} className="input-dark" style={{ fontSize: '0.75rem' }}>
                                                <option value="">Pick item...</option>
                                                {menuItems.map((item) => (
                                                    <option key={item.id} value={item.id}>{item.name} - LKR {parseFloat(item.price).toFixed(2)}</option>
                                                ))}
                                            </select>
                                            <input type="number" min="1" value={itemForm.quantity} onChange={(e) => setItemForm({ ...itemForm, quantity: e.target.value })} className="input-dark" style={{ width: 60, fontSize: '0.75rem', textAlign: 'center' }} />
                                            <input type="number" step="0.01" value={itemForm.unitPrice} onChange={(e) => setItemForm({ ...itemForm, unitPrice: e.target.value })} className="input-dark" style={{ width: 90, fontSize: '0.75rem' }} />
                                            <button type="button" onClick={addItemToOrder} className="btn-solid-cyan" style={{ fontSize: '0.75rem', padding: '0.45rem 0.75rem' }}>
                                                <FaPlus style={{ fontSize: 10 }} /> Add
                                            </button>
                                        </div>
                                        <input type="text" placeholder="Special instructions" value={itemForm.specialInstructions} onChange={(e) => setItemForm({ ...itemForm, specialInstructions: e.target.value })} className="input-dark" style={{ fontSize: '0.75rem' }} />
                                        {orderItems.length > 0 && (
                                            <div style={{ borderTop: '1px solid rgba(0,229,255,0.07)', paddingTop: '0.5rem', display: 'flex', flexDirection: 'column', gap: 4 }}>
                                                {orderItems.map((item) => (
                                                    <div key={item.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'rgba(0,229,255,0.04)', borderRadius: 6, padding: '0.35rem 0.6rem', fontSize: '0.75rem' }}>
                                                        <span style={{ color: '#c2d3f0' }}>{item.itemName} x{item.quantity}</span>
                                                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                                            <span style={{ color: '#00e5ff', fontWeight: 600 }}>LKR {(item.quantity * parseFloat(item.unitPrice)).toFixed(2)}</span>
                                                            <button type="button" onClick={() => setOrderItems((current) => current.filter((entry) => entry.id !== item.id))} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#ef4444' }}>
                                                                <FaMinus style={{ fontSize: 10 }} />
                                                            </button>
                                                        </div>
                                                    </div>
                                                ))}
                                                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.78rem', fontWeight: 700, color: '#00e5ff', paddingTop: 4 }}>
                                                    <span>Total:</span><span>LKR {orderItemsTotal.toFixed(2)}</span>
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            )}

                            <div>
                                <FieldLabel icon="fa-note-sticky">Notes</FieldLabel>
                                <textarea value={formData.notes} onChange={(e) => setFormData({ ...formData, notes: e.target.value })} className="input-dark" rows={2} style={{ resize: 'vertical', minHeight: 60 }} />
                            </div>

                            <div style={{ display: 'flex', gap: 10 }}>
                                <button type="button" onClick={() => setShowOrderModal(false)} className="btn-neon-cyan" style={{ flex: 1, justifyContent: 'center' }}>Cancel</button>
                                <button type="submit" className="btn-solid-cyan" style={{ flex: 1, justifyContent: 'center' }}>{editingOrder ? 'Update' : 'Create'} Order</button>
                            </div>
                        </form>
                    </ModalBox>
                )}
            </AnimatePresence>

            <AnimatePresence>
                {showItemModal && (
                    <ModalBox title={editingItem ? 'Edit Item' : 'Add Item'} icon="fa-plus" onClose={() => setShowItemModal(false)}>
                        <form onSubmit={handleItemSubmit} style={{ padding: '1.25rem 1.5rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                            {!editingItem && (
                                <div>
                                    <FieldLabel icon="fa-book-open">Select Menu Item</FieldLabel>
                                    <select value={itemForm.menuItemId} onChange={(e) => selectMenuItem(e.target.value)} className="input-dark">
                                        <option value="">Pick from menu</option>
                                        {menuItems.map((item) => (
                                            <option key={item.id} value={item.id}>{item.name} - LKR {parseFloat(item.price).toFixed(2)}</option>
                                        ))}
                                    </select>
                                </div>
                            )}
                            <div>
                                <FieldLabel icon="fa-tag">Item Name</FieldLabel>
                                <input type="text" value={itemForm.itemName} onChange={(e) => setItemForm({ ...itemForm, itemName: e.target.value })} className="input-dark" />
                            </div>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                                <div>
                                    <FieldLabel icon="fa-hashtag">Quantity</FieldLabel>
                                    <input type="number" min="1" value={itemForm.quantity} onChange={(e) => setItemForm({ ...itemForm, quantity: e.target.value })} className="input-dark" />
                                </div>
                                <div>
                                    <FieldLabel icon="fa-coins">Unit Price</FieldLabel>
                                    <input type="number" min="0.01" step="0.01" value={itemForm.unitPrice} onChange={(e) => setItemForm({ ...itemForm, unitPrice: e.target.value })} className="input-dark" />
                                </div>
                            </div>
                            <div>
                                <FieldLabel icon="fa-comment">Special Instructions</FieldLabel>
                                <input type="text" value={itemForm.specialInstructions} onChange={(e) => setItemForm({ ...itemForm, specialInstructions: e.target.value })} className="input-dark" />
                            </div>
                            <div style={{ display: 'flex', gap: 10 }}>
                                <button type="button" onClick={() => setShowItemModal(false)} className="btn-neon-cyan" style={{ flex: 1, justifyContent: 'center' }}>Cancel</button>
                                <button type="submit" className="btn-solid-cyan" style={{ flex: 1, justifyContent: 'center' }}>{editingItem ? 'Update' : 'Add'} Item</button>
                            </div>
                        </form>
                    </ModalBox>
                )}
            </AnimatePresence>

            <AnimatePresence>
                {showQrModal && (
                    <ModalBox title={`QR Preview - ${qrPreview.title}`} icon="fa-qrcode" onClose={() => setShowQrModal(false)}>
                        <div style={{ padding: '1.5rem', textAlign: 'center' }}>
                            <img src={qrPreview.image} alt="Order QR" style={{ width: 240, height: 240, background: '#fff', padding: 12, borderRadius: 12 }} />
                        </div>
                    </ModalBox>
                )}
            </AnimatePresence>
        </div>
    );
};

export default OrderManagement;

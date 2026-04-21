import { useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { FaQrcode, FaXmark } from 'react-icons/fa6';
import { useNavigate } from 'react-router-dom';
import Navbar from '../components/common/Navbar';
import Footer from '../components/common/Footer';
import API from '../services/api';
import { useAuth } from '../context/AuthContext';
import toast from 'react-hot-toast';

const categoryIcons = {
    all: 'fa-border-all',
    beverage: 'fa-mug-hot',
    appetizer: 'fa-bowl-food',
    main_course: 'fa-utensils',
    dessert: 'fa-cake-candles',
    snack: 'fa-cookie-bite',
    special: 'fa-star'
};

const categoryColors = {
    all: '#00e5ff',
    beverage: '#00e5ff',
    appetizer: '#f59e0b',
    main_course: '#10b981',
    dessert: '#a855f7',
    snack: '#ef4444',
    special: '#f59e0b'
};

const getTodayString = () => {
    const today = new Date();
    const year = today.getFullYear();
    const month = String(today.getMonth() + 1).padStart(2, '0');
    const day = String(today.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
};

const buildEmptyCheckoutForm = (user) => ({
    tableNumber: '',
    customerNotes: '',
    contactPhone: user?.phone || '',
    pickupName: user ? `${user.firstName} ${user.lastName}` : '',
    deliveryAddress: '',
    onlinePaymentMethod: 'card',
    onlinePaymentReference: '',
    paymentCardLast4: ''
});

const formatLabel = (value) => String(value || '').replace(/_/g, ' ');
const sanitizeDigits = (value) => String(value || '').replace(/\D/g, '');

const buildEmptyPaymentForm = (user) => ({
    cardholderName: user ? `${user.firstName} ${user.lastName}`.trim() : '',
    cardNumber: '',
    expiry: '',
    cvv: '',
    saveCard: false
});

const formatCardNumberInput = (value) => sanitizeDigits(value).slice(0, 19).replace(/(\d{4})(?=\d)/g, '$1 ').trim();

const formatExpiryInput = (value) => {
    const digits = sanitizeDigits(value).slice(0, 4);
    if (digits.length < 3) {
        return digits;
    }
    return `${digits.slice(0, 2)}/${digits.slice(2)}`;
};

const isValidLuhn = (cardNumber) => {
    const digits = sanitizeDigits(cardNumber);
    let sum = 0;
    let shouldDouble = false;

    for (let index = digits.length - 1; index >= 0; index -= 1) {
        let digit = parseInt(digits[index], 10);
        if (shouldDouble) {
            digit *= 2;
            if (digit > 9) digit -= 9;
        }
        sum += digit;
        shouldDouble = !shouldDouble;
    }

    return digits.length >= 13 && digits.length <= 19 && sum % 10 === 0;
};

const buildCardPaymentReference = (last4) => `CARD-${Date.now().toString(36).toUpperCase()}-${last4}`;

const SuccessModal = ({ order, qrDataUrl, onClose, onViewOrders, onTrackOrder }) => {
    const fulfillment = order?.fulfillmentDetails || {};

    return (
        <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            style={{ position: 'fixed', inset: 0, background: 'rgba(7,11,20,0.85)', backdropFilter: 'blur(8px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 220, padding: '1rem' }}
        >
            <motion.div
                initial={{ scale: 0.92, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.92, opacity: 0 }}
                style={{ background: '#0d1526', border: '1px solid rgba(0,229,255,0.18)', borderRadius: '1.25rem', width: '100%', maxWidth: 620, maxHeight: '92vh', overflowY: 'auto', boxShadow: '0 0 60px rgba(0,229,255,0.1)' }}
            >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '1.25rem 1.5rem', borderBottom: '1px solid rgba(0,229,255,0.08)', background: 'rgba(0,229,255,0.03)' }}>
                    <div>
                        <h2 style={{ fontFamily: "'Rajdhani', sans-serif", color: '#e2eaf7', fontSize: '1.25rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: 8 }}>
                            <i className="fa-solid fa-circle-check" style={{ color: '#10b981', fontSize: 14 }}></i>
                            Order Confirmed
                        </h2>
                        <p style={{ color: '#6b84b0', fontSize: '0.78rem', marginTop: 4 }}>Order {order.orderNumber} is now recorded in CafeSync.</p>
                    </div>
                    <button onClick={onClose} style={{ color: '#3d5278', background: 'none', border: 'none', cursor: 'pointer', padding: 4 }}>
                        <FaXmark size={18} />
                    </button>
                </div>

                <div style={{ padding: '1.4rem 1.5rem', display: 'grid', gridTemplateColumns: '1.1fr 0.9fr', gap: '1rem' }}>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                            {[
                                { label: 'Order Number', value: order.orderNumber },
                                { label: 'Order Type', value: formatLabel(order.orderType) },
                                { label: 'Status', value: order.status },
                                { label: 'Total', value: `LKR ${parseFloat(order.totalAmount).toFixed(2)}` }
                            ].map((item) => (
                                <div key={item.label} style={{ background: 'rgba(0,0,0,0.22)', border: '1px solid rgba(0,229,255,0.08)', borderRadius: 10, padding: '0.8rem 0.9rem' }}>
                                    <p style={{ fontSize: '0.62rem', color: '#3d5278', textTransform: 'uppercase', letterSpacing: '0.07em', fontWeight: 700 }}>{item.label}</p>
                                    <p style={{ fontSize: '0.86rem', color: '#e2eaf7', fontWeight: 600, marginTop: 4 }}>{item.value}</p>
                                </div>
                            ))}
                        </div>

                        {order.orderType === 'dine-in' && (
                            <div style={{ background: 'rgba(16,185,129,0.08)', border: '1px solid rgba(16,185,129,0.18)', borderRadius: 12, padding: '0.9rem 1rem' }}>
                                <p style={{ fontSize: '0.72rem', color: '#10b981', textTransform: 'uppercase', letterSpacing: '0.08em', fontWeight: 700, marginBottom: 6 }}>Dine-in Details</p>
                                <p style={{ color: '#c2d3f0', fontSize: '0.85rem' }}>Table {order.tableNumber}</p>
                                {fulfillment.tableLocation && <p style={{ color: '#6b84b0', fontSize: '0.76rem', marginTop: 4 }}>Location: {formatLabel(fulfillment.tableLocation)}</p>}
                            </div>
                        )}

                        {order.orderType === 'takeaway' && (
                            <div style={{ background: 'rgba(245,158,11,0.08)', border: '1px solid rgba(245,158,11,0.18)', borderRadius: 12, padding: '0.9rem 1rem' }}>
                                <p style={{ fontSize: '0.72rem', color: '#f59e0b', textTransform: 'uppercase', letterSpacing: '0.08em', fontWeight: 700, marginBottom: 6 }}>Pickup Details</p>
                                <p style={{ color: '#c2d3f0', fontSize: '0.85rem' }}>{fulfillment.pickupName || order.customerName}</p>
                                {(fulfillment.pickupPhone || fulfillment.contactPhone) && <p style={{ color: '#6b84b0', fontSize: '0.76rem', marginTop: 4 }}>Phone: {fulfillment.pickupPhone || fulfillment.contactPhone}</p>}
                            </div>
                        )}

                        {order.orderType === 'online' && (
                            <div style={{ background: 'rgba(168,85,247,0.08)', border: '1px solid rgba(168,85,247,0.18)', borderRadius: 12, padding: '0.9rem 1rem' }}>
                                <p style={{ fontSize: '0.72rem', color: '#a855f7', textTransform: 'uppercase', letterSpacing: '0.08em', fontWeight: 700, marginBottom: 6 }}>Online Payment and Delivery</p>
                                {fulfillment.deliveryAddress && <p style={{ color: '#c2d3f0', fontSize: '0.82rem', lineHeight: 1.6 }}>{fulfillment.deliveryAddress}</p>}
                                <div style={{ display: 'flex', flexDirection: 'column', gap: 3, marginTop: 8, fontSize: '0.76rem', color: '#6b84b0' }}>
                                    {fulfillment.contactPhone && <span>Phone: {fulfillment.contactPhone}</span>}
                                    {fulfillment.onlinePaymentMethod && <span>Method: {formatLabel(fulfillment.onlinePaymentMethod)}</span>}
                                    {fulfillment.onlinePaymentReference && <span>Reference: {fulfillment.onlinePaymentReference}</span>}
                                    {fulfillment.paymentNumber && <span>Payment Record: {fulfillment.paymentNumber}</span>}
                                </div>
                            </div>
                        )}

                        {order.customerNotes && (
                            <div style={{ background: 'rgba(0,0,0,0.18)', border: '1px solid rgba(255,255,255,0.05)', borderRadius: 12, padding: '0.9rem 1rem' }}>
                                <p style={{ fontSize: '0.72rem', color: '#6b84b0', textTransform: 'uppercase', letterSpacing: '0.08em', fontWeight: 700, marginBottom: 6 }}>Your Notes</p>
                                <p style={{ color: '#c2d3f0', fontSize: '0.8rem', lineHeight: 1.6 }}>{order.customerNotes}</p>
                            </div>
                        )}
                    </div>

                    <div style={{ background: 'rgba(0,0,0,0.18)', border: '1px solid rgba(0,229,255,0.08)', borderRadius: 12, padding: '1rem', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', gap: '0.9rem' }}>
                        <div>
                            <p style={{ fontSize: '0.72rem', color: '#00e5ff', textTransform: 'uppercase', letterSpacing: '0.08em', fontWeight: 700, marginBottom: 8 }}>Customer QR</p>
                            <p style={{ color: '#6b84b0', fontSize: '0.76rem', lineHeight: 1.6, marginBottom: 10 }}>Use this QR and order number for quick verification and follow-up.</p>
                            {qrDataUrl ? (
                                <div style={{ display: 'flex', justifyContent: 'center' }}>
                                    <img src={qrDataUrl} alt="Order QR" style={{ width: 220, height: 220, background: '#fff', padding: 12, borderRadius: 12 }} />
                                </div>
                            ) : (
                                <div style={{ borderRadius: 12, border: '1px dashed rgba(0,229,255,0.18)', padding: '2rem 1rem', textAlign: 'center', color: '#3d5278', fontSize: '0.78rem' }}>
                                    QR preview is not available right now.
                                </div>
                            )}
                        </div>

                        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                            {onTrackOrder && (
                                <button onClick={onTrackOrder} className="btn-neon-cyan" style={{ justifyContent: 'center' }}>
                                    <i className="fa-solid fa-up-right-from-square" style={{ fontSize: 11 }}></i> Open Order Tracker
                                </button>
                            )}
                            <button onClick={onViewOrders} className="btn-solid-cyan" style={{ justifyContent: 'center' }}>
                                <i className="fa-solid fa-cart-shopping" style={{ fontSize: 11 }}></i> View My Orders
                            </button>
                            <button onClick={onClose} className="btn-neon-cyan" style={{ justifyContent: 'center' }}>
                                Continue Browsing
                            </button>
                        </div>
                    </div>
                </div>
            </motion.div>
        </motion.div>
    );
};

const CardPaymentModal = ({ open, total, paymentForm, setPaymentForm, onClose, onConfirm, processing }) => {
    if (!open) {
        return null;
    }

    return (
        <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            style={{ position: 'fixed', inset: 0, background: 'rgba(7,11,20,0.88)', backdropFilter: 'blur(9px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 230, padding: '1rem' }}
        >
            <motion.div
                initial={{ scale: 0.92, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.92, opacity: 0 }}
                style={{ background: '#0d1526', border: '1px solid rgba(168,85,247,0.22)', borderRadius: '1.25rem', width: '100%', maxWidth: 520, overflow: 'hidden', boxShadow: '0 0 60px rgba(168,85,247,0.14)' }}
            >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '1.2rem 1.35rem', borderBottom: '1px solid rgba(168,85,247,0.08)', background: 'rgba(168,85,247,0.04)' }}>
                    <div>
                        <h2 style={{ fontFamily: "'Rajdhani', sans-serif", color: '#e2eaf7', fontSize: '1.2rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: 8 }}>
                            <i className="fa-solid fa-credit-card" style={{ color: '#a855f7', fontSize: 14 }}></i>
                            Secure Card Payment
                        </h2>
                        <p style={{ color: '#6b84b0', fontSize: '0.78rem', marginTop: 4 }}>Enter your card details to pay and place the online order.</p>
                    </div>
                    <button onClick={onClose} style={{ color: '#3d5278', background: 'none', border: 'none', cursor: 'pointer', padding: 4 }}>
                        <FaXmark size={18} />
                    </button>
                </div>

                <div style={{ padding: '1.2rem 1.35rem', display: 'flex', flexDirection: 'column', gap: '0.9rem' }}>
                    <div style={{ background: 'linear-gradient(135deg, rgba(168,85,247,0.2), rgba(0,229,255,0.12))', border: '1px solid rgba(168,85,247,0.18)', borderRadius: 14, padding: '1rem' }}>
                        <p style={{ fontSize: '0.68rem', color: '#a855f7', fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase' }}>Amount to Charge</p>
                        <p style={{ fontFamily: "'Rajdhani', sans-serif", fontSize: '1.5rem', fontWeight: 700, color: '#e2eaf7', marginTop: 6 }}>LKR {total.toFixed(2)}</p>
                        <p style={{ color: '#9fb2d6', fontSize: '0.76rem', marginTop: 4 }}>Demo payment flow with full card validation and linked payment record creation.</p>
                    </div>

                    <div>
                        <label style={{ fontSize: '0.7rem', fontWeight: 700, color: '#6b84b0', letterSpacing: '0.08em', textTransform: 'uppercase', display: 'block', marginBottom: 6 }}>Cardholder Name</label>
                        <input type="text" value={paymentForm.cardholderName} onChange={(event) => setPaymentForm({ ...paymentForm, cardholderName: event.target.value })} className="input-dark" placeholder="Name on card" />
                    </div>

                    <div>
                        <label style={{ fontSize: '0.7rem', fontWeight: 700, color: '#6b84b0', letterSpacing: '0.08em', textTransform: 'uppercase', display: 'block', marginBottom: 6 }}>Card Number</label>
                        <input type="text" inputMode="numeric" value={paymentForm.cardNumber} onChange={(event) => setPaymentForm({ ...paymentForm, cardNumber: formatCardNumberInput(event.target.value) })} className="input-dark" placeholder="4242 4242 4242 4242" />
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                        <div>
                            <label style={{ fontSize: '0.7rem', fontWeight: 700, color: '#6b84b0', letterSpacing: '0.08em', textTransform: 'uppercase', display: 'block', marginBottom: 6 }}>Expiry</label>
                            <input type="text" inputMode="numeric" value={paymentForm.expiry} onChange={(event) => setPaymentForm({ ...paymentForm, expiry: formatExpiryInput(event.target.value) })} className="input-dark" placeholder="MM/YY" />
                        </div>
                        <div>
                            <label style={{ fontSize: '0.7rem', fontWeight: 700, color: '#6b84b0', letterSpacing: '0.08em', textTransform: 'uppercase', display: 'block', marginBottom: 6 }}>CVV</label>
                            <input type="password" inputMode="numeric" value={paymentForm.cvv} onChange={(event) => setPaymentForm({ ...paymentForm, cvv: sanitizeDigits(event.target.value).slice(0, 4) })} className="input-dark" placeholder="123" />
                        </div>
                    </div>

                    <label style={{ display: 'flex', alignItems: 'center', gap: 10, color: '#9fb2d6', fontSize: '0.78rem' }}>
                        <input type="checkbox" checked={paymentForm.saveCard} onChange={(event) => setPaymentForm({ ...paymentForm, saveCard: event.target.checked })} />
                        Save this card for faster demo checkout next time
                    </label>

                    <div style={{ display: 'flex', gap: 10, paddingTop: 4 }}>
                        <button onClick={onClose} type="button" className="btn-neon-cyan" style={{ flex: 1, justifyContent: 'center' }}>Cancel</button>
                        <button onClick={onConfirm} type="button" disabled={processing} style={{ flex: 1, justifyContent: 'center', display: 'inline-flex', alignItems: 'center', gap: 8, padding: '0.82rem 1rem', borderRadius: 10, fontWeight: 800, fontSize: '0.88rem', cursor: processing ? 'not-allowed' : 'pointer', background: 'linear-gradient(135deg, #a855f7, #00e5ff)', color: '#070b14', border: 'none', opacity: processing ? 0.72 : 1 }}>
                            {processing ? (
                                <>
                                    <i className="fa-solid fa-spinner fa-spin" style={{ fontSize: 12 }}></i> Processing Payment...
                                </>
                            ) : (
                                <>
                                    <i className="fa-solid fa-lock" style={{ fontSize: 11 }}></i> Pay LKR {total.toFixed(2)}
                                </>
                            )}
                        </button>
                    </div>
                </div>
            </motion.div>
        </motion.div>
    );
};

const CustomerMenu = () => {
    const navigate = useNavigate();
    const { user, isAuthenticated } = useAuth();
    const [menuItems, setMenuItems] = useState([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [category, setCategory] = useState('all');
    const [cart, setCart] = useState([]);
    const [cartOpen, setCartOpen] = useState(false);
    const [orderType, setOrderType] = useState('dine-in');
    const [placingOrder, setPlacingOrder] = useState(false);
    const [checkoutForm, setCheckoutForm] = useState(buildEmptyCheckoutForm(null));
    const [availableTables, setAvailableTables] = useState([]);
    const [tablesLoading, setTablesLoading] = useState(false);
    const [showSuccessModal, setShowSuccessModal] = useState(false);
    const [createdOrder, setCreatedOrder] = useState(null);
    const [createdOrderQr, setCreatedOrderQr] = useState('');
    const [createdOrderTrackingUrl, setCreatedOrderTrackingUrl] = useState('');
    const [showPaymentModal, setShowPaymentModal] = useState(false);
    const [paymentForm, setPaymentForm] = useState(buildEmptyPaymentForm(null));
    const [processingPayment, setProcessingPayment] = useState(false);

    useEffect(() => {
        API.get('/menu/items')
            .then((response) => setMenuItems(response.data))
            .catch(() => {})
            .finally(() => setLoading(false));
    }, []);

    useEffect(() => {
        setCheckoutForm((current) => ({
            ...current,
            contactPhone: current.contactPhone || user?.phone || '',
            pickupName: current.pickupName || (user ? `${user.firstName} ${user.lastName}` : '')
        }));
    }, [user]);

    useEffect(() => {
        setPaymentForm((current) => ({
            ...current,
            cardholderName: current.cardholderName || (user ? `${user.firstName} ${user.lastName}`.trim() : '')
        }));
    }, [user]);

    useEffect(() => {
        if (cartOpen && orderType === 'dine-in') {
            fetchAvailableTables();
        }
    }, [cartOpen, orderType]);

    const categories = ['all', 'beverage', 'appetizer', 'main_course', 'dessert', 'snack', 'special'];
    const filtered = menuItems.filter((item) =>
        (category === 'all' || item.category === category) &&
        item.name?.toLowerCase().includes(search.toLowerCase())
    );

    const fetchAvailableTables = async () => {
        setTablesLoading(true);
        try {
            const response = await API.get(`/tables/tables?status=available&date=${getTodayString()}`);
            const dineInOptions = response.data.filter((table) => table.displayStatus === 'available' && !table.hasActiveDineInOrder);
            setAvailableTables(dineInOptions);
            setCheckoutForm((current) => ({
                ...current,
                tableNumber: dineInOptions.some((table) => String(table.tableNumber) === String(current.tableNumber))
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

    const addToCart = (item) => {
        setCart((current) => {
            const existing = current.find((entry) => entry.item.id === item.id);
            if (existing) {
                return current.map((entry) => (
                    entry.item.id === item.id
                        ? { ...entry, quantity: entry.quantity + 1 }
                        : entry
                ));
            }
            return [...current, { item, quantity: 1 }];
        });
        toast.success(`${item.name} added to cart`, { duration: 1500 });
        setCartOpen(true);
    };

    const removeFromCart = (itemId) => setCart((current) => current.filter((entry) => entry.item.id !== itemId));

    const changeQty = (itemId, delta) => {
        setCart((current) => current.map((entry) => (
            entry.item.id === itemId
                ? { ...entry, quantity: Math.max(1, entry.quantity + delta) }
                : entry
        )));
    };

    const cartTotal = cart.reduce((sum, entry) => sum + parseFloat(entry.item.price) * entry.quantity, 0);
    const cartCount = cart.reduce((sum, entry) => sum + entry.quantity, 0);

    const resetCheckoutState = () => {
        setOrderType('dine-in');
        setCheckoutForm(buildEmptyCheckoutForm(user));
        setAvailableTables([]);
        setPaymentForm(buildEmptyPaymentForm(user));
    };

    const handleOrderTypeChange = (nextType) => {
        setOrderType(nextType);
        setCheckoutForm((current) => ({
            ...current,
            tableNumber: nextType === 'dine-in' ? current.tableNumber : '',
            onlinePaymentMethod: nextType === 'online' ? 'card' : 'card',
            onlinePaymentReference: nextType === 'online' ? current.onlinePaymentReference : '',
            paymentCardLast4: nextType === 'online' ? current.paymentCardLast4 : ''
        }));
        if (nextType !== 'online') {
            setShowPaymentModal(false);
            setPaymentForm(buildEmptyPaymentForm(user));
        }
    };

    const validateCheckout = ({ requireOnlinePaymentReference = true } = {}) => {
        if (cart.length === 0) return 'Cart is empty';
        if (checkoutForm.customerNotes.length > 500) return 'Order note is too long';

        if (orderType === 'dine-in') {
            if (!checkoutForm.tableNumber) return 'Please select an available table for dine-in';
            if (!availableTables.some((table) => String(table.tableNumber) === String(checkoutForm.tableNumber))) {
                return 'Selected table is no longer available. Please choose another table';
            }
        }

        if (orderType === 'takeaway') {
            if (!checkoutForm.pickupName.trim()) return 'Pickup name is required for takeaway orders';
            if (!/^\+?\d{9,15}$/.test(checkoutForm.contactPhone.replace(/\s/g, ''))) return 'Pickup phone must contain 9 to 15 digits';
        }

        if (orderType === 'online') {
            if (!/^\+?\d{9,15}$/.test(checkoutForm.contactPhone.replace(/\s/g, ''))) return 'Contact phone must contain 9 to 15 digits';
            if (!checkoutForm.deliveryAddress.trim()) return 'Delivery address is required for online orders';
            if (requireOnlinePaymentReference && !checkoutForm.onlinePaymentReference.trim()) return 'Online payment reference is required';
        }

        return '';
    };

    const validateCardPayment = () => {
        if (!paymentForm.cardholderName.trim()) return 'Cardholder name is required';
        if (!isValidLuhn(paymentForm.cardNumber)) return 'Card number is invalid';
        if (!/^\d{2}\/\d{2}$/.test(paymentForm.expiry)) return 'Expiry must be in MM/YY format';

        const [monthText, yearText] = paymentForm.expiry.split('/');
        const month = parseInt(monthText, 10);
        const year = parseInt(`20${yearText}`, 10);
        if (month < 1 || month > 12) return 'Expiry month is invalid';

        const expiryDate = new Date(year, month, 0, 23, 59, 59, 999);
        if (expiryDate < new Date()) return 'Card has expired';
        if (!/^\d{3,4}$/.test(paymentForm.cvv)) return 'CVV must contain 3 or 4 digits';

        return '';
    };

    const submitOrder = async (paymentOverride = null) => {
        if (!isAuthenticated) {
            toast.error('Please login to place an order');
            navigate('/login');
            return;
        }

        const errorMessage = validateCheckout({ requireOnlinePaymentReference: orderType !== 'online' || !!paymentOverride?.onlinePaymentReference });
        if (errorMessage) {
            toast.error(errorMessage);
            return;
        }

        setPlacingOrder(true);

        try {
            const normalizedContactPhone = checkoutForm.contactPhone.replace(/\s/g, '');
            const paymentDetails = paymentOverride || {};
            const payload = {
                customerName: `${user.firstName} ${user.lastName}`.trim(),
                customerEmail: user.email || '',
                orderType,
                tableNumber: orderType === 'dine-in' ? parseInt(checkoutForm.tableNumber, 10) : null,
                contactPhone: orderType === 'dine-in' ? '' : normalizedContactPhone,
                pickupName: orderType === 'takeaway' ? checkoutForm.pickupName.trim() : '',
                pickupPhone: orderType === 'takeaway' ? normalizedContactPhone : '',
                deliveryAddress: orderType === 'online' ? checkoutForm.deliveryAddress.trim() : '',
                onlinePaymentMethod: orderType === 'online' ? (paymentDetails.onlinePaymentMethod || checkoutForm.onlinePaymentMethod) : '',
                onlinePaymentReference: orderType === 'online' ? (paymentDetails.onlinePaymentReference || checkoutForm.onlinePaymentReference.trim()) : '',
                notes: checkoutForm.customerNotes.trim(),
                items: cart.map((entry) => ({
                    menuItemId: entry.item.id,
                    itemName: entry.item.name,
                    quantity: entry.quantity,
                    unitPrice: parseFloat(entry.item.price)
                }))
            };

            const response = await API.post('/orders', payload);
            const order = response.data.order;

            let qrDataUrl = '';
            let trackingUrl = '';
            try {
                const qrResponse = await API.get(`/orders/${order.id}/qr`);
                qrDataUrl = qrResponse.data.qrDataUrl || '';
                trackingUrl = qrResponse.data.trackingUrl || '';
            } catch (_) {
                qrDataUrl = '';
                trackingUrl = '';
            }

            setCreatedOrder(order);
            setCreatedOrderQr(qrDataUrl);
            setCreatedOrderTrackingUrl(trackingUrl);
            setShowSuccessModal(true);
            setShowPaymentModal(false);

            toast.success(response.data.message || 'Order placed successfully');
            setCart([]);
            setCartOpen(false);
            resetCheckoutState();
        } catch (error) {
            toast.error(error.response?.data?.message || 'Failed to place order');
        } finally {
            setPlacingOrder(false);
        }
    };

    const handlePlaceOrder = async () => {
        if (!isAuthenticated) {
            toast.error('Please login to place an order');
            navigate('/login');
            return;
        }

        const errorMessage = validateCheckout({ requireOnlinePaymentReference: false });
        if (errorMessage) {
            toast.error(errorMessage);
            return;
        }

        if (orderType === 'online') {
            setPaymentForm((current) => ({
                ...current,
                cardholderName: current.cardholderName || `${user.firstName} ${user.lastName}`.trim()
            }));
            setShowPaymentModal(true);
            return;
        }

        await submitOrder();
    };

    const handleConfirmCardPayment = async () => {
        const errorMessage = validateCardPayment();
        if (errorMessage) {
            toast.error(errorMessage);
            return;
        }

        setProcessingPayment(true);

        try {
            const last4 = sanitizeDigits(paymentForm.cardNumber).slice(-4);
            const reference = buildCardPaymentReference(last4);

            setCheckoutForm((current) => ({
                ...current,
                onlinePaymentMethod: 'card',
                onlinePaymentReference: reference,
                paymentCardLast4: last4
            }));

            await submitOrder({
                onlinePaymentMethod: 'card',
                onlinePaymentReference: reference
            });
        } finally {
            setProcessingPayment(false);
        }
    };

    const getCartQty = (itemId) => cart.find((entry) => entry.item.id === itemId)?.quantity || 0;

    const primaryButtonLabel = orderType === 'online'
        ? 'Pay and Place Order'
        : orderType === 'takeaway'
            ? 'Place Takeaway Order'
            : 'Place Dine-in Order';

    return (
        <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', background: '#070b14', fontFamily: "'Inter', sans-serif" }}>
            <Navbar />

            <section style={{ position: 'relative', padding: '4rem 1.25rem 2.5rem', overflow: 'hidden', borderBottom: '1px solid rgba(0,229,255,0.07)', minHeight: 220, display: 'flex', alignItems: 'center' }}>
                <img src="/assets/cafe_menu.jpg" alt="" style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover', objectPosition: 'center', pointerEvents: 'none' }} />
                <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(180deg, rgba(7,11,20,0.72) 0%, rgba(7,11,20,0.93) 100%)', pointerEvents: 'none' }} />
                <div className="hud-grid" style={{ position: 'absolute', inset: 0, opacity: 0.3, pointerEvents: 'none' }} />
                <div style={{ maxWidth: 1200, margin: '0 auto', position: 'relative', zIndex: 1, textAlign: 'center', width: '100%' }}>
                    <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
                        <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, padding: '0.3rem 0.875rem', borderRadius: 99, background: 'rgba(0,229,255,0.06)', border: '1px solid rgba(0,229,255,0.18)', marginBottom: '1rem' }}>
                            <span className="dot-live" />
                            <span style={{ fontSize: '0.68rem', fontWeight: 700, color: '#00e5ff', letterSpacing: '0.12em', textTransform: 'uppercase' }}>Live Menu</span>
                        </div>
                        <h1 style={{ fontFamily: "'Rajdhani', sans-serif", fontSize: 'clamp(1.8rem, 4vw, 2.5rem)', fontWeight: 700, color: '#e2eaf7', marginBottom: '0.5rem', letterSpacing: '0.02em' }}>
                            Our <span style={{ background: 'linear-gradient(90deg, #00e5ff, #f59e0b)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>Menu</span>
                        </h1>
                        <p style={{ color: 'rgba(194,211,240,0.75)', fontSize: '0.9rem' }}>Handcrafted beverages and delicious meals, made fresh daily</p>
                    </motion.div>
                </div>
            </section>

            <div style={{ maxWidth: 1200, margin: '0 auto', width: '100%', padding: '1.5rem 1.25rem 0' }}>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.875rem', alignItems: 'center' }}>
                    <div style={{ position: 'relative', flex: 1, minWidth: 220 }}>
                        <i className="fa-solid fa-magnifying-glass" style={{ position: 'absolute', left: '0.875rem', top: '50%', transform: 'translateY(-50%)', color: '#3d5278', fontSize: 12, pointerEvents: 'none' }}></i>
                        <input type="text" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search menu items..." className="input-dark" style={{ paddingLeft: '2.5rem' }} />
                    </div>
                    <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                        {categories.map((entry) => {
                            const active = category === entry;
                            const color = categoryColors[entry] || '#00e5ff';
                            return (
                                <button
                                    key={entry}
                                    onClick={() => setCategory(entry)}
                                    style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '0.35rem 0.875rem', borderRadius: 99, fontSize: '0.73rem', fontWeight: 600, cursor: 'pointer', textTransform: 'capitalize', transition: 'all 0.2s', background: active ? `${color}18` : 'rgba(0,0,0,0.35)', border: active ? `1px solid ${color}40` : '1px solid rgba(255,255,255,0.06)', color: active ? color : '#6b84b0' }}
                                >
                                    <i className={`fa-solid ${categoryIcons[entry] || 'fa-tag'}`} style={{ fontSize: 10 }}></i>
                                    {entry === 'all' ? 'All' : formatLabel(entry)}
                                </button>
                            );
                        })}
                    </div>
                </div>
                {!loading && (
                    <p style={{ fontSize: '0.73rem', color: '#3d5278', marginTop: '0.875rem' }}>
                        Showing <span style={{ color: '#00e5ff', fontWeight: 600 }}>{filtered.length}</span> item{filtered.length !== 1 ? 's' : ''}
                    </p>
                )}
            </div>

            <div style={{ maxWidth: 1200, margin: '0 auto', width: '100%', padding: '1.25rem 1.25rem 4rem', flex: 1 }}>
                {loading ? (
                    <div style={{ display: 'flex', justifyContent: 'center', padding: '5rem 0' }}>
                        <div style={{ width: 40, height: 40, borderRadius: '50%', border: '2px solid rgba(0,229,255,0.2)', borderTopColor: '#00e5ff', animation: 'spin 0.8s linear infinite' }}></div>
                    </div>
                ) : filtered.length === 0 ? (
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '5rem 1rem', textAlign: 'center' }}>
                        <i className="fa-solid fa-book-open" style={{ color: '#3d5278', fontSize: 40, marginBottom: 16 }}></i>
                        <h3 style={{ color: '#c2d3f0' }}>No Items Found</h3>
                        <p style={{ color: '#3d5278', fontSize: '0.82rem' }}>Try a different search or category</p>
                    </div>
                ) : (
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(230px, 1fr))', gap: '1.125rem' }}>
                        {filtered.map((item, index) => {
                            const color = categoryColors[item.category] || '#00e5ff';
                            const qtyInCart = getCartQty(item.id);
                            return (
                                <motion.div
                                    key={item.id}
                                    initial={{ opacity: 0, y: 16 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    transition={{ delay: index * 0.04 }}
                                    whileHover={{ y: -4 }}
                                    style={{ background: 'rgba(13,21,38,0.85)', backdropFilter: 'blur(12px)', border: qtyInCart > 0 ? `1px solid ${color}50` : `1px solid ${color}14`, borderRadius: '1rem', overflow: 'hidden', display: 'flex', flexDirection: 'column', transition: 'all 0.25s' }}
                                >
                                    {item.image ? (
                                        <div style={{ height: 150, overflow: 'hidden', position: 'relative' }}>
                                            <img src={item.image} alt={item.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                            {qtyInCart > 0 && (
                                                <div style={{ position: 'absolute', top: 8, right: 8, background: color, color: '#070b14', borderRadius: '50%', width: 24, height: 24, display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: '0.75rem' }}>
                                                    {qtyInCart}
                                                </div>
                                            )}
                                        </div>
                                    ) : (
                                        <div style={{ height: 130, background: `linear-gradient(135deg, ${color}10, rgba(0,0,0,0.3))`, display: 'flex', alignItems: 'center', justifyContent: 'center', borderBottom: `1px solid ${color}12`, position: 'relative' }}>
                                            <i className={`fa-solid ${categoryIcons[item.category] || 'fa-utensils'}`} style={{ color: `${color}70`, fontSize: 36 }}></i>
                                            {qtyInCart > 0 && (
                                                <div style={{ position: 'absolute', top: 8, right: 8, background: color, color: '#070b14', borderRadius: '50%', width: 24, height: 24, display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: '0.75rem' }}>
                                                    {qtyInCart}
                                                </div>
                                            )}
                                        </div>
                                    )}

                                    <div style={{ padding: '1rem', flex: 1, display: 'flex', flexDirection: 'column' }}>
                                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                                            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, fontSize: '0.62rem', fontWeight: 700, color, letterSpacing: '0.08em', textTransform: 'uppercase', background: `${color}12`, border: `1px solid ${color}25`, borderRadius: 99, padding: '2px 8px' }}>
                                                <i className={`fa-solid ${categoryIcons[item.category] || 'fa-tag'}`} style={{ fontSize: 8 }}></i>
                                                {formatLabel(item.category || 'item')}
                                            </span>
                                            {item.preparationTime && (
                                                <span style={{ fontSize: '0.65rem', color: '#3d5278', display: 'flex', alignItems: 'center', gap: 4 }}>
                                                    <i className="fa-regular fa-clock" style={{ fontSize: 9 }}></i> {item.preparationTime}m
                                                </span>
                                            )}
                                        </div>

                                        <h3 style={{ fontSize: '0.9rem', fontWeight: 700, color: '#c2d3f0', marginBottom: '0.35rem', lineHeight: 1.3 }}>{item.name}</h3>
                                        <p style={{ fontSize: '0.75rem', color: '#3d5278', lineHeight: 1.6, flex: 1, marginBottom: '0.875rem' }}>
                                            {item.description || 'A delicious choice crafted with care from our kitchen.'}
                                        </p>

                                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 'auto' }}>
                                            <span style={{ fontFamily: "'Rajdhani', sans-serif", fontSize: '1.15rem', fontWeight: 700, color: '#e2eaf7' }}>
                                                LKR {parseFloat(item.price).toFixed(2)}
                                            </span>
                                            {item.isAvailable !== false ? (
                                                <button
                                                    onClick={() => addToCart(item)}
                                                    style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '0.4rem 0.875rem', borderRadius: 8, background: qtyInCart > 0 ? `${color}22` : 'rgba(0,229,255,0.08)', border: `1px solid ${qtyInCart > 0 ? color : 'rgba(0,229,255,0.25)'}`, color: qtyInCart > 0 ? color : '#00e5ff', fontSize: '0.75rem', fontWeight: 700, cursor: 'pointer', transition: 'all 0.2s' }}
                                                >
                                                    <i className={`fa-solid ${qtyInCart > 0 ? 'fa-plus' : 'fa-cart-plus'}`} style={{ fontSize: 11 }}></i>
                                                    {qtyInCart > 0 ? 'Add More' : 'Add to Cart'}
                                                </button>
                                            ) : (
                                                <span style={{ fontSize: '0.62rem', fontWeight: 700, color: '#ef4444', background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.2)', borderRadius: 99, padding: '2px 8px' }}>Unavailable</span>
                                            )}
                                        </div>
                                    </div>
                                </motion.div>
                            );
                        })}
                    </div>
                )}
            </div>

            {cartCount > 0 && !cartOpen && (
                <motion.button
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    onClick={() => setCartOpen(true)}
                    style={{ position: 'fixed', bottom: 28, right: 28, zIndex: 100, display: 'flex', alignItems: 'center', gap: 8, background: 'linear-gradient(135deg, #00e5ff, #0077ff)', color: '#070b14', border: 'none', borderRadius: 99, padding: '0.75rem 1.25rem', fontWeight: 800, fontSize: '0.875rem', cursor: 'pointer', boxShadow: '0 8px 30px rgba(0,229,255,0.35)' }}
                >
                    <i className="fa-solid fa-cart-shopping"></i>
                    Cart ({cartCount}) - LKR {cartTotal.toFixed(2)}
                </motion.button>
            )}

            <AnimatePresence>
                {cartOpen && (
                    <>
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            onClick={() => setCartOpen(false)}
                            style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.55)', zIndex: 200 }}
                        />
                        <motion.div
                            initial={{ x: '100%' }}
                            animate={{ x: 0 }}
                            exit={{ x: '100%' }}
                            transition={{ type: 'spring', stiffness: 300, damping: 30 }}
                            style={{ position: 'fixed', top: 0, right: 0, bottom: 0, width: '100%', maxWidth: 440, background: '#0a1020', borderLeft: '1px solid rgba(0,229,255,0.15)', zIndex: 201, display: 'flex', flexDirection: 'column', padding: '1.5rem', overflow: 'hidden' }}
                        >
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.5rem' }}>
                                <h2 style={{ fontFamily: "'Rajdhani', sans-serif", color: '#e2eaf7', fontWeight: 700, fontSize: '1.4rem', display: 'flex', alignItems: 'center', gap: 10 }}>
                                    <i className="fa-solid fa-cart-shopping" style={{ color: '#00e5ff' }}></i> Your Order
                                </h2>
                                <button onClick={() => setCartOpen(false)} style={{ background: 'transparent', border: 'none', color: '#3d5278', fontSize: 20, cursor: 'pointer' }}>
                                    <i className="fa-solid fa-xmark"></i>
                                </button>
                            </div>

                            <div style={{ flex: 1, minHeight: 0, overflowY: 'auto', paddingRight: 4, paddingBottom: 8 }}>
                                <div>
                                    {cart.length === 0 ? (
                                        <p style={{ color: '#3d5278', textAlign: 'center', marginTop: '3rem' }}>Your cart is empty</p>
                                    ) : cart.map(({ item, quantity }) => (
                                        <div key={item.id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '0.75rem 0', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                                            <div style={{ flex: 1 }}>
                                                <p style={{ color: '#c2d3f0', fontWeight: 600, fontSize: '0.875rem', marginBottom: 2 }}>{item.name}</p>
                                                <p style={{ color: '#3d5278', fontSize: '0.75rem' }}>LKR {parseFloat(item.price).toFixed(2)} each</p>
                                            </div>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                                <button onClick={() => changeQty(item.id, -1)} style={{ width: 28, height: 28, borderRadius: '50%', background: 'rgba(0,229,255,0.08)', border: '1px solid rgba(0,229,255,0.2)', color: '#00e5ff', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                                    <i className="fa-solid fa-minus" style={{ fontSize: 10 }}></i>
                                                </button>
                                                <span style={{ color: '#e2eaf7', fontWeight: 700, minWidth: 20, textAlign: 'center' }}>{quantity}</span>
                                                <button onClick={() => changeQty(item.id, 1)} style={{ width: 28, height: 28, borderRadius: '50%', background: 'rgba(0,229,255,0.08)', border: '1px solid rgba(0,229,255,0.2)', color: '#00e5ff', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                                    <i className="fa-solid fa-plus" style={{ fontSize: 10 }}></i>
                                                </button>
                                            </div>
                                            <div style={{ textAlign: 'right', minWidth: 80 }}>
                                                <p style={{ color: '#00e5ff', fontWeight: 700, fontSize: '0.875rem' }}>LKR {(parseFloat(item.price) * quantity).toFixed(2)}</p>
                                                <button onClick={() => removeFromCart(item.id)} style={{ background: 'transparent', border: 'none', color: '#ef4444', cursor: 'pointer', fontSize: 11, marginTop: 2 }}>
                                                    Remove
                                                </button>
                                            </div>
                                        </div>
                                    ))}
                                </div>

                                {cart.length > 0 && (
                                    <div style={{ borderTop: '1px solid rgba(0,229,255,0.1)', paddingTop: '1rem', marginTop: '0.75rem', display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
                                    <div>
                                        <label style={{ fontSize: '0.7rem', fontWeight: 700, color: '#6b84b0', letterSpacing: '0.08em', textTransform: 'uppercase', display: 'block', marginBottom: 6 }}>Order Type</label>
                                        <div style={{ display: 'flex', gap: 6 }}>
                                            {['dine-in', 'takeaway', 'online'].map((type) => (
                                                <button
                                                    key={type}
                                                    onClick={() => handleOrderTypeChange(type)}
                                                    style={{ flex: 1, padding: '0.4rem', borderRadius: 8, fontSize: '0.75rem', fontWeight: 600, cursor: 'pointer', transition: 'all 0.2s', background: orderType === type ? 'rgba(0,229,255,0.12)' : 'rgba(0,0,0,0.4)', border: orderType === type ? '1px solid rgba(0,229,255,0.4)' : '1px solid rgba(255,255,255,0.06)', color: orderType === type ? '#00e5ff' : '#6b84b0', textTransform: 'capitalize' }}
                                                >
                                                    {type}
                                                </button>
                                            ))}
                                        </div>
                                    </div>

                                    {orderType === 'dine-in' && (
                                        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                                            <div style={{ background: 'rgba(16,185,129,0.08)', border: '1px solid rgba(16,185,129,0.18)', borderRadius: 10, padding: '0.75rem 0.85rem' }}>
                                                <p style={{ color: '#10b981', fontSize: '0.72rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 4 }}>Dine-in Table Selection</p>
                                                <p style={{ color: '#6b84b0', fontSize: '0.76rem' }}>Only tables currently available for today are shown here.</p>
                                            </div>
                                            <div>
                                                <label style={{ fontSize: '0.7rem', fontWeight: 700, color: '#6b84b0', letterSpacing: '0.08em', textTransform: 'uppercase', display: 'block', marginBottom: 6 }}>Available Table</label>
                                                {tablesLoading ? (
                                                    <div style={{ padding: '0.8rem 0.9rem', borderRadius: 10, border: '1px solid rgba(255,255,255,0.06)', background: 'rgba(0,0,0,0.25)', color: '#6b84b0', fontSize: '0.8rem' }}>Loading tables...</div>
                                                ) : (
                                                    <select value={checkoutForm.tableNumber} onChange={(event) => setCheckoutForm({ ...checkoutForm, tableNumber: event.target.value })} className="input-dark">
                                                        <option value="">Select an available table</option>
                                                        {availableTables.map((table) => (
                                                            <option key={table.id} value={table.tableNumber}>
                                                                Table {table.tableNumber} ({table.seatingCapacity} seats, {formatLabel(table.location)})
                                                            </option>
                                                        ))}
                                                    </select>
                                                )}
                                                {!tablesLoading && availableTables.length === 0 && (
                                                    <p style={{ color: '#ef4444', fontSize: '0.75rem', marginTop: 6 }}>No tables are currently available for dine-in.</p>
                                                )}
                                            </div>
                                        </div>
                                    )}

                                    {orderType === 'takeaway' && (
                                        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                                            <div style={{ background: 'rgba(245,158,11,0.08)', border: '1px solid rgba(245,158,11,0.18)', borderRadius: 10, padding: '0.75rem 0.85rem' }}>
                                                <p style={{ color: '#f59e0b', fontSize: '0.72rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 4 }}>Takeaway Pickup</p>
                                                <p style={{ color: '#6b84b0', fontSize: '0.76rem' }}>We will use this contact information to confirm your pickup.</p>
                                            </div>
                                            <div>
                                                <label style={{ fontSize: '0.7rem', fontWeight: 700, color: '#6b84b0', letterSpacing: '0.08em', textTransform: 'uppercase', display: 'block', marginBottom: 6 }}>Pickup Name</label>
                                                <input type="text" value={checkoutForm.pickupName} onChange={(event) => setCheckoutForm({ ...checkoutForm, pickupName: event.target.value })} className="input-dark" placeholder="Pickup name" />
                                            </div>
                                            <div>
                                                <label style={{ fontSize: '0.7rem', fontWeight: 700, color: '#6b84b0', letterSpacing: '0.08em', textTransform: 'uppercase', display: 'block', marginBottom: 6 }}>Pickup Phone</label>
                                                <input type="text" value={checkoutForm.contactPhone} onChange={(event) => setCheckoutForm({ ...checkoutForm, contactPhone: event.target.value })} className="input-dark" placeholder="+94 71 234 5678" />
                                            </div>
                                        </div>
                                    )}

                                    {orderType === 'online' && (
                                        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                                            <div style={{ background: 'rgba(168,85,247,0.08)', border: '1px solid rgba(168,85,247,0.18)', borderRadius: 10, padding: '0.75rem 0.85rem' }}>
                                                <p style={{ color: '#a855f7', fontSize: '0.72rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 4 }}>Online Order and Payment</p>
                                                <p style={{ color: '#6b84b0', fontSize: '0.76rem' }}>Provide delivery details, then continue to the secure credit card modal to validate the card and complete the payment.</p>
                                            </div>
                                            <div>
                                                <label style={{ fontSize: '0.7rem', fontWeight: 700, color: '#6b84b0', letterSpacing: '0.08em', textTransform: 'uppercase', display: 'block', marginBottom: 6 }}>Contact Phone</label>
                                                <input type="text" value={checkoutForm.contactPhone} onChange={(event) => setCheckoutForm({ ...checkoutForm, contactPhone: event.target.value })} className="input-dark" placeholder="+94 71 234 5678" />
                                            </div>
                                            <div>
                                                <label style={{ fontSize: '0.7rem', fontWeight: 700, color: '#6b84b0', letterSpacing: '0.08em', textTransform: 'uppercase', display: 'block', marginBottom: 6 }}>Delivery Address</label>
                                                <textarea value={checkoutForm.deliveryAddress} onChange={(event) => setCheckoutForm({ ...checkoutForm, deliveryAddress: event.target.value })} className="input-dark" rows={2} style={{ resize: 'vertical', minHeight: 72 }} placeholder="Delivery address" />
                                            </div>
                                            <div style={{ background: 'rgba(168,85,247,0.06)', border: '1px solid rgba(168,85,247,0.15)', borderRadius: 8, padding: '0.8rem 0.9rem' }}>
                                                <p style={{ fontSize: '0.7rem', color: '#a855f7', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 6 }}>Card Payment</p>
                                                <p style={{ color: '#9fb2d6', fontSize: '0.77rem', lineHeight: 1.55 }}>
                                                    Clicking <strong style={{ color: '#e2eaf7' }}>Pay and Place Order</strong> opens the card payment modal. We validate card number, expiry, and CVV before generating the linked payment record.
                                                </p>
                                                {checkoutForm.onlinePaymentReference && (
                                                    <div style={{ marginTop: 10, display: 'flex', flexDirection: 'column', gap: 4, fontSize: '0.75rem' }}>
                                                        <span style={{ color: '#c2d3f0' }}>Prepared payment reference: {checkoutForm.onlinePaymentReference}</span>
                                                        {checkoutForm.paymentCardLast4 && <span style={{ color: '#6b84b0' }}>Card ending in {checkoutForm.paymentCardLast4}</span>}
                                                    </div>
                                                )}
                                            </div>
                                            <div style={{ background: 'rgba(168,85,247,0.06)', border: '1px solid rgba(168,85,247,0.15)', borderRadius: 8, padding: '0.7rem 0.85rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                                <span style={{ color: '#6b84b0', fontSize: '0.8rem' }}>Prepaid Total</span>
                                                <span style={{ color: '#a855f7', fontWeight: 700, fontFamily: "'Rajdhani', sans-serif", fontSize: '1rem' }}>LKR {cartTotal.toFixed(2)}</span>
                                            </div>
                                        </div>
                                    )}

                                    <div>
                                        <label style={{ fontSize: '0.7rem', fontWeight: 700, color: '#6b84b0', letterSpacing: '0.08em', textTransform: 'uppercase', display: 'block', marginBottom: 6 }}>Order Note</label>
                                        <textarea value={checkoutForm.customerNotes} onChange={(event) => setCheckoutForm({ ...checkoutForm, customerNotes: event.target.value })} className="input-dark" rows={2} style={{ resize: 'vertical', minHeight: 68 }} placeholder="Any special request for the kitchen" />
                                    </div>

                                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.25rem' }}>
                                        <span style={{ color: '#6b84b0', fontSize: '0.875rem' }}>Total</span>
                                        <span style={{ fontFamily: "'Rajdhani', sans-serif", color: '#00e5ff', fontWeight: 800, fontSize: '1.25rem' }}>LKR {cartTotal.toFixed(2)}</span>
                                    </div>

                                    <button
                                        onClick={handlePlaceOrder}
                                        disabled={placingOrder || (orderType === 'dine-in' && !tablesLoading && availableTables.length === 0)}
                                        style={{ width: '100%', padding: '0.875rem', borderRadius: 10, background: 'linear-gradient(135deg, #00e5ff, #0077ff)', color: '#070b14', border: 'none', fontWeight: 800, fontSize: '0.9rem', cursor: placingOrder ? 'not-allowed' : 'pointer', opacity: placingOrder ? 0.7 : 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, marginBottom: 4 }}
                                    >
                                        {placingOrder ? (
                                            <>
                                                <i className="fa-solid fa-spinner fa-spin"></i> Processing...
                                            </>
                                        ) : (
                                            <>
                                                {orderType === 'online' ? <FaQrcode style={{ fontSize: 11 }} /> : <i className="fa-solid fa-paper-plane" style={{ fontSize: 11 }}></i>}
                                                {primaryButtonLabel}
                                            </>
                                        )}
                                    </button>
                                    </div>
                                )}
                            </div>
                        </motion.div>
                    </>
                )}
            </AnimatePresence>

            <AnimatePresence>
                {showPaymentModal && (
                    <CardPaymentModal
                        open={showPaymentModal}
                        total={cartTotal}
                        paymentForm={paymentForm}
                        setPaymentForm={setPaymentForm}
                        onClose={() => {
                            if (!processingPayment) {
                                setShowPaymentModal(false);
                            }
                        }}
                        onConfirm={handleConfirmCardPayment}
                        processing={processingPayment || placingOrder}
                    />
                )}
            </AnimatePresence>

            <AnimatePresence>
                {showSuccessModal && createdOrder && (
                    <SuccessModal
                        order={createdOrder}
                        qrDataUrl={createdOrderQr}
                        onClose={() => setShowSuccessModal(false)}
                        onTrackOrder={createdOrderTrackingUrl ? () => {
                            setShowSuccessModal(false);
                            navigate(`/order-tracking/${createdOrder.qrToken}`);
                        } : null}
                        onViewOrders={() => {
                            setShowSuccessModal(false);
                            navigate('/profile?tab=orders');
                        }}
                    />
                )}
            </AnimatePresence>

            <Footer />
        </div>
    );
};

export default CustomerMenu;

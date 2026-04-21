import { useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import Navbar from '../components/common/Navbar';
import Footer from '../components/common/Footer';
import API from '../services/api';
import toast from 'react-hot-toast';

const statusBadge = (status) => ({ pending: 'badge-warning', preparing: 'badge-info', ready: 'badge-purple', completed: 'badge-success', cancelled: 'badge-danger' }[status] || 'badge-muted');
const reservationBadge = (status) => ({ confirmed: 'badge-success', pending: 'badge-warning', cancelled: 'badge-danger', completed: 'badge-info' }[status] || 'badge-muted');
const paymentBadge = (status) => ({ pending: 'badge-warning', completed: 'badge-success', refunded: 'badge-info', failed: 'badge-danger' }[status] || 'badge-muted');
const formatLabel = (value) => String(value || '').replace(/_/g, ' ');

const Profile = () => {
    const { user, updateUser, logout } = useAuth();
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();
    const [activeTab, setActiveTab] = useState(searchParams.get('tab') || 'profile');
    const [profileForm, setProfileForm] = useState({ firstName: '', lastName: '', phone: '' });
    const [orders, setOrders] = useState([]);
    const [reservations, setReservations] = useState([]);
    const [payments, setPayments] = useState([]);
    const [loading, setLoading] = useState(false);
    const [saving, setSaving] = useState(false);
    const [isEditing, setIsEditing] = useState(false);
    const [qrLoadingId, setQrLoadingId] = useState(null);
    const [orderQrPreview, setOrderQrPreview] = useState(null);

    useEffect(() => {
        if (user) {
            setProfileForm({
                firstName: user.firstName || '',
                lastName: user.lastName || '',
                phone: user.phone || ''
            });
        }
    }, [user]);

    useEffect(() => {
        setActiveTab(searchParams.get('tab') || 'profile');
    }, [searchParams]);

    useEffect(() => {
        if (activeTab === 'orders') {
            fetchOrders();
        }
    }, [activeTab]);

    useEffect(() => {
        if (activeTab === 'reservations') {
            fetchReservations();
        }
    }, [activeTab]);

    useEffect(() => {
        if (activeTab === 'payments') {
            fetchPayments();
        }
    }, [activeTab]);

    const fetchOrders = async () => {
        setLoading(true);
        try {
            const response = await API.get('/orders');
            setOrders(response.data);
        } catch {
            toast.error('Failed to load orders');
        } finally {
            setLoading(false);
        }
    };

    const fetchReservations = async () => {
        setLoading(true);
        try {
            const response = await API.get(`/tables/reservations?email=${encodeURIComponent(user?.email || '')}`);
            setReservations(response.data);
        } catch {
            toast.error('Failed to load reservations');
        } finally {
            setLoading(false);
        }
    };

    const fetchPayments = async () => {
        setLoading(true);
        try {
            const response = await API.get('/payments/mine');
            setPayments(response.data);
        } catch {
            toast.error('Failed to load payment history');
        } finally {
            setLoading(false);
        }
    };

    const cancelReservation = async (id) => {
        if (!confirm('Cancel this reservation?')) return;

        try {
            await API.put(`/tables/reservations/${id}`, { status: 'cancelled' });
            toast.success('Reservation cancelled');
            fetchReservations();
        } catch {
            toast.error('Failed to cancel reservation');
        }
    };

    const handleProfileSave = async (event) => {
        event.preventDefault();
        setSaving(true);

        try {
            await API.put('/users/profile', profileForm);
            updateUser(profileForm);
            toast.success('Profile updated');
            setIsEditing(false);
        } catch (error) {
            toast.error(error.response?.data?.message || 'Failed to update profile');
        } finally {
            setSaving(false);
        }
    };

    const handleDeleteAccount = async () => {
        if (!confirm('Delete your account? This cannot be undone.')) return;

        try {
            await API.delete('/users/profile');
            toast.success('Account deleted');
            logout();
            navigate('/');
        } catch (error) {
            toast.error(error.response?.data?.message || 'Failed to delete account');
        }
    };

    const openOrderQr = async (order) => {
        setQrLoadingId(order.id);
        try {
            const response = await API.get(`/orders/${order.id}/qr`);
            setOrderQrPreview({
                order,
                qrDataUrl: response.data.qrDataUrl || '',
                qrToken: response.data.qrToken || '',
                fulfillmentDetails: response.data.fulfillmentDetails || order.fulfillmentDetails || {},
                customerNotes: response.data.customerNotes || order.customerNotes || ''
            });
        } catch {
            toast.error('Failed to load order QR');
        } finally {
            setQrLoadingId(null);
        }
    };

    const totalSpent = orders.reduce((sum, order) => sum + parseFloat(order.totalAmount || 0), 0);
    const completedOrders = orders.filter((order) => order.status === 'completed').length;
    const totalPaid = payments
        .filter((payment) => payment.paymentStatus === 'completed')
        .reduce((sum, payment) => sum + parseFloat(payment.totalAmount || 0), 0);
    const refundedPayments = payments.filter((payment) => payment.paymentStatus === 'refunded').length;

    return (
        <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', background: '#070b14', fontFamily: "'Inter', sans-serif" }}>
            <Navbar />

            <div style={{ background: 'linear-gradient(135deg, #0d1526 0%, #050a14 100%)', borderBottom: '1px solid rgba(0,229,255,0.08)', position: 'relative', overflow: 'hidden' }}>
                <div style={{ position: 'absolute', inset: 0, backgroundImage: 'radial-gradient(ellipse at 70% 50%, rgba(0,229,255,0.06), transparent 60%), radial-gradient(ellipse at 20% 80%, rgba(245,158,11,0.04), transparent 50%)' }} />
                <div style={{ maxWidth: 960, margin: '0 auto', padding: '2rem 1.5rem', position: 'relative', zIndex: 1 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem', flexWrap: 'wrap' }}>
                        <div style={{ width: 84, height: 84, borderRadius: 22, background: 'linear-gradient(135deg, #00e5ff30, #00e5ff10)', border: '2px solid rgba(0,229,255,0.35)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: "'Rajdhani', sans-serif", fontSize: '2rem', fontWeight: 700, color: '#00e5ff', boxShadow: '0 0 30px rgba(0,229,255,0.15)' }}>
                            {user?.firstName?.[0]}{user?.lastName?.[0]}
                        </div>
                        <div>
                            <h1 style={{ fontFamily: "'Rajdhani', sans-serif", fontSize: '1.7rem', fontWeight: 700, color: '#e2eaf7' }}>{user?.firstName} {user?.lastName}</h1>
                            <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', marginTop: 8 }}>
                                <span style={{ fontSize: '0.82rem', color: '#6b84b0', display: 'flex', alignItems: 'center', gap: 6 }}>
                                    <i className="fa-solid fa-envelope" style={{ fontSize: 11, color: '#3d5278' }}></i>{user?.email}
                                </span>
                                {user?.phone && (
                                    <span style={{ fontSize: '0.82rem', color: '#6b84b0', display: 'flex', alignItems: 'center', gap: 6 }}>
                                        <i className="fa-solid fa-phone" style={{ fontSize: 11, color: '#3d5278' }}></i>{user.phone}
                                    </span>
                                )}
                            </div>
                            <div style={{ display: 'flex', gap: 8, marginTop: 10 }}>
                                <span style={{ fontSize: '0.7rem', padding: '0.2rem 0.75rem', borderRadius: 99, background: 'rgba(0,229,255,0.08)', border: '1px solid rgba(0,229,255,0.2)', color: '#00e5ff', fontWeight: 600, textTransform: 'capitalize' }}>
                                    {user?.role}
                                </span>
                                <span style={{ fontSize: '0.7rem', padding: '0.2rem 0.75rem', borderRadius: 99, background: 'rgba(16,185,129,0.08)', border: '1px solid rgba(16,185,129,0.2)', color: '#10b981', fontWeight: 600 }}>
                                    Active
                                </span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <div style={{ maxWidth: 960, margin: '0 auto', padding: '1.25rem 1.5rem 0', width: '100%' }}>
                <div style={{ display: 'flex', background: 'rgba(0,0,0,0.3)', borderRadius: 10, padding: 4, border: '1px solid rgba(0,229,255,0.1)', width: 'fit-content', gap: 4, flexWrap: 'wrap' }}>
                    {[
                        { key: 'profile', icon: 'fa-user', label: 'Profile' },
                        { key: 'orders', icon: 'fa-cart-shopping', label: 'Order History' },
                        { key: 'payments', icon: 'fa-credit-card', label: 'Payment History' },
                        { key: 'reservations', icon: 'fa-calendar-check', label: 'My Bookings' }
                    ].map((tab) => (
                        <button
                            key={tab.key}
                            onClick={() => setActiveTab(tab.key)}
                            style={{ padding: '0.55rem 1.1rem', borderRadius: 8, fontSize: '0.82rem', fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 7, background: activeTab === tab.key ? 'rgba(0,229,255,0.12)' : 'transparent', border: activeTab === tab.key ? '1px solid rgba(0,229,255,0.25)' : '1px solid transparent', color: activeTab === tab.key ? '#00e5ff' : '#6b84b0' }}
                        >
                            <i className={`fa-solid ${tab.icon}`} style={{ fontSize: 12 }}></i>{tab.label}
                        </button>
                    ))}
                </div>
            </div>

            <div style={{ maxWidth: 960, margin: '0 auto', padding: '1.5rem', flex: 1, width: '100%' }}>
                <AnimatePresence mode="wait">
                    {activeTab === 'profile' && (
                        <motion.div key="profile" initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -16 }} transition={{ duration: 0.25 }}>
                            <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) 300px', gap: '1.5rem', alignItems: 'start' }}>
                                <div style={{ background: 'rgba(13,21,38,0.8)', border: '1px solid rgba(0,229,255,0.1)', borderRadius: '1rem', overflow: 'hidden' }}>
                                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '1rem 1.25rem', borderBottom: '1px solid rgba(0,229,255,0.07)', background: 'rgba(0,229,255,0.02)' }}>
                                        <div>
                                            <h2 style={{ fontFamily: "'Rajdhani', sans-serif", fontSize: '1rem', fontWeight: 700, color: '#e2eaf7' }}>Personal Information</h2>
                                            <p style={{ fontSize: '0.72rem', color: '#3d5278', marginTop: 2 }}>Update your personal details</p>
                                        </div>
                                        {!isEditing && (
                                            <button onClick={() => setIsEditing(true)} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '0.4rem 0.9rem', borderRadius: 8, fontSize: '0.75rem', fontWeight: 600, cursor: 'pointer', background: 'rgba(0,229,255,0.08)', border: '1px solid rgba(0,229,255,0.2)', color: '#00e5ff' }}>
                                                <i className="fa-solid fa-pen" style={{ fontSize: 10 }}></i> Edit
                                            </button>
                                        )}
                                    </div>

                                    <form onSubmit={handleProfileSave} style={{ padding: '1.25rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                                            {[
                                                { key: 'firstName', label: 'First Name', icon: 'fa-user' },
                                                { key: 'lastName', label: 'Last Name', icon: 'fa-user' }
                                            ].map((field) => (
                                                <div key={field.key}>
                                                    <label style={{ display: 'block', fontSize: '0.7rem', fontWeight: 700, color: '#6b84b0', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 6 }}>
                                                        <i className={`fa-solid ${field.icon}`} style={{ color: 'rgba(0,229,255,0.5)', fontSize: 9, marginRight: 5 }}></i>{field.label}
                                                    </label>
                                                    {isEditing ? (
                                                        <input type="text" value={profileForm[field.key]} onChange={(event) => setProfileForm({ ...profileForm, [field.key]: event.target.value })} required className="input-dark" />
                                                    ) : (
                                                        <div style={{ padding: '0.65rem 0.85rem', background: 'rgba(0,0,0,0.2)', borderRadius: 8, color: '#c2d3f0', fontWeight: 600, fontSize: '0.85rem' }}>
                                                            {user?.[field.key]}
                                                        </div>
                                                    )}
                                                </div>
                                            ))}
                                        </div>

                                        <div>
                                            <label style={{ display: 'block', fontSize: '0.7rem', fontWeight: 700, color: '#6b84b0', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 6 }}>
                                                <i className="fa-solid fa-envelope" style={{ color: 'rgba(0,229,255,0.5)', fontSize: 9, marginRight: 5 }}></i>Email Address
                                            </label>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '0.65rem 0.85rem', background: 'rgba(0,0,0,0.15)', border: '1px solid rgba(0,229,255,0.05)', borderRadius: 8 }}>
                                                <i className="fa-solid fa-envelope" style={{ color: '#3d5278', fontSize: 12 }}></i>
                                                <span style={{ fontSize: '0.85rem', color: '#3d5278', fontWeight: 500 }}>{user?.email}</span>
                                                <span style={{ marginLeft: 'auto', fontSize: '0.65rem', color: '#3d5278', background: 'rgba(61,82,120,0.2)', padding: '0.12rem 0.5rem', borderRadius: 4 }}>Read only</span>
                                            </div>
                                        </div>

                                        <div>
                                            <label style={{ display: 'block', fontSize: '0.7rem', fontWeight: 700, color: '#6b84b0', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 6 }}>
                                                <i className="fa-solid fa-phone" style={{ color: 'rgba(0,229,255,0.5)', fontSize: 9, marginRight: 5 }}></i>Phone Number
                                            </label>
                                            {isEditing ? (
                                                <input type="text" value={profileForm.phone} onChange={(event) => setProfileForm({ ...profileForm, phone: event.target.value })} className="input-dark" placeholder="+94 7X XXX XXXX" />
                                            ) : (
                                                <div style={{ padding: '0.65rem 0.85rem', background: 'rgba(0,0,0,0.2)', borderRadius: 8, color: '#c2d3f0', fontWeight: 600, fontSize: '0.85rem' }}>
                                                    {user?.phone || 'Not provided'}
                                                </div>
                                            )}
                                        </div>

                                        {isEditing && (
                                            <div style={{ display: 'flex', gap: 10, paddingTop: '0.6rem', borderTop: '1px solid rgba(0,229,255,0.07)' }}>
                                                <button type="button" onClick={() => { setIsEditing(false); setProfileForm({ firstName: user?.firstName || '', lastName: user?.lastName || '', phone: user?.phone || '' }); }} className="btn-neon-cyan" style={{ flex: 1, justifyContent: 'center' }}>
                                                    Cancel
                                                </button>
                                                <button type="submit" disabled={saving} className="btn-solid-cyan" style={{ flex: 1, justifyContent: 'center' }}>
                                                    <i className="fa-solid fa-floppy-disk" style={{ fontSize: 11 }}></i>
                                                    {saving ? 'Saving...' : 'Save Changes'}
                                                </button>
                                            </div>
                                        )}
                                    </form>
                                </div>

                                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                                    <div style={{ background: 'rgba(13,21,38,0.8)', border: '1px solid rgba(0,229,255,0.1)', borderRadius: '1rem', padding: '1.1rem' }}>
                                        <h3 style={{ fontFamily: "'Rajdhani', sans-serif", fontSize: '0.9rem', fontWeight: 700, color: '#c2d3f0', marginBottom: '0.9rem', borderBottom: '1px solid rgba(0,229,255,0.07)', paddingBottom: '0.55rem' }}>
                                            Account Details
                                        </h3>
                                        {[
                                            { label: 'Account Type', value: user?.role, capitalize: true },
                                            { label: 'Status', value: 'Active', color: '#10b981' },
                                            { label: 'Member Since', value: new Date().toLocaleDateString() }
                                        ].map((entry) => (
                                            <div key={entry.label} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.42rem 0', borderBottom: '1px solid rgba(0,229,255,0.04)' }}>
                                                <span style={{ fontSize: '0.75rem', color: '#3d5278' }}>{entry.label}</span>
                                                <span style={{ fontSize: '0.75rem', fontWeight: 600, color: entry.color || '#c2d3f0', textTransform: entry.capitalize ? 'capitalize' : 'none' }}>{entry.value}</span>
                                            </div>
                                        ))}
                                    </div>

                                    <div style={{ background: 'rgba(239,68,68,0.04)', border: '1px solid rgba(239,68,68,0.15)', borderRadius: '1rem', padding: '1.1rem' }}>
                                        <h3 style={{ fontFamily: "'Rajdhani', sans-serif", fontSize: '0.9rem', fontWeight: 700, color: '#ef4444', marginBottom: '0.5rem' }}>Danger Zone</h3>
                                        <p style={{ fontSize: '0.78rem', color: '#6b84b0', marginBottom: '0.9rem', lineHeight: 1.5 }}>Permanently delete your account and all related data. This action cannot be undone.</p>
                                        <button onClick={handleDeleteAccount} style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, padding: '0.65rem', borderRadius: 8, background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)', color: '#ef4444', fontSize: '0.78rem', fontWeight: 600, cursor: 'pointer' }}>
                                            <i className="fa-solid fa-trash" style={{ fontSize: 11 }}></i> Delete My Account
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </motion.div>
                    )}

                    {activeTab === 'payments' && (
                        <motion.div key="payments" initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -16 }} transition={{ duration: 0.25 }}>
                            {loading ? (
                                <div style={{ display: 'flex', justifyContent: 'center', padding: '4rem 0' }}>
                                    <div style={{ width: 36, height: 36, borderRadius: '50%', border: '2px solid rgba(16,185,129,0.2)', borderTopColor: '#10b981', animation: 'spin 0.8s linear infinite' }} />
                                </div>
                            ) : payments.length === 0 ? (
                                <div style={{ textAlign: 'center', padding: '4rem 1rem', background: 'rgba(13,21,38,0.8)', border: '1px solid rgba(16,185,129,0.1)', borderRadius: '1rem' }}>
                                    <div style={{ width: 64, height: 64, borderRadius: 16, background: 'rgba(16,185,129,0.06)', border: '1px solid rgba(16,185,129,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1.25rem' }}>
                                        <i className="fa-solid fa-credit-card" style={{ color: '#10b981', fontSize: 24 }} />
                                    </div>
                                    <h3 style={{ color: '#c2d3f0', fontWeight: 700, marginBottom: 6 }}>No Payments Yet</h3>
                                    <p style={{ color: '#3d5278', fontSize: '0.82rem', marginBottom: '1.25rem' }}>Your completed and pending payments will appear here once you place an order.</p>
                                    <button onClick={() => navigate('/browse-menu')} className="btn-solid-cyan" style={{ display: 'inline-flex' }}>Browse Menu</button>
                                </div>
                            ) : (
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1rem' }}>
                                        {[
                                            { label: 'Payments', value: payments.length, icon: 'fa-credit-card', color: '#10b981' },
                                            { label: 'Completed Total', value: `LKR ${totalPaid.toFixed(2)}`, icon: 'fa-coins', color: '#f59e0b' },
                                            { label: 'Refunded', value: refundedPayments, icon: 'fa-rotate-left', color: '#00e5ff' }
                                        ].map((entry) => (
                                            <div key={entry.label} style={{ background: 'rgba(13,21,38,0.8)', border: `1px solid ${entry.color}15`, borderRadius: '0.875rem', padding: '1rem', display: 'flex', alignItems: 'center', gap: 12 }}>
                                                <div style={{ width: 36, height: 36, borderRadius: 8, background: `${entry.color}15`, border: `1px solid ${entry.color}25`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                                                    <i className={`fa-solid ${entry.icon}`} style={{ color: entry.color, fontSize: 13 }} />
                                                </div>
                                                <div>
                                                    <p style={{ fontSize: '0.65rem', color: '#3d5278', textTransform: 'uppercase', letterSpacing: '0.07em', fontWeight: 700 }}>{entry.label}</p>
                                                    <p style={{ fontFamily: "'Rajdhani', sans-serif", fontSize: '1.1rem', fontWeight: 700, color: '#e2eaf7', marginTop: 2 }}>{entry.value}</p>
                                                </div>
                                            </div>
                                        ))}
                                    </div>

                                    {payments.map((payment, index) => (
                                        <motion.div key={payment.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: index * 0.04 }}
                                            style={{ background: 'rgba(13,21,38,0.8)', border: '1px solid rgba(16,185,129,0.1)', borderRadius: '0.875rem', overflow: 'hidden' }}>
                                            <div style={{ padding: '1rem 1.125rem' }}>
                                                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, marginBottom: 10 }}>
                                                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                                                        <div style={{ width: 36, height: 36, borderRadius: 8, background: 'rgba(16,185,129,0.08)', border: '1px solid rgba(16,185,129,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                                            <i className="fa-solid fa-credit-card" style={{ color: '#10b981', fontSize: 13 }}></i>
                                                        </div>
                                                        <div>
                                                            <p style={{ fontSize: '0.85rem', fontWeight: 700, color: '#c2d3f0' }}>{payment.paymentNumber}</p>
                                                            <p style={{ fontSize: '0.72rem', color: '#3d5278' }}>
                                                                {new Date(payment.createdAt).toLocaleDateString()} | {payment.order?.orderNumber || `Order #${payment.orderId}`}
                                                            </p>
                                                        </div>
                                                    </div>
                                                    <div style={{ textAlign: 'right' }}>
                                                        <p style={{ fontFamily: "'Rajdhani', sans-serif", fontSize: '1.1rem', fontWeight: 700, color: '#f59e0b' }}>LKR {parseFloat(payment.totalAmount || 0).toFixed(2)}</p>
                                                        <span className={`badge ${paymentBadge(payment.paymentStatus)}`} style={{ fontSize: '0.62rem' }}>{payment.paymentStatus}</span>
                                                    </div>
                                                </div>

                                                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: 8, marginBottom: '0.85rem' }}>
                                                    <div style={{ background: 'rgba(0,0,0,0.18)', borderRadius: 8, padding: '0.55rem 0.7rem' }}>
                                                        <p style={{ fontSize: '0.62rem', color: '#3d5278', textTransform: 'uppercase', letterSpacing: '0.07em', fontWeight: 700 }}>Payment Method</p>
                                                        <p style={{ fontSize: '0.82rem', color: '#c2d3f0', fontWeight: 600, marginTop: 4 }}>{formatLabel(payment.paymentMethod)}</p>
                                                    </div>
                                                    <div style={{ background: 'rgba(0,0,0,0.18)', borderRadius: 8, padding: '0.55rem 0.7rem' }}>
                                                        <p style={{ fontSize: '0.62rem', color: '#3d5278', textTransform: 'uppercase', letterSpacing: '0.07em', fontWeight: 700 }}>Base Amount</p>
                                                        <p style={{ fontSize: '0.82rem', color: '#c2d3f0', fontWeight: 600, marginTop: 4 }}>LKR {parseFloat(payment.amount || 0).toFixed(2)}</p>
                                                    </div>
                                                    <div style={{ background: 'rgba(0,0,0,0.18)', borderRadius: 8, padding: '0.55rem 0.7rem' }}>
                                                        <p style={{ fontSize: '0.62rem', color: '#3d5278', textTransform: 'uppercase', letterSpacing: '0.07em', fontWeight: 700 }}>Tax / Discount</p>
                                                        <p style={{ fontSize: '0.82rem', color: '#c2d3f0', fontWeight: 600, marginTop: 4 }}>LKR {parseFloat(payment.tax || 0).toFixed(2)} / LKR {parseFloat(payment.discount || 0).toFixed(2)}</p>
                                                    </div>
                                                    <div style={{ background: 'rgba(0,0,0,0.18)', borderRadius: 8, padding: '0.55rem 0.7rem' }}>
                                                        <p style={{ fontSize: '0.62rem', color: '#3d5278', textTransform: 'uppercase', letterSpacing: '0.07em', fontWeight: 700 }}>Invoices</p>
                                                        <p style={{ fontSize: '0.82rem', color: '#c2d3f0', fontWeight: 600, marginTop: 4 }}>{payment.invoices?.length || 0}</p>
                                                    </div>
                                                </div>

                                                <div style={{ display: 'flex', justifyContent: 'space-between', gap: 10, flexWrap: 'wrap', alignItems: 'center', paddingTop: '0.75rem', borderTop: '1px solid rgba(16,185,129,0.06)' }}>
                                                    <div style={{ fontSize: '0.76rem', color: '#6b84b0' }}>
                                                        Paid by <span style={{ color: '#c2d3f0', fontWeight: 600 }}>{payment.paidBy || payment.order?.customerName || 'Customer'}</span>
                                                    </div>
                                                    <div style={{ fontSize: '0.76rem', color: '#6b84b0' }}>
                                                        Order type: <span style={{ color: '#c2d3f0', fontWeight: 600 }}>{formatLabel(payment.order?.orderType)}</span>
                                                    </div>
                                                </div>
                                            </div>
                                        </motion.div>
                                    ))}
                                </div>
                            )}
                        </motion.div>
                    )}

                    {activeTab === 'reservations' && (
                        <motion.div key="reservations" initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -16 }} transition={{ duration: 0.25 }}>
                            {loading ? (
                                <div style={{ display: 'flex', justifyContent: 'center', padding: '4rem 0' }}>
                                    <div style={{ width: 36, height: 36, borderRadius: '50%', border: '2px solid rgba(245,158,11,0.2)', borderTopColor: '#f59e0b', animation: 'spin 0.8s linear infinite' }} />
                                </div>
                            ) : reservations.length === 0 ? (
                                <div style={{ textAlign: 'center', padding: '4rem 1rem', background: 'rgba(13,21,38,0.8)', border: '1px solid rgba(245,158,11,0.1)', borderRadius: '1rem' }}>
                                    <div style={{ width: 64, height: 64, borderRadius: 16, background: 'rgba(245,158,11,0.06)', border: '1px solid rgba(245,158,11,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1.25rem' }}>
                                        <i className="fa-solid fa-calendar-xmark" style={{ color: '#f59e0b', fontSize: 24 }} />
                                    </div>
                                    <h3 style={{ color: '#c2d3f0', fontWeight: 700, marginBottom: 6 }}>No Reservations Yet</h3>
                                    <p style={{ color: '#3d5278', fontSize: '0.82rem', marginBottom: '1.25rem' }}>Book a table to see your reservations here.</p>
                                    <button onClick={() => navigate('/reservations')} className="btn-solid-cyan" style={{ display: 'inline-flex' }}>Book a Table</button>
                                </div>
                            ) : (
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1rem' }}>
                                        {[
                                            { label: 'Total Bookings', value: reservations.length, icon: 'fa-calendar', color: '#f59e0b' },
                                            { label: 'Confirmed', value: reservations.filter((reservation) => reservation.status === 'confirmed').length, icon: 'fa-circle-check', color: '#10b981' },
                                            { label: 'Upcoming', value: reservations.filter((reservation) => reservation.status !== 'cancelled' && reservation.status !== 'completed' && new Date(`${reservation.reservationDate}T${reservation.reservationTime}`) >= new Date()).length, icon: 'fa-clock', color: '#00e5ff' }
                                        ].map((entry) => (
                                            <div key={entry.label} style={{ background: 'rgba(13,21,38,0.8)', border: `1px solid ${entry.color}15`, borderRadius: '0.875rem', padding: '1rem', display: 'flex', alignItems: 'center', gap: 12 }}>
                                                <div style={{ width: 36, height: 36, borderRadius: 8, background: `${entry.color}15`, border: `1px solid ${entry.color}25`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                                                    <i className={`fa-solid ${entry.icon}`} style={{ color: entry.color, fontSize: 13 }} />
                                                </div>
                                                <div>
                                                    <p style={{ fontSize: '0.65rem', color: '#3d5278', textTransform: 'uppercase', letterSpacing: '0.07em', fontWeight: 700 }}>{entry.label}</p>
                                                    <p style={{ fontFamily: "'Rajdhani', sans-serif", fontSize: '1.1rem', fontWeight: 700, color: '#e2eaf7', marginTop: 2 }}>{entry.value}</p>
                                                </div>
                                            </div>
                                        ))}
                                    </div>

                                    {reservations.map((reservation, index) => {
                                        const isCancellable = reservation.status !== 'cancelled' && reservation.status !== 'completed';

                                        return (
                                            <motion.div key={reservation.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: index * 0.04 }}
                                                style={{ background: 'rgba(13,21,38,0.8)', border: '1px solid rgba(245,158,11,0.1)', borderRadius: '0.875rem', overflow: 'hidden' }}>
                                                <div style={{ padding: '1rem 1.125rem' }}>
                                                    <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12, marginBottom: 10 }}>
                                                        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                                                            <div style={{ width: 36, height: 36, borderRadius: 8, background: 'rgba(245,158,11,0.08)', border: '1px solid rgba(245,158,11,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                                                                <i className="fa-solid fa-calendar-check" style={{ color: '#f59e0b', fontSize: 13 }} />
                                                            </div>
                                                            <div>
                                                                <p style={{ fontSize: '0.85rem', fontWeight: 700, color: '#c2d3f0' }}>{reservation.reservationNumber}</p>
                                                                <p style={{ fontSize: '0.72rem', color: '#3d5278', marginTop: 2 }}>
                                                                    {new Date(reservation.reservationDate).toLocaleDateString('en-LK', { weekday: 'short', month: 'short', day: 'numeric' })} at {String(reservation.reservationTime || '').slice(0, 5)}
                                                                </p>
                                                            </div>
                                                        </div>
                                                        <span className={`badge ${reservationBadge(reservation.status)}`} style={{ fontSize: '0.62rem' }}>{reservation.status}</span>
                                                    </div>

                                                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8 }}>
                                                        {[
                                                            { label: 'Table', value: reservation.table ? `Table ${reservation.table.tableNumber}` : `Table #${reservation.tableId}` },
                                                            { label: 'Guests', value: `${reservation.partySize} person${reservation.partySize > 1 ? 's' : ''}` },
                                                            { label: 'Duration', value: `${reservation.duration || 60} min` }
                                                        ].map((entry) => (
                                                            <div key={entry.label} style={{ background: 'rgba(0,0,0,0.2)', borderRadius: 6, padding: '0.45rem 0.6rem' }}>
                                                                <p style={{ fontSize: '0.6rem', color: '#3d5278', textTransform: 'uppercase', letterSpacing: '0.06em', fontWeight: 700, marginBottom: 2 }}>{entry.label}</p>
                                                                <p style={{ fontSize: '0.78rem', color: '#c2d3f0', fontWeight: 600 }}>{entry.value}</p>
                                                            </div>
                                                        ))}
                                                    </div>

                                                    {reservation.specialRequests && (
                                                        <div style={{ marginTop: 8, fontSize: '0.72rem', color: '#6b84b0', background: 'rgba(0,0,0,0.15)', borderRadius: 6, padding: '0.45rem 0.6rem' }}>
                                                            {reservation.specialRequests}
                                                        </div>
                                                    )}

                                                    {isCancellable && (
                                                        <div style={{ marginTop: 10, display: 'flex', justifyContent: 'flex-end' }}>
                                                            <button onClick={() => cancelReservation(reservation.id)} style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '0.35rem 0.9rem', borderRadius: 6, fontSize: '0.72rem', fontWeight: 600, cursor: 'pointer', background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)', color: '#ef4444' }}>
                                                                <i className="fa-solid fa-xmark" style={{ fontSize: 10 }}></i> Cancel Booking
                                                            </button>
                                                        </div>
                                                    )}
                                                </div>
                                            </motion.div>
                                        );
                                    })}
                                </div>
                            )}
                        </motion.div>
                    )}

                    {activeTab === 'orders' && (
                        <motion.div key="orders" initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -16 }} transition={{ duration: 0.25 }}>
                            {loading ? (
                                <div style={{ display: 'flex', justifyContent: 'center', padding: '4rem 0' }}>
                                    <div style={{ width: 36, height: 36, borderRadius: '50%', border: '2px solid rgba(0,229,255,0.2)', borderTopColor: '#00e5ff', animation: 'spin 0.8s linear infinite' }} />
                                </div>
                            ) : orders.length === 0 ? (
                                <div style={{ textAlign: 'center', padding: '4rem 1rem', background: 'rgba(13,21,38,0.8)', border: '1px solid rgba(0,229,255,0.08)', borderRadius: '1rem' }}>
                                    <div style={{ width: 64, height: 64, borderRadius: 16, background: 'rgba(0,229,255,0.06)', border: '1px solid rgba(0,229,255,0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1.25rem' }}>
                                        <i className="fa-solid fa-cart-shopping" style={{ color: '#3d5278', fontSize: 24 }}></i>
                                    </div>
                                    <h3 style={{ color: '#c2d3f0', fontWeight: 700, marginBottom: 6 }}>No Orders Yet</h3>
                                    <p style={{ color: '#3d5278', fontSize: '0.82rem', marginBottom: '1.25rem' }}>Browse our menu and place your first order.</p>
                                    <button onClick={() => navigate('/browse-menu')} className="btn-solid-cyan" style={{ display: 'inline-flex' }}>Browse Menu</button>
                                </div>
                            ) : (
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1rem' }}>
                                        {[
                                            { label: 'Total Orders', value: orders.length, icon: 'fa-cart-shopping', color: '#00e5ff' },
                                            { label: 'Total Spent', value: `LKR ${totalSpent.toFixed(2)}`, icon: 'fa-coins', color: '#f59e0b' },
                                            { label: 'Completed', value: completedOrders, icon: 'fa-circle-check', color: '#10b981' }
                                        ].map((entry) => (
                                            <div key={entry.label} style={{ background: 'rgba(13,21,38,0.8)', border: `1px solid ${entry.color}15`, borderRadius: '0.875rem', padding: '1rem', display: 'flex', alignItems: 'center', gap: 12 }}>
                                                <div style={{ width: 36, height: 36, borderRadius: 8, background: `${entry.color}15`, border: `1px solid ${entry.color}25`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                                                    <i className={`fa-solid ${entry.icon}`} style={{ color: entry.color, fontSize: 13 }} />
                                                </div>
                                                <div>
                                                    <p style={{ fontSize: '0.65rem', color: '#3d5278', textTransform: 'uppercase', letterSpacing: '0.07em', fontWeight: 700 }}>{entry.label}</p>
                                                    <p style={{ fontFamily: "'Rajdhani', sans-serif", fontSize: '1.1rem', fontWeight: 700, color: '#e2eaf7', marginTop: 2 }}>{entry.value}</p>
                                                </div>
                                            </div>
                                        ))}
                                    </div>

                                    {orders.map((order, index) => {
                                        const fulfillment = order.fulfillmentDetails || {};

                                        return (
                                            <motion.div key={order.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: index * 0.04 }}
                                                style={{ background: 'rgba(13,21,38,0.8)', border: '1px solid rgba(0,229,255,0.08)', borderRadius: '0.875rem', overflow: 'hidden' }}>
                                                <div style={{ padding: '1rem 1.125rem' }}>
                                                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, marginBottom: 10 }}>
                                                        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                                                            <div style={{ width: 36, height: 36, borderRadius: 8, background: 'rgba(0,229,255,0.06)', border: '1px solid rgba(0,229,255,0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                                                <i className="fa-solid fa-cart-shopping" style={{ color: '#00e5ff', fontSize: 13 }}></i>
                                                            </div>
                                                            <div>
                                                                <p style={{ fontSize: '0.85rem', fontWeight: 700, color: '#c2d3f0' }}>{order.orderNumber}</p>
                                                                <p style={{ fontSize: '0.72rem', color: '#3d5278' }}>
                                                                    {new Date(order.createdAt).toLocaleDateString()} | {formatLabel(order.orderType)}
                                                                </p>
                                                            </div>
                                                        </div>
                                                        <div style={{ textAlign: 'right' }}>
                                                            <p style={{ fontFamily: "'Rajdhani', sans-serif", fontSize: '1.1rem', fontWeight: 700, color: '#f59e0b' }}>LKR {parseFloat(order.totalAmount).toFixed(2)}</p>
                                                            <span className={`badge ${statusBadge(order.status)}`} style={{ fontSize: '0.62rem' }}>{order.status}</span>
                                                        </div>
                                                    </div>

                                                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: 8, marginBottom: '0.85rem' }}>
                                                        <div style={{ background: 'rgba(0,0,0,0.18)', borderRadius: 8, padding: '0.55rem 0.7rem' }}>
                                                            <p style={{ fontSize: '0.62rem', color: '#3d5278', textTransform: 'uppercase', letterSpacing: '0.07em', fontWeight: 700 }}>Service Mode</p>
                                                            <p style={{ fontSize: '0.82rem', color: '#c2d3f0', fontWeight: 600, marginTop: 4 }}>{formatLabel(order.orderType)}</p>
                                                        </div>

                                                        {order.orderType === 'dine-in' && (
                                                            <div style={{ background: 'rgba(16,185,129,0.08)', borderRadius: 8, padding: '0.55rem 0.7rem' }}>
                                                                <p style={{ fontSize: '0.62rem', color: '#10b981', textTransform: 'uppercase', letterSpacing: '0.07em', fontWeight: 700 }}>Table</p>
                                                                <p style={{ fontSize: '0.82rem', color: '#c2d3f0', fontWeight: 600, marginTop: 4 }}>Table {order.tableNumber || fulfillment.tableNumber || '-'}</p>
                                                            </div>
                                                        )}

                                                        {order.orderType === 'takeaway' && (
                                                            <>
                                                                <div style={{ background: 'rgba(245,158,11,0.08)', borderRadius: 8, padding: '0.55rem 0.7rem' }}>
                                                                    <p style={{ fontSize: '0.62rem', color: '#f59e0b', textTransform: 'uppercase', letterSpacing: '0.07em', fontWeight: 700 }}>Pickup Name</p>
                                                                    <p style={{ fontSize: '0.82rem', color: '#c2d3f0', fontWeight: 600, marginTop: 4 }}>{fulfillment.pickupName || order.customerName}</p>
                                                                </div>
                                                                <div style={{ background: 'rgba(245,158,11,0.08)', borderRadius: 8, padding: '0.55rem 0.7rem' }}>
                                                                    <p style={{ fontSize: '0.62rem', color: '#f59e0b', textTransform: 'uppercase', letterSpacing: '0.07em', fontWeight: 700 }}>Pickup Phone</p>
                                                                    <p style={{ fontSize: '0.82rem', color: '#c2d3f0', fontWeight: 600, marginTop: 4 }}>{fulfillment.pickupPhone || fulfillment.contactPhone || '-'}</p>
                                                                </div>
                                                            </>
                                                        )}

                                                        {order.orderType === 'online' && (
                                                            <>
                                                                <div style={{ background: 'rgba(168,85,247,0.08)', borderRadius: 8, padding: '0.55rem 0.7rem' }}>
                                                                    <p style={{ fontSize: '0.62rem', color: '#a855f7', textTransform: 'uppercase', letterSpacing: '0.07em', fontWeight: 700 }}>Payment Method</p>
                                                                    <p style={{ fontSize: '0.82rem', color: '#c2d3f0', fontWeight: 600, marginTop: 4 }}>{formatLabel(fulfillment.onlinePaymentMethod) || '-'}</p>
                                                                </div>
                                                                <div style={{ background: 'rgba(168,85,247,0.08)', borderRadius: 8, padding: '0.55rem 0.7rem' }}>
                                                                    <p style={{ fontSize: '0.62rem', color: '#a855f7', textTransform: 'uppercase', letterSpacing: '0.07em', fontWeight: 700 }}>Payment Record</p>
                                                                    <p style={{ fontSize: '0.82rem', color: '#c2d3f0', fontWeight: 600, marginTop: 4 }}>{fulfillment.paymentNumber || 'Captured at checkout'}</p>
                                                                </div>
                                                            </>
                                                        )}
                                                    </div>

                                                    {order.orderType === 'online' && fulfillment.deliveryAddress && (
                                                        <div style={{ marginBottom: '0.85rem', background: 'rgba(168,85,247,0.06)', border: '1px solid rgba(168,85,247,0.12)', borderRadius: 8, padding: '0.65rem 0.75rem' }}>
                                                            <p style={{ fontSize: '0.62rem', color: '#a855f7', textTransform: 'uppercase', letterSpacing: '0.07em', fontWeight: 700, marginBottom: 4 }}>Delivery Address</p>
                                                            <p style={{ fontSize: '0.78rem', color: '#c2d3f0', lineHeight: 1.55 }}>{fulfillment.deliveryAddress}</p>
                                                            {fulfillment.onlinePaymentReference && <p style={{ fontSize: '0.72rem', color: '#6b84b0', marginTop: 6 }}>Reference: {fulfillment.onlinePaymentReference}</p>}
                                                            {(fulfillment.contactPhone || fulfillment.pickupPhone) && <p style={{ fontSize: '0.72rem', color: '#6b84b0', marginTop: 4 }}>Contact: {fulfillment.contactPhone || fulfillment.pickupPhone}</p>}
                                                        </div>
                                                    )}

                                                    {order.customerNotes && (
                                                        <div style={{ marginBottom: '0.85rem', background: 'rgba(0,0,0,0.16)', borderRadius: 8, padding: '0.65rem 0.75rem' }}>
                                                            <p style={{ fontSize: '0.62rem', color: '#3d5278', textTransform: 'uppercase', letterSpacing: '0.07em', fontWeight: 700, marginBottom: 4 }}>Order Note</p>
                                                            <p style={{ fontSize: '0.78rem', color: '#c2d3f0', lineHeight: 1.55 }}>{order.customerNotes}</p>
                                                        </div>
                                                    )}

                                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
                                                        <span style={{ fontSize: '0.68rem', color: '#3d5278', textTransform: 'uppercase', letterSpacing: '0.08em', fontWeight: 700 }}>Items ({order.items?.length || 0})</span>
                                                        <button
                                                            onClick={() => openOrderQr(order)}
                                                            disabled={qrLoadingId === order.id}
                                                            style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '0.35rem 0.7rem', borderRadius: 6, fontSize: '0.72rem', fontWeight: 600, cursor: qrLoadingId === order.id ? 'wait' : 'pointer', background: 'rgba(0,229,255,0.08)', border: '1px solid rgba(0,229,255,0.2)', color: '#00e5ff' }}
                                                        >
                                                            <i className={`fa-solid ${qrLoadingId === order.id ? 'fa-spinner fa-spin' : 'fa-qrcode'}`} style={{ fontSize: 10 }}></i>
                                                            {qrLoadingId === order.id ? 'Loading QR' : 'View QR'}
                                                        </button>
                                                    </div>

                                                    {order.items && order.items.length > 0 && (
                                                        <div style={{ paddingTop: '0.75rem', borderTop: '1px solid rgba(0,229,255,0.06)', display: 'flex', flexDirection: 'column', gap: 4 }}>
                                                            {order.items.map((item) => (
                                                                <div key={item.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'rgba(0,0,0,0.15)', borderRadius: 6, padding: '0.32rem 0.6rem', fontSize: '0.75rem' }}>
                                                                    <span style={{ color: '#c2d3f0' }}>{item.itemName} <span style={{ color: '#3d5278' }}>x{item.quantity}</span></span>
                                                                    <span style={{ color: '#6b84b0', fontWeight: 600 }}>LKR {parseFloat(item.totalPrice).toFixed(2)}</span>
                                                                </div>
                                                            ))}
                                                        </div>
                                                    )}
                                                </div>
                                            </motion.div>
                                        );
                                    })}
                                </div>
                            )}
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>

            <AnimatePresence>
                {orderQrPreview && (
                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                        style={{ position: 'fixed', inset: 0, background: 'rgba(7,11,20,0.85)', backdropFilter: 'blur(8px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 80, padding: '1rem' }}>
                        <motion.div initial={{ scale: 0.92, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.92, opacity: 0 }}
                            style={{ background: '#0d1526', border: '1px solid rgba(0,229,255,0.14)', borderRadius: '1.1rem', width: '100%', maxWidth: 760, maxHeight: '92vh', overflowY: 'auto' }}>
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '1rem 1.25rem', borderBottom: '1px solid rgba(0,229,255,0.08)' }}>
                                <div>
                                    <h3 style={{ fontFamily: "'Rajdhani', sans-serif", fontSize: '1.15rem', fontWeight: 700, color: '#e2eaf7' }}>Order QR Preview</h3>
                                    <p style={{ fontSize: '0.74rem', color: '#6b84b0', marginTop: 3 }}>{orderQrPreview.order.orderNumber}</p>
                                </div>
                                <button onClick={() => setOrderQrPreview(null)} style={{ background: 'none', border: 'none', color: '#3d5278', cursor: 'pointer', fontSize: 18 }}>
                                    <i className="fa-solid fa-xmark"></i>
                                </button>
                            </div>

                            <div style={{ padding: '1.25rem', display: 'grid', gridTemplateColumns: '1.1fr 0.9fr', gap: '1rem' }}>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                                        {[
                                            { label: 'Order Type', value: formatLabel(orderQrPreview.order.orderType) },
                                            { label: 'Status', value: orderQrPreview.order.status },
                                            { label: 'Total', value: `LKR ${parseFloat(orderQrPreview.order.totalAmount).toFixed(2)}` },
                                            { label: 'QR Token', value: orderQrPreview.qrToken || '-' }
                                        ].map((entry) => (
                                            <div key={entry.label} style={{ background: 'rgba(0,0,0,0.18)', borderRadius: 8, padding: '0.65rem 0.75rem' }}>
                                                <p style={{ fontSize: '0.62rem', color: '#3d5278', textTransform: 'uppercase', letterSpacing: '0.07em', fontWeight: 700 }}>{entry.label}</p>
                                                <p style={{ fontSize: '0.82rem', color: '#c2d3f0', fontWeight: 600, marginTop: 4 }}>{entry.value}</p>
                                            </div>
                                        ))}
                                    </div>

                                    {orderQrPreview.order.orderType === 'dine-in' && (
                                        <div style={{ background: 'rgba(16,185,129,0.08)', borderRadius: 8, padding: '0.75rem 0.85rem' }}>
                                            <p style={{ fontSize: '0.62rem', color: '#10b981', textTransform: 'uppercase', letterSpacing: '0.07em', fontWeight: 700 }}>Dine-in</p>
                                            <p style={{ fontSize: '0.82rem', color: '#c2d3f0', fontWeight: 600, marginTop: 4 }}>Table {orderQrPreview.order.tableNumber || orderQrPreview.fulfillmentDetails.tableNumber || '-'}</p>
                                        </div>
                                    )}

                                    {orderQrPreview.order.orderType === 'takeaway' && (
                                        <div style={{ background: 'rgba(245,158,11,0.08)', borderRadius: 8, padding: '0.75rem 0.85rem' }}>
                                            <p style={{ fontSize: '0.62rem', color: '#f59e0b', textTransform: 'uppercase', letterSpacing: '0.07em', fontWeight: 700 }}>Pickup Details</p>
                                            <p style={{ fontSize: '0.82rem', color: '#c2d3f0', fontWeight: 600, marginTop: 4 }}>{orderQrPreview.fulfillmentDetails.pickupName || orderQrPreview.order.customerName}</p>
                                            <p style={{ fontSize: '0.74rem', color: '#6b84b0', marginTop: 4 }}>{orderQrPreview.fulfillmentDetails.pickupPhone || orderQrPreview.fulfillmentDetails.contactPhone || '-'}</p>
                                        </div>
                                    )}

                                    {orderQrPreview.order.orderType === 'online' && (
                                        <div style={{ background: 'rgba(168,85,247,0.08)', borderRadius: 8, padding: '0.75rem 0.85rem' }}>
                                            <p style={{ fontSize: '0.62rem', color: '#a855f7', textTransform: 'uppercase', letterSpacing: '0.07em', fontWeight: 700 }}>Delivery and Payment</p>
                                            <p style={{ fontSize: '0.78rem', color: '#c2d3f0', lineHeight: 1.55, marginTop: 4 }}>{orderQrPreview.fulfillmentDetails.deliveryAddress || '-'}</p>
                                            <p style={{ fontSize: '0.74rem', color: '#6b84b0', marginTop: 6 }}>Method: {formatLabel(orderQrPreview.fulfillmentDetails.onlinePaymentMethod) || '-'}</p>
                                            {orderQrPreview.fulfillmentDetails.onlinePaymentReference && <p style={{ fontSize: '0.74rem', color: '#6b84b0', marginTop: 3 }}>Reference: {orderQrPreview.fulfillmentDetails.onlinePaymentReference}</p>}
                                            {orderQrPreview.fulfillmentDetails.paymentNumber && <p style={{ fontSize: '0.74rem', color: '#6b84b0', marginTop: 3 }}>Payment: {orderQrPreview.fulfillmentDetails.paymentNumber}</p>}
                                        </div>
                                    )}

                                    {orderQrPreview.customerNotes && (
                                        <div style={{ background: 'rgba(0,0,0,0.18)', borderRadius: 8, padding: '0.75rem 0.85rem' }}>
                                            <p style={{ fontSize: '0.62rem', color: '#3d5278', textTransform: 'uppercase', letterSpacing: '0.07em', fontWeight: 700 }}>Order Note</p>
                                            <p style={{ fontSize: '0.78rem', color: '#c2d3f0', lineHeight: 1.55, marginTop: 4 }}>{orderQrPreview.customerNotes}</p>
                                        </div>
                                    )}
                                </div>

                                <div style={{ background: 'rgba(0,0,0,0.18)', border: '1px solid rgba(0,229,255,0.08)', borderRadius: 10, padding: '1rem', display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', gap: '0.75rem' }}>
                                    <p style={{ fontSize: '0.72rem', color: '#00e5ff', textTransform: 'uppercase', letterSpacing: '0.07em', fontWeight: 700 }}>Customer QR</p>
                                    {orderQrPreview.qrDataUrl ? (
                                        <img src={orderQrPreview.qrDataUrl} alt="Order QR" style={{ width: 230, height: 230, background: '#fff', padding: 12, borderRadius: 12 }} />
                                    ) : (
                                        <div style={{ width: '100%', border: '1px dashed rgba(0,229,255,0.18)', borderRadius: 10, padding: '2rem 1rem', textAlign: 'center', color: '#3d5278', fontSize: '0.78rem' }}>
                                            QR preview is not available.
                                        </div>
                                    )}
                                    <p style={{ fontSize: '0.74rem', color: '#6b84b0', textAlign: 'center', lineHeight: 1.55 }}>Use this QR code and order number when checking the order status at the cafe.</p>
                                </div>
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>

            <Footer />
        </div>
    );
};

export default Profile;

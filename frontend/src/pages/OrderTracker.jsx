import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { useNavigate, useParams } from 'react-router-dom';
import Navbar from '../components/common/Navbar';
import Footer from '../components/common/Footer';
import API from '../services/api';

const formatLabel = (value) => String(value || '').replace(/_/g, ' ');

const OrderTracker = () => {
    const navigate = useNavigate();
    const { qrToken } = useParams();
    const [loading, setLoading] = useState(true);
    const [order, setOrder] = useState(null);
    const [error, setError] = useState('');

    useEffect(() => {
        if (!qrToken) {
            setError('Invalid order QR code');
            setLoading(false);
            return;
        }

        API.get(`/orders/track/${qrToken}`)
            .then((response) => {
                setOrder(response.data.order);
                setError('');
            })
            .catch((requestError) => {
                setOrder(null);
                setError(requestError.response?.data?.message || 'Unable to load order details');
            })
            .finally(() => setLoading(false));
    }, [qrToken]);

    const fulfillment = order?.fulfillmentDetails || {};

    return (
        <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', background: '#070b14', fontFamily: "'Inter', sans-serif" }}>
            <Navbar />

            <section style={{ position: 'relative', padding: '4rem 1.25rem 2.5rem', overflow: 'hidden', borderBottom: '1px solid rgba(0,229,255,0.08)', minHeight: 220, display: 'flex', alignItems: 'center' }}>
                <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(180deg, rgba(7,11,20,0.72) 0%, rgba(7,11,20,0.95) 100%)', pointerEvents: 'none' }} />
                <div className="hud-grid" style={{ position: 'absolute', inset: 0, opacity: 0.24, pointerEvents: 'none' }} />
                <div style={{ position: 'absolute', top: '-80px', left: '50%', transform: 'translateX(-50%)', width: 520, height: 320, background: 'radial-gradient(circle, rgba(0,229,255,0.1) 0%, transparent 70%)', borderRadius: '50%', pointerEvents: 'none' }} />
                <div style={{ maxWidth: 980, margin: '0 auto', position: 'relative', zIndex: 1, width: '100%', textAlign: 'center' }}>
                    <motion.div initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }}>
                        <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, padding: '0.32rem 0.9rem', borderRadius: 999, background: 'rgba(0,229,255,0.07)', border: '1px solid rgba(0,229,255,0.2)', marginBottom: '1rem' }}>
                            <i className="fa-solid fa-qrcode" style={{ color: '#00e5ff', fontSize: 11 }} />
                            <span style={{ fontSize: '0.68rem', fontWeight: 700, color: '#00e5ff', letterSpacing: '0.12em', textTransform: 'uppercase' }}>Order Tracking</span>
                        </div>
                        <h1 style={{ fontFamily: "'Rajdhani', sans-serif", fontSize: 'clamp(1.9rem, 4vw, 2.6rem)', fontWeight: 700, color: '#e2eaf7', marginBottom: '0.55rem' }}>
                            Scan Result for <span style={{ background: 'linear-gradient(90deg, #00e5ff, #10b981)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>Your Order</span>
                        </h1>
                        <p style={{ color: 'rgba(194,211,240,0.76)', fontSize: '0.9rem' }}>Use this page to confirm the order number, service mode, status, and full item list.</p>
                    </motion.div>
                </div>
            </section>

            <div style={{ maxWidth: 980, margin: '0 auto', width: '100%', padding: '2rem 1.25rem 4rem', flex: 1 }}>
                {loading ? (
                    <div style={{ display: 'flex', justifyContent: 'center', padding: '5rem 0' }}>
                        <div style={{ width: 38, height: 38, borderRadius: '50%', border: '2px solid rgba(0,229,255,0.2)', borderTopColor: '#00e5ff', animation: 'spin 0.8s linear infinite' }} />
                    </div>
                ) : error ? (
                    <div style={{ background: 'rgba(13,21,38,0.82)', border: '1px solid rgba(239,68,68,0.14)', borderRadius: '1rem', padding: '2rem 1.5rem', textAlign: 'center' }}>
                        <div style={{ width: 62, height: 62, borderRadius: 16, background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.16)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1rem' }}>
                            <i className="fa-solid fa-circle-xmark" style={{ color: '#ef4444', fontSize: 24 }} />
                        </div>
                        <h2 style={{ color: '#e2eaf7', fontWeight: 700, marginBottom: 6 }}>Order Details Unavailable</h2>
                        <p style={{ color: '#6b84b0', fontSize: '0.84rem', marginBottom: '1.25rem' }}>{error}</p>
                        <button onClick={() => navigate('/browse-menu')} className="btn-solid-cyan" style={{ display: 'inline-flex' }}>
                            Browse Menu
                        </button>
                    </div>
                ) : (
                    <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} style={{ display: 'grid', gridTemplateColumns: '1.05fr 0.95fr', gap: '1rem' }}>
                        <div style={{ background: 'rgba(13,21,38,0.82)', border: '1px solid rgba(0,229,255,0.1)', borderRadius: '1rem', padding: '1.15rem' }}>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                                {[
                                    { label: 'Order Number', value: order.orderNumber },
                                    { label: 'Status', value: order.status },
                                    { label: 'Order Type', value: formatLabel(order.orderType) },
                                    { label: 'Total', value: `LKR ${parseFloat(order.totalAmount).toFixed(2)}` }
                                ].map((item) => (
                                    <div key={item.label} style={{ background: 'rgba(0,0,0,0.18)', borderRadius: 10, padding: '0.8rem 0.9rem' }}>
                                        <p style={{ fontSize: '0.62rem', color: '#3d5278', textTransform: 'uppercase', letterSpacing: '0.08em', fontWeight: 700 }}>{item.label}</p>
                                        <p style={{ fontSize: '0.86rem', color: '#e2eaf7', fontWeight: 600, marginTop: 4 }}>{item.value}</p>
                                    </div>
                                ))}
                            </div>

                            {order.orderType === 'dine-in' && (
                                <div style={{ marginTop: '0.95rem', background: 'rgba(16,185,129,0.08)', border: '1px solid rgba(16,185,129,0.16)', borderRadius: 12, padding: '0.9rem 1rem' }}>
                                    <p style={{ fontSize: '0.7rem', color: '#10b981', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em' }}>Dine-in Details</p>
                                    <p style={{ color: '#c2d3f0', fontSize: '0.85rem', marginTop: 6 }}>Table {order.tableNumber || fulfillment.tableNumber || '-'}</p>
                                    {fulfillment.tableLocation && <p style={{ color: '#6b84b0', fontSize: '0.76rem', marginTop: 4 }}>Location: {formatLabel(fulfillment.tableLocation)}</p>}
                                </div>
                            )}

                            {order.orderType === 'takeaway' && (
                                <div style={{ marginTop: '0.95rem', background: 'rgba(245,158,11,0.08)', border: '1px solid rgba(245,158,11,0.16)', borderRadius: 12, padding: '0.9rem 1rem' }}>
                                    <p style={{ fontSize: '0.7rem', color: '#f59e0b', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em' }}>Pickup Details</p>
                                    <p style={{ color: '#c2d3f0', fontSize: '0.85rem', marginTop: 6 }}>{fulfillment.pickupName || order.customerName}</p>
                                    <p style={{ color: '#6b84b0', fontSize: '0.76rem', marginTop: 4 }}>Phone: {fulfillment.pickupPhone || fulfillment.contactPhone || '-'}</p>
                                </div>
                            )}

                            {order.orderType === 'online' && (
                                <div style={{ marginTop: '0.95rem', background: 'rgba(168,85,247,0.08)', border: '1px solid rgba(168,85,247,0.16)', borderRadius: 12, padding: '0.9rem 1rem' }}>
                                    <p style={{ fontSize: '0.7rem', color: '#a855f7', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em' }}>Delivery and Payment</p>
                                    {fulfillment.deliveryAddress && <p style={{ color: '#c2d3f0', fontSize: '0.82rem', lineHeight: 1.6, marginTop: 6 }}>{fulfillment.deliveryAddress}</p>}
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: 4, marginTop: 8, fontSize: '0.76rem', color: '#6b84b0' }}>
                                        <span>Phone: {fulfillment.contactPhone || fulfillment.pickupPhone || '-'}</span>
                                        <span>Method: {formatLabel(fulfillment.onlinePaymentMethod) || '-'}</span>
                                        <span>Reference: {fulfillment.onlinePaymentReference || '-'}</span>
                                        {fulfillment.paymentNumber && <span>Payment Record: {fulfillment.paymentNumber}</span>}
                                    </div>
                                </div>
                            )}

                            {order.customerNotes && (
                                <div style={{ marginTop: '0.95rem', background: 'rgba(0,0,0,0.18)', borderRadius: 12, padding: '0.9rem 1rem' }}>
                                    <p style={{ fontSize: '0.7rem', color: '#6b84b0', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em' }}>Order Note</p>
                                    <p style={{ color: '#c2d3f0', fontSize: '0.8rem', lineHeight: 1.6, marginTop: 6 }}>{order.customerNotes}</p>
                                </div>
                            )}
                        </div>

                        <div style={{ background: 'rgba(13,21,38,0.82)', border: '1px solid rgba(0,229,255,0.1)', borderRadius: '1rem', padding: '1.15rem' }}>
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.95rem' }}>
                                <div>
                                    <h2 style={{ fontFamily: "'Rajdhani', sans-serif", fontSize: '1.1rem', fontWeight: 700, color: '#e2eaf7' }}>Items in This Order</h2>
                                    <p style={{ color: '#6b84b0', fontSize: '0.74rem', marginTop: 4 }}>{order.items?.length || 0} item{order.items?.length !== 1 ? 's' : ''}</p>
                                </div>
                                <span style={{ fontSize: '0.68rem', color: '#00e5ff', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase' }}>Live Details</span>
                            </div>

                            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                                {(order.items || []).map((item) => (
                                    <div key={item.id} style={{ display: 'flex', justifyContent: 'space-between', gap: 12, background: 'rgba(0,0,0,0.18)', borderRadius: 10, padding: '0.75rem 0.85rem' }}>
                                        <div>
                                            <p style={{ color: '#c2d3f0', fontWeight: 600, fontSize: '0.82rem' }}>{item.itemName}</p>
                                            <p style={{ color: '#6b84b0', fontSize: '0.72rem', marginTop: 4 }}>Qty {item.quantity} x LKR {parseFloat(item.unitPrice).toFixed(2)}</p>
                                            {item.specialInstructions && <p style={{ color: '#6b84b0', fontSize: '0.72rem', marginTop: 4 }}>{item.specialInstructions}</p>}
                                        </div>
                                        <p style={{ color: '#00e5ff', fontWeight: 700, fontSize: '0.82rem' }}>LKR {parseFloat(item.totalPrice).toFixed(2)}</p>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </motion.div>
                )}
            </div>

            <Footer />
        </div>
    );
};

export default OrderTracker;

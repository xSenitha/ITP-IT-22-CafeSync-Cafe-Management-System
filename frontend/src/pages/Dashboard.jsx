// futuristic dark dashboard — role-aware
import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { FaCartShopping, FaCreditCard, FaBookOpen, FaCalendarCheck, FaChartLine, FaPlus, FaClock, FaArrowRight, FaUser, FaClockRotateLeft } from 'react-icons/fa6';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import API from '../services/api';

const statusStyle = (status) => {
    const map = { completed: 'badge-success', pending: 'badge-warning', preparing: 'badge-info', cancelled: 'badge-danger', ready: 'badge-purple' };
    return map[status] || 'badge-muted';
};

const Dashboard = () => {
    const { user } = useAuth();
    const isCustomer = user?.role === 'customer';
    const [stats, setStats] = useState({ orders: 0, payments: 0, menuItems: 0, tables: 0, myOrders: 0, myReservations: 0 });
    const [recentOrders, setRecentOrders] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchStats = async () => {
            try {
                const [ordersRes, paymentsRes, menuRes, tablesRes, reservationsRes] = await Promise.all([
                    API.get('/orders').catch(() => ({ data: [] })),
                    API.get('/payments').catch(() => ({ data: [] })),
                    API.get('/menu/items').catch(() => ({ data: [] })),
                    API.get('/tables/tables').catch(() => ({ data: [] })),
                    API.get('/tables/reservations').catch(() => ({ data: [] })),
                ]);
                const allOrders = ordersRes.data;
                const myOrders = allOrders.filter(o => o.customerId === user?.id || o.customerName === `${user?.firstName} ${user?.lastName}`);
                const myReservations = reservationsRes.data.filter(r => r.customerName === `${user?.firstName} ${user?.lastName}`);
                setStats({ orders: allOrders.length, payments: paymentsRes.data.length, menuItems: menuRes.data.length, tables: tablesRes.data.length, myOrders: myOrders.length, myReservations: myReservations.length });
                setRecentOrders(isCustomer ? myOrders.slice(0, 5) : allOrders.slice(0, 5));
            } catch { /* silent */ } finally { setLoading(false); }
        };
        fetchStats();
    }, []);

    const adminStatCards = [
        { title: 'Total Orders',  value: stats.orders,    icon: 'fa-cart-shopping', color: '#00e5ff',  link: '/orders' },
        { title: 'Payments',      value: stats.payments,  icon: 'fa-credit-card',   color: '#10b981',  link: '/payments' },
        { title: 'Menu Items',    value: stats.menuItems, icon: 'fa-book-open',     color: '#f59e0b',  link: '/menu' },
        { title: 'Tables',        value: stats.tables,    icon: 'fa-chair',         color: '#a855f7',  link: '/tables' },
    ];
    const customerStatCards = [
        { title: 'My Orders',       value: stats.myOrders,       icon: 'fa-cart-shopping',  color: '#00e5ff', link: '/profile?tab=orders' },
        { title: 'My Reservations', value: stats.myReservations, icon: 'fa-calendar-check', color: '#a855f7', link: '/reservations' },
        { title: 'Menu Items',      value: stats.menuItems,      icon: 'fa-book-open',      color: '#f59e0b', link: '/browse-menu' },
    ];
    const adminActions = [
        { title: 'New Order',       icon: 'fa-cart-plus',    link: '/orders',   color: '#00e5ff' },
        { title: 'Add Menu Item',   icon: 'fa-plus',         link: '/menu',     color: '#f59e0b' },
        { title: 'New Reservation', icon: 'fa-calendar-plus',link: '/tables',   color: '#a855f7' },
        { title: 'Process Payment', icon: 'fa-credit-card',  link: '/payments', color: '#10b981' },
    ];
    const customerActions = [
        { title: 'Browse Menu',      icon: 'fa-book-open',      link: '/browse-menu', color: '#f59e0b' },
        { title: 'Reservation',      icon: 'fa-calendar-check', link: '/reservations', color: '#a855f7' },
        { title: 'My Profile',       icon: 'fa-user',           link: '/profile',     color: '#00e5ff' },
        { title: 'Order History',    icon: 'fa-clock-rotate-left', link: '/profile?tab=orders',  color: '#10b981' },
    ];
    const statCards = isCustomer ? customerStatCards : adminStatCards;
    const quickActions = isCustomer ? customerActions : adminActions;

    return (
        <>
            {/* Header */}
            <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} style={{ marginBottom: '1.5rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <div style={{ width: 3, height: 32, background: 'linear-gradient(180deg, #00e5ff, #f59e0b)', borderRadius: 99 }} />
                    <div>
                        <h1 style={{ fontFamily: "'Rajdhani', sans-serif", fontSize: '1.55rem', fontWeight: 700, color: '#e2eaf7', letterSpacing: '0.02em' }}>
                            Welcome, {user?.firstName || 'User'}
                        </h1>
                        <p style={{ fontSize: '0.78rem', color: '#3d5278', marginTop: 2 }}>
                            {isCustomer ? 'Your account overview' : 'Cafe operations at a glance'}
                        </p>
                    </div>
                </div>
            </motion.div>

            {/* Stat Cards */}
            <div style={{ display: 'grid', gridTemplateColumns: `repeat(${isCustomer ? 3 : 4}, 1fr)`, gap: '1rem', marginBottom: '1.5rem' }}
                className={`grid-cols-2 ${isCustomer ? 'sm:grid-cols-3' : 'lg:grid-cols-4'}`}>
                {statCards.map((card, i) => (
                    <motion.div key={i} initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.07 }}>
                        <Link to={card.link} style={{ display: 'block', textDecoration: 'none' }}>
                            <div className="stat-card" style={{ borderColor: `${card.color}18`, transition: 'all 0.25s', cursor: 'pointer' }}
                                onMouseEnter={e => { e.currentTarget.style.borderColor = `${card.color}35`; e.currentTarget.style.boxShadow = `0 0 30px ${card.color}12`; }}
                                onMouseLeave={e => { e.currentTarget.style.borderColor = `${card.color}18`; e.currentTarget.style.boxShadow = 'none'; }}>
                                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.875rem' }}>
                                    <div style={{ width: 38, height: 38, borderRadius: 9, background: `${card.color}15`, border: `1px solid ${card.color}25`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                        <i className={`fa-solid ${card.icon}`} style={{ color: card.color, fontSize: 14 }}></i>
                                    </div>
                                    <FaChartLine style={{ color: '#10b981', fontSize: 13, opacity: 0.7 }} />
                                </div>
                                <p style={{ fontFamily: "'Rajdhani', sans-serif", fontSize: '2rem', fontWeight: 700, color: '#e2eaf7', lineHeight: 1 }}>
                                    {loading ? '—' : card.value}
                                </p>
                                <p style={{ fontSize: '0.72rem', color: '#6b84b0', marginTop: 4, fontWeight: 500, textTransform: 'uppercase', letterSpacing: '0.06em' }}>{card.title}</p>
                            </div>
                        </Link>
                    </motion.div>
                ))}
            </div>

            {/* Bottom Grid */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '1.25rem' }} className="grid-cols-1 lg:grid-cols-[1fr_2fr]">

                {/* Quick Actions */}
                <motion.div initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.28 }} className="section-card">
                    <div className="section-card-header">
                        <h3><i className="fa-solid fa-bolt" style={{ color: '#00e5ff', marginRight: 8 }}></i> Quick Actions</h3>
                    </div>
                    <div className="section-card-body">
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.625rem' }}>
                            {quickActions.map((action, i) => (
                                <Link key={i} to={action.link}
                                    style={{
                                        display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                                        gap: 8, padding: '1rem 0.5rem',
                                        background: `${action.color}08`, border: `1px solid ${action.color}18`,
                                        borderRadius: 10, textDecoration: 'none', transition: 'all 0.2s', cursor: 'pointer',
                                    }}
                                    onMouseEnter={e => { e.currentTarget.style.background = `${action.color}14`; e.currentTarget.style.borderColor = `${action.color}35`; }}
                                    onMouseLeave={e => { e.currentTarget.style.background = `${action.color}08`; e.currentTarget.style.borderColor = `${action.color}18`; }}>
                                    <div style={{ width: 34, height: 34, borderRadius: 8, background: `${action.color}18`, border: `1px solid ${action.color}25`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                        <i className={`fa-solid ${action.icon}`} style={{ color: action.color, fontSize: 14 }}></i>
                                    </div>
                                    <span style={{ fontSize: '0.7rem', fontWeight: 600, color: '#c2d3f0', textAlign: 'center', lineHeight: '1.3' }}>{action.title}</span>
                                </Link>
                            ))}
                        </div>
                    </div>
                </motion.div>

                {/* Recent Orders */}
                <motion.div initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.35 }} className="section-card">
                    <div className="section-card-header">
                        <h3><i className="fa-solid fa-clock-rotate-left" style={{ color: '#00e5ff', marginRight: 8 }}></i>{isCustomer ? 'My Recent Orders' : 'Recent Orders'}</h3>
                        <Link to={isCustomer ? '/profile' : '/orders'}
                            style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: '0.75rem', fontWeight: 600, color: '#00e5ff', textDecoration: 'none', transition: 'opacity 0.15s' }}
                            className="hover:opacity-75">
                            View All <FaArrowRight style={{ fontSize: 10 }} />
                        </Link>
                    </div>
                    <div className="section-card-body">
                        {recentOrders.length > 0 ? (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                                {recentOrders.map((order, i) => (
                                    <motion.div key={order.id} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.04 * i }}
                                        style={{
                                            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                                            padding: '0.65rem 0.875rem', borderRadius: 8,
                                            background: 'rgba(0,229,255,0.03)', border: '1px solid rgba(0,229,255,0.06)',
                                            transition: 'background 0.15s',
                                        }}
                                        onMouseEnter={e => e.currentTarget.style.background = 'rgba(0,229,255,0.06)'}
                                        onMouseLeave={e => e.currentTarget.style.background = 'rgba(0,229,255,0.03)'}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                                            <div style={{ width: 32, height: 32, borderRadius: 7, background: 'rgba(0,229,255,0.1)', border: '1px solid rgba(0,229,255,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                                                <i className="fa-solid fa-cart-shopping" style={{ color: '#00e5ff', fontSize: 11 }}></i>
                                            </div>
                                            <div>
                                                <p style={{ fontSize: '0.8rem', fontWeight: 600, color: '#c2d3f0' }}>{order.orderNumber}</p>
                                                <p style={{ fontSize: '0.7rem', color: '#3d5278' }}>{order.customerName}</p>
                                            </div>
                                        </div>
                                        <div style={{ textAlign: 'right', display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 4 }}>
                                            <p style={{ fontSize: '0.82rem', fontWeight: 600, color: '#e2eaf7' }}>LKR {parseFloat(order.totalAmount).toFixed(2)}</p>
                                            <span className={`badge ${statusStyle(order.status)}`}>{order.status}</span>
                                        </div>
                                    </motion.div>
                                ))}
                            </div>
                        ) : (
                            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '2.5rem 0', textAlign: 'center' }}>
                                <div style={{ width: 56, height: 56, borderRadius: 14, background: 'rgba(0,229,255,0.06)', border: '1px solid rgba(0,229,255,0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '1rem' }}>
                                    <FaClock style={{ color: '#6b84b0', fontSize: 22 }} />
                                </div>
                                <h3 style={{ fontSize: '0.9rem', fontWeight: 700, color: '#c2d3f0', marginBottom: 6 }}>No orders yet</h3>
                                <p style={{ fontSize: '0.78rem', color: '#3d5278', marginBottom: '1.125rem' }}>
                                    {isCustomer ? 'Your orders will appear here' : 'Start by creating your first order'}
                                </p>
                                <Link to={isCustomer ? '/browse-menu' : '/orders'}
                                    style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '0.5rem 1.125rem', background: 'linear-gradient(135deg, #00c4d6, #00e5ff)', color: '#070b14', borderRadius: 7, fontWeight: 700, fontSize: '0.8rem', textDecoration: 'none' }}>
                                    <FaPlus style={{ fontSize: 11 }} /> {isCustomer ? 'Browse Menu' : 'New Order'}
                                </Link>
                            </div>
                        )}
                    </div>
                </motion.div>
            </div>
        </>
    );
};

export default Dashboard;

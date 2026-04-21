// futuristic dark footer
import { Link, useLocation } from 'react-router-dom';
import { FaMugHot, FaEnvelope, FaPhone, FaLocationDot, FaGithub, FaLinkedin } from 'react-icons/fa6';
import { useAuth } from '../../context/AuthContext';

const Footer = () => {
    const location = useLocation();
    const { user, isAuthenticated } = useAuth();
    const isStaffUser = user?.role === 'admin' || user?.role === 'staff';
    const reservationLink = user?.role === 'customer' ? '/reservations' : (isAuthenticated ? '/tables' : '/login');
    const dashboardLink = isStaffUser ? '/dashboard' : (isAuthenticated ? '/profile' : '/login');
    const ordersLink = isStaffUser ? '/orders' : (isAuthenticated ? '/profile?tab=orders' : '/login');
    const menuLink = isStaffUser ? '/menu' : '/browse-menu';
    const billingLink = isStaffUser ? '/payments' : (isAuthenticated ? '/profile?tab=orders' : '/login');
    const staffLink = user?.role === 'admin' ? '/staff' : '/admin';
    if (['/login', '/register', '/admin'].includes(location.pathname)) return null;

    return (
        <footer style={{
            background: 'rgba(8,13,24,0.95)',
            borderTop: '1px solid rgba(0,229,255,0.08)',
            position: 'relative',
            overflow: 'hidden',
        }}>
            {/* top glow line */}
            <div style={{ height: 1, background: 'linear-gradient(90deg, transparent, rgba(0,229,255,0.4), rgba(245,158,11,0.3), transparent)' }} />

            {/* bg decoration */}
            <div style={{ position: 'absolute', top: 0, left: '50%', transform: 'translate(-50%,-50%)', width: 500, height: 300, background: 'radial-gradient(ellipse, rgba(0,229,255,0.04) 0%, transparent 70%)', pointerEvents: 'none' }} />

            <div style={{ maxWidth: 1200, margin: '0 auto', padding: '2.5rem 1.5rem 1.5rem' }}>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '2rem', marginBottom: '2rem' }}>

                    {/* Brand */}
                    <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: '0.75rem' }}>
                            <div style={{
                                width: 32, height: 32, borderRadius: 8,
                                background: 'rgba(0,229,255,0.1)',
                                border: '1px solid rgba(0,229,255,0.25)',
                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                            }}>
                                <FaMugHot style={{ color: '#00e5ff', fontSize: 14 }} />
                            </div>
                            <span style={{
                                fontFamily: "'Rajdhani', sans-serif",
                                fontSize: '1.15rem', fontWeight: 700,
                                background: 'linear-gradient(90deg, #00e5ff, #f59e0b)',
                                WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
                                letterSpacing: '0.04em',
                            }}>CafeSync</span>
                        </div>
                        <p style={{ fontSize: '0.78rem', color: '#3d5278', lineHeight: 1.7, maxWidth: 220 }}>
                            Next-generation cafe management platform. Streamline every operation from a single unified dashboard.
                        </p>
                        <div style={{ display: 'flex', gap: 8, marginTop: '1rem' }}>
                            {[FaGithub, FaLinkedin].map((Icon, i) => (
                                <div key={i} style={{
                                    width: 30, height: 30, borderRadius: 6,
                                    background: 'rgba(0,229,255,0.06)',
                                    border: '1px solid rgba(0,229,255,0.12)',
                                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                                    cursor: 'pointer', transition: 'all 0.2s',
                                }}
                                    className="hover:border-[rgba(0,229,255,0.4)] hover:bg-[rgba(0,229,255,0.12)]">
                                    <Icon style={{ color: '#6b84b0', fontSize: 13 }} />
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Quick Links */}
                    <div>
                        <h4 style={{ fontSize: '0.72rem', fontWeight: 700, color: '#00e5ff', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: '0.875rem' }}>Quick Links</h4>
                        <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: 8 }}>
                            {[
                                { to: dashboardLink, label: isStaffUser ? 'Dashboard' : 'My Profile' },
                                { to: '/browse-menu', label: 'Browse Menu' },
                                { to: ordersLink, label: isStaffUser ? 'Order Tracking' : 'My Orders' },
                                { to: reservationLink, label: 'Reservations' },
                            ].map(({ to, label }) => (
                                <li key={to}>
                                    <Link to={to}
                                        style={{ fontSize: '0.8rem', color: '#3d5278', display: 'flex', alignItems: 'center', gap: 6, transition: 'color 0.15s' }}
                                        className="hover:text-[#00e5ff]">
                                        <i className="fa-solid fa-chevron-right" style={{ fontSize: 9, color: 'rgba(0,229,255,0.4)' }}></i>
                                        {label}
                                    </Link>
                                </li>
                            ))}
                        </ul>
                    </div>

                    {/* System */}
                    <div>
                        <h4 style={{ fontSize: '0.72rem', fontWeight: 700, color: '#00e5ff', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: '0.875rem' }}>System</h4>
                        <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: 8 }}>
                            {[
                                { to: menuLink, label: isStaffUser ? 'Menu Management' : 'Browse Menu' },
                                { to: billingLink, label: isStaffUser ? 'Billing & Payments' : 'My Payments' },
                                { to: staffLink, label: user?.role === 'admin' ? 'Staff Management' : 'Admin Login' },
                                { to: '/login', label: isAuthenticated ? 'Customer Login' : 'Login' },
                            ].map(({ to, label }) => (
                                <li key={label}>
                                    <Link to={to}
                                        style={{ fontSize: '0.8rem', color: '#3d5278', display: 'flex', alignItems: 'center', gap: 6, transition: 'color 0.15s' }}
                                        className="hover:text-[#00e5ff]">
                                        <i className="fa-solid fa-chevron-right" style={{ fontSize: 9, color: 'rgba(0,229,255,0.4)' }}></i>
                                        {label}
                                    </Link>
                                </li>
                            ))}
                        </ul>
                    </div>

                    {/* Contact */}
                    <div>
                        <h4 style={{ fontSize: '0.72rem', fontWeight: 700, color: '#00e5ff', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: '0.875rem' }}>Contact</h4>
                        <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: 10 }}>
                            {[
                                { icon: FaLocationDot, text: 'Malabe, Sri Lanka' },
                                { icon: FaPhone, text: '+94 11 234 5678' },
                                { icon: FaEnvelope, text: 'info@cafesync.lk' },
                            ].map(({ icon: Icon, text }, i) => (
                                <li key={i} style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: '0.78rem', color: '#3d5278' }}>
                                    <div style={{
                                        width: 24, height: 24, borderRadius: 5,
                                        background: 'rgba(0,229,255,0.06)',
                                        border: '1px solid rgba(0,229,255,0.12)',
                                        display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                                    }}>
                                        <Icon style={{ color: '#00e5ff', fontSize: 10 }} />
                                    </div>
                                    {text}
                                </li>
                            ))}
                        </ul>
                    </div>
                </div>

                {/* Bottom Bar */}
                <div style={{ borderTop: '1px solid rgba(0,229,255,0.07)', paddingTop: '1.25rem', display: 'flex', flexWrap: 'wrap', gap: '0.5rem', alignItems: 'center', justifyContent: 'space-between' }}>
                    <p style={{ fontSize: '0.73rem', color: '#3d5278' }}>
                        &copy; {new Date().getFullYear()} CafeSync Management System. All rights reserved.
                    </p>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#10b981', boxShadow: '0 0 6px #10b981', display: 'inline-block' }} />
                        <span style={{ fontSize: '0.7rem', color: '#3d5278' }}>All systems operational</span>
                    </div>
                </div>
            </div>
        </footer>
    );
};

export default Footer;

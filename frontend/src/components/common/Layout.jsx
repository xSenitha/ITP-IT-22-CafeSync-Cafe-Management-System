// futuristic dark sidebar layout
import { useState } from 'react';
import { NavLink, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { FaRightFromBracket, FaBars, FaXmark, FaMugHot, FaUser } from 'react-icons/fa6';
import { motion, AnimatePresence } from 'framer-motion';

const Layout = ({ children }) => {
    const { user, logout } = useAuth();
    const navigate = useNavigate();
    const location = useLocation();
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

    const handleLogout = () => {
        logout();
        navigate('/login');
    };

    const navLinks = [
        { name: 'Dashboard',         path: '/dashboard', icon: 'fa-gauge',         roles: ['admin', 'staff'] },
        { name: 'Orders',            path: '/orders',    icon: 'fa-cart-shopping',  roles: ['admin', 'staff'] },
        { name: 'Billing & Payments',path: '/payments',  icon: 'fa-credit-card',    roles: ['admin', 'staff'] },
        { name: 'Menu & Inventory',  path: '/menu',      icon: 'fa-book-open',      roles: ['admin', 'staff'] },
        { name: 'Table Reservations',path: '/tables',    icon: 'fa-chair',          roles: ['admin', 'staff'] },
        { name: 'Staff',             path: '/staff',     icon: 'fa-users',          roles: ['admin'] },
        { name: 'My Profile',        path: '/profile',   icon: 'fa-user',           roles: ['admin', 'staff', 'customer'] },
    ];

    const filteredLinks = navLinks.filter(link =>
        !user || !link.roles || link.roles.includes(user.role || 'customer')
    );

    const sidebarBg = {
        background: 'linear-gradient(180deg, #08111f 0%, #070b14 100%)',
        borderRight: '1px solid rgba(0,229,255,0.1)',
        display: 'flex',
        flexDirection: 'column',
    };

    const NavItem = ({ name, path, icon }) => {
        const active = location.pathname === path;
        return (
            <NavLink to={path} onClick={() => setIsMobileMenuOpen(false)}
                style={{
                    display: 'flex', alignItems: 'center', gap: 10,
                    padding: '0.7rem 1rem', borderRadius: 8,
                    fontSize: '0.82rem', fontWeight: 500,
                    marginBottom: 2, position: 'relative',
                    transition: 'all 0.2s',
                    color: active ? '#00e5ff' : 'rgba(107,132,176,0.9)',
                    background: active ? 'rgba(0,229,255,0.08)' : 'transparent',
                    border: active ? '1px solid rgba(0,229,255,0.18)' : '1px solid transparent',
                    borderLeft: active ? '3px solid #00e5ff' : '3px solid transparent',
                    boxShadow: active ? '0 0 14px rgba(0,229,255,0.08)' : 'none',
                }}>
                <i className={`fa-solid ${icon}`} style={{ fontSize: 13, minWidth: 16, color: active ? '#00e5ff' : 'rgba(107,132,176,0.7)' }}></i>
                <span>{name}</span>
                {active && (
                    <span style={{
                        marginLeft: 'auto',
                        width: 5, height: 5, borderRadius: '50%',
                        background: '#00e5ff',
                        boxShadow: '0 0 6px #00e5ff',
                    }} />
                )}
            </NavLink>
        );
    };

    const roleLabel = { admin: 'Administrator', staff: 'Staff Member', customer: 'Customer' };

    return (
        <div style={{ display: 'flex', height: '100vh', background: '#070b14', overflow: 'hidden', fontFamily: "'Inter', sans-serif" }}>

            {/* Mobile overlay */}
            <AnimatePresence>
                {isMobileMenuOpen && (
                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                        style={{ position: 'fixed', inset: 0, background: 'rgba(7,11,20,0.8)', backdropFilter: 'blur(4px)', zIndex: 20 }}
                        onClick={() => setIsMobileMenuOpen(false)} />
                )}
            </AnimatePresence>

            {/* Sidebar */}
            <AnimatePresence>
                <aside style={{
                    ...sidebarBg,
                    width: 256,
                    position: 'fixed',
                    top: 0, bottom: 0, left: isMobileMenuOpen ? 0 : undefined,
                    zIndex: 30,
                    transform: isMobileMenuOpen ? 'translateX(0)' : undefined,
                }}
                    className="lg:static lg:translate-x-0 flex-col"
                    id="main-sidebar"
                >
                    {/* Sidebar Header */}
                    <div style={{ padding: '1.25rem 1.25rem 1rem', borderBottom: '1px solid rgba(0,229,255,0.08)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                            <div style={{
                                width: 36, height: 36, borderRadius: 8,
                                background: 'linear-gradient(135deg, rgba(0,229,255,0.2), rgba(245,158,11,0.15))',
                                border: '1px solid rgba(0,229,255,0.3)',
                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                            }}>
                                <FaMugHot style={{ color: '#00e5ff', fontSize: 16 }} />
                            </div>
                            <div>
                                <span style={{
                                    fontFamily: "'Rajdhani', sans-serif",
                                    fontSize: '1.15rem', fontWeight: 700,
                                    background: 'linear-gradient(90deg, #00e5ff, #f59e0b)',
                                    WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
                                    letterSpacing: '0.04em', display: 'block',
                                }}>CafeSync</span>
                                <span style={{ fontSize: '0.65rem', color: 'rgba(0,229,255,0.6)', letterSpacing: '0.12em', textTransform: 'uppercase' }}>Management</span>
                            </div>
                        </div>
                        <button onClick={() => setIsMobileMenuOpen(false)}
                            style={{ color: '#6b84b0', background: 'none', border: 'none', cursor: 'pointer', padding: 4 }}
                            className="lg:hidden">
                            <FaXmark size={18} />
                        </button>
                    </div>

                    {/* Role Badge */}
                    <div style={{ padding: '0.75rem 1.25rem', borderBottom: '1px solid rgba(0,229,255,0.05)' }}>
                        <div style={{
                            display: 'inline-flex', alignItems: 'center', gap: 6,
                            padding: '0.25rem 0.6rem', borderRadius: 99,
                            background: 'rgba(0,229,255,0.08)', border: '1px solid rgba(0,229,255,0.18)',
                            fontSize: '0.68rem', fontWeight: 600, color: '#00e5ff',
                            letterSpacing: '0.08em', textTransform: 'uppercase',
                        }}>
                            <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#00e5ff', boxShadow: '0 0 6px #00e5ff', display: 'inline-block' }} />
                            {roleLabel[user?.role] || 'User'}
                        </div>
                    </div>

                    {/* Nav Links */}
                    <nav style={{ flex: 1, overflowY: 'auto', padding: '0.75rem' }}>
                        <div style={{ fontSize: '0.62rem', fontWeight: 700, color: '#3d5278', letterSpacing: '0.12em', textTransform: 'uppercase', padding: '0.4rem 0.5rem 0.75rem' }}>
                            Navigation
                        </div>
                        {filteredLinks.map((link) => (
                            <NavItem key={link.name} {...link} />
                        ))}
                    </nav>

                    {/* User Footer */}
                    <div style={{ padding: '0.75rem', borderTop: '1px solid rgba(0,229,255,0.08)' }}>
                        <div style={{
                            display: 'flex', alignItems: 'center', gap: 10,
                            padding: '0.75rem', borderRadius: 10, marginBottom: 8,
                            background: 'rgba(0,229,255,0.04)', border: '1px solid rgba(0,229,255,0.08)',
                        }}>
                            <div style={{
                                width: 34, height: 34, borderRadius: '50%',
                                background: 'linear-gradient(135deg, rgba(0,229,255,0.2), rgba(245,158,11,0.15))',
                                border: '1px solid rgba(0,229,255,0.25)',
                                display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                            }}>
                                <FaUser style={{ color: '#00e5ff', fontSize: 13 }} />
                            </div>
                            <div style={{ minWidth: 0, flex: 1 }}>
                                <p style={{ fontSize: '0.8rem', fontWeight: 600, color: '#c2d3f0', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                    {user ? `${user.firstName} ${user.lastName}` : 'Guest'}
                                </p>
                                <p style={{ fontSize: '0.68rem', color: '#3d5278', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                    {user?.email}
                                </p>
                            </div>
                        </div>
                        <button onClick={handleLogout}
                            style={{
                                width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                                padding: '0.6rem', borderRadius: 8, fontSize: '0.8rem', fontWeight: 600,
                                color: '#ef4444', background: 'rgba(239,68,68,0.06)', border: '1px solid rgba(239,68,68,0.2)',
                                cursor: 'pointer', transition: 'all 0.2s',
                            }}
                            className="hover:bg-[rgba(239,68,68,0.12)] hover:border-[rgba(239,68,68,0.35)]">
                            <FaRightFromBracket style={{ fontSize: 13 }} />
                            Sign Out
                        </button>
                    </div>
                </aside>
            </AnimatePresence>

            {/* Main Content */}
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0, overflow: 'hidden', marginLeft: 256 }} className="lg:ml-0">
                {/* Top Header */}
                <header style={{
                    height: 56,
                    background: 'rgba(7,11,20,0.9)',
                    backdropFilter: 'blur(12px)',
                    borderBottom: '1px solid rgba(0,229,255,0.08)',
                    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                    padding: '0 1.5rem',
                    position: 'sticky', top: 0, zIndex: 10,
                }}>
                    <button onClick={() => setIsMobileMenuOpen(true)}
                        style={{
                            color: '#6b84b0', background: 'rgba(0,229,255,0.06)', border: '1px solid rgba(0,229,255,0.12)',
                            borderRadius: 6, padding: '0.35rem 0.5rem', cursor: 'pointer',
                        }}
                        className="lg:hidden">
                        <FaBars size={18} />
                    </button>

                    <div className="hidden lg:flex items-center gap-2">
                        <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#10b981', boxShadow: '0 0 6px #10b981', display: 'inline-block' }} />
                        <span style={{ fontSize: '0.72rem', color: '#6b84b0', letterSpacing: '0.06em' }}>SYSTEM ONLINE</span>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                        <div style={{ textAlign: 'right' }}>
                            <p style={{ fontSize: '0.78rem', fontWeight: 600, color: '#c2d3f0' }}>{user?.firstName} {user?.lastName}</p>
                            <p style={{ fontSize: '0.65rem', color: '#3d5278', textTransform: 'capitalize' }}>{user?.role}</p>
                        </div>
                        <div style={{
                            width: 32, height: 32, borderRadius: '50%',
                            background: 'linear-gradient(135deg, rgba(0,229,255,0.2), rgba(245,158,11,0.15))',
                            border: '1px solid rgba(0,229,255,0.25)',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                        }}>
                            <FaUser style={{ color: '#00e5ff', fontSize: 12 }} />
                        </div>
                    </div>
                </header>

                {/* Page Content */}
                <main style={{ flex: 1, overflowY: 'auto', padding: '1.5rem', background: '#070b14' }} className="hud-grid">
                    <div style={{ maxWidth: 1280, margin: '0 auto' }}>
                        {children}
                    </div>
                </main>
            </div>
        </div>
    );
};

export default Layout;

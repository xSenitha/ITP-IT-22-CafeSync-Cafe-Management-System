// futuristic dark glassmorphism navbar
import { useState, useRef, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
    FaBars, FaXmark, FaRightFromBracket, FaUser, FaMugHot,
    FaChevronDown, FaGauge, FaCalendarCheck, FaList, FaCreditCard
} from 'react-icons/fa6';
import { useAuth } from '../../context/AuthContext';

const Navbar = () => {
    const [isOpen, setIsOpen] = useState(false);
    const [profileOpen, setProfileOpen] = useState(false);
    const { user, isAuthenticated, logout } = useAuth();
    const navigate = useNavigate();
    const location = useLocation();
    const profileRef = useRef(null);
    const isCustomer = user?.role === 'customer';

    useEffect(() => {
        const handler = (e) => {
            if (profileRef.current && !profileRef.current.contains(e.target)) setProfileOpen(false);
        };
        document.addEventListener('mousedown', handler);
        return () => document.removeEventListener('mousedown', handler);
    }, []);

    const handleLogout = () => {
        logout();
        navigate('/login');
        setIsOpen(false);
        setProfileOpen(false);
    };

    const getNavLinks = () => {
        const links = [{ path: '/', label: 'Home', icon: 'fa-house' }];
        links.push({ path: '/browse-menu', label: 'Menu', icon: 'fa-book-open' });
        if (isAuthenticated) {
            links.push({ path: isCustomer ? '/reservations' : '/tables', label: 'Reservations', icon: 'fa-calendar-check' });
            if (!isCustomer) links.push({ path: '/dashboard', label: 'Dashboard', icon: 'fa-gauge' });
        }
        return links;
    };

    const navLinks = getNavLinks();
    const isActive = (path) => location.pathname === path;

    return (
        <nav style={{
            background: 'rgba(7,11,20,0.85)',
            backdropFilter: 'blur(20px)',
            WebkitBackdropFilter: 'blur(20px)',
            borderBottom: '1px solid rgba(0,229,255,0.1)',
            position: 'sticky',
            top: 0,
            zIndex: 100,
        }}>
            {/* top scan line */}
            <div style={{ height: '1px', background: 'linear-gradient(90deg, transparent, rgba(0,229,255,0.5), rgba(245,158,11,0.4), transparent)' }} />

            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="flex items-center justify-between h-16">

                    {/* Logo */}
                    <Link to="/" className="flex items-center gap-2.5 shrink-0 group">
                        <div style={{
                            width: 36, height: 36, borderRadius: 8,
                            background: 'linear-gradient(135deg, rgba(0,229,255,0.2), rgba(245,158,11,0.15))',
                            border: '1px solid rgba(0,229,255,0.3)',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            transition: 'box-shadow 0.3s',
                        }}
                            className="group-hover:glow-cyan"
                        >
                            <FaMugHot style={{ color: '#00e5ff', fontSize: 16 }} />
                        </div>
                        <div>
                            <span style={{
                                fontFamily: "'Rajdhani', sans-serif",
                                fontSize: '1.2rem',
                                fontWeight: 700,
                                background: 'linear-gradient(90deg, #00e5ff, #f59e0b)',
                                WebkitBackgroundClip: 'text',
                                WebkitTextFillColor: 'transparent',
                                letterSpacing: '0.04em',
                            }}>CafeSync</span>
                        </div>
                    </Link>

                    {/* Desktop Nav */}
                    <div className="hidden md:flex items-center gap-1">
                        {navLinks.map((link) => (
                            <Link key={link.path} to={link.path}
                                style={{
                                    position: 'relative',
                                    padding: '0.4rem 0.9rem',
                                    borderRadius: 8,
                                    fontSize: '0.825rem',
                                    fontWeight: 500,
                                    letterSpacing: '0.02em',
                                    transition: 'all 0.2s',
                                    color: isActive(link.path) ? '#00e5ff' : 'rgba(194,211,240,0.7)',
                                    background: isActive(link.path) ? 'rgba(0,229,255,0.08)' : 'transparent',
                                    border: isActive(link.path) ? '1px solid rgba(0,229,255,0.2)' : '1px solid transparent',
                                }}
                                className={!isActive(link.path) ? 'hover:text-[#e2eaf7] hover:bg-white/5' : ''}
                            >
                                <i className={`fa-solid ${link.icon} mr-1.5`} style={{ fontSize: '0.75rem' }}></i>
                                {link.label}
                                {isActive(link.path) && (
                                    <span style={{
                                        position: 'absolute',
                                        bottom: -1, left: '50%',
                                        transform: 'translateX(-50%)',
                                        width: '60%', height: 1,
                                        background: 'linear-gradient(90deg, transparent, #00e5ff, transparent)',
                                        borderRadius: 99,
                                    }} />
                                )}
                            </Link>
                        ))}
                    </div>

                    {/* Desktop Auth */}
                    <div className="hidden md:flex items-center gap-2 shrink-0">
                        {isAuthenticated ? (
                            <div className="relative" ref={profileRef}>
                                <button onClick={() => setProfileOpen(!profileOpen)}
                                    style={{
                                        display: 'flex', alignItems: 'center', gap: 8,
                                        padding: '0.4rem 0.75rem',
                                        borderRadius: 8,
                                        background: 'rgba(0,229,255,0.06)',
                                        border: '1px solid rgba(0,229,255,0.15)',
                                        cursor: 'pointer',
                                        transition: 'all 0.2s',
                                    }}
                                >
                                    <div style={{
                                        width: 28, height: 28, borderRadius: '50%',
                                        background: 'linear-gradient(135deg, rgba(0,229,255,0.2), rgba(245,158,11,0.15))',
                                        border: '1px solid rgba(0,229,255,0.3)',
                                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                                    }}>
                                        <FaUser style={{ color: '#00e5ff', fontSize: 11 }} />
                                    </div>
                                    <span style={{ color: '#c2d3f0', fontSize: '0.8rem', fontWeight: 500 }}>{user?.firstName}</span>
                                    <FaChevronDown style={{ color: 'rgba(107,132,176,0.7)', fontSize: 10, transition: 'transform 0.2s', transform: profileOpen ? 'rotate(180deg)' : 'rotate(0deg)' }} />
                                </button>

                                <AnimatePresence>
                                    {profileOpen && (
                                        <motion.div initial={{ opacity: 0, y: 6, scale: 0.95 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: 6, scale: 0.95 }} transition={{ duration: 0.15 }}
                                            style={{
                                                position: 'absolute', right: 0, top: 'calc(100% + 8px)',
                                                width: 200,
                                                background: '#0d1526',
                                                border: '1px solid rgba(0,229,255,0.18)',
                                                borderRadius: 12,
                                                boxShadow: '0 0 40px rgba(0,229,255,0.1)',
                                                overflow: 'hidden',
                                                zIndex: 99,
                                            }}>
                                            <div style={{ padding: '0.75rem 1rem', borderBottom: '1px solid rgba(0,229,255,0.08)',background: 'rgba(0,229,255,0.04)' }}>
                                                <p style={{ color: '#e2eaf7', fontSize: '0.85rem', fontWeight: 600 }}>{user?.firstName} {user?.lastName}</p>
                                                <p style={{ color: '#3d5278', fontSize: '0.7rem', marginTop: 2,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap' }}>{user?.email}</p>
                                            </div>
                                            <div style={{ padding: '0.4rem 0' }}>
                                                <Link to="/profile" onClick={() => setProfileOpen(false)}
                                                    style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '0.55rem 1rem', color: 'rgba(194,211,240,0.75)', fontSize: '0.8rem', transition: 'all 0.15s' }}
                                                    className="hover:text-[#00e5ff] hover:bg-[rgba(0,229,255,0.05)]">
                                                    <i className="fa-solid fa-user" style={{ fontSize: 12 }}></i> My Profile
                                                </Link>
                                                {isCustomer && (
                                                    <Link to="/profile?tab=reservations" onClick={() => setProfileOpen(false)}
                                                        style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '0.55rem 1rem', color: 'rgba(245,158,11,0.85)', fontSize: '0.8rem', transition: 'all 0.15s' }}
                                                        className="hover:text-[#f59e0b] hover:bg-[rgba(245,158,11,0.05)]">
                                                        <i className="fa-solid fa-calendar-check" style={{ fontSize: 12 }}></i> My Bookings
                                                    </Link>
                                                )}
                                                {isCustomer && (
                                                    <Link to="/profile?tab=orders" onClick={() => setProfileOpen(false)}
                                                        style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '0.55rem 1rem', color: 'rgba(0,229,255,0.75)', fontSize: '0.8rem', transition: 'all 0.15s' }}
                                                        className="hover:text-[#00e5ff] hover:bg-[rgba(0,229,255,0.05)]">
                                                        <i className="fa-solid fa-cart-shopping" style={{ fontSize: 12 }}></i> My Orders
                                                    </Link>
                                                )}
                                                {isCustomer && (
                                                    <Link to="/profile?tab=payments" onClick={() => setProfileOpen(false)}
                                                        style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '0.55rem 1rem', color: 'rgba(16,185,129,0.85)', fontSize: '0.8rem', transition: 'all 0.15s' }}
                                                        className="hover:text-[#10b981] hover:bg-[rgba(16,185,129,0.05)]">
                                                        <i className="fa-solid fa-credit-card" style={{ fontSize: 12 }}></i> Payment History
                                                    </Link>
                                                )}
                                                {!isCustomer && (
                                                    <Link to="/dashboard" onClick={() => setProfileOpen(false)}
                                                        style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '0.55rem 1rem', color: 'rgba(194,211,240,0.75)', fontSize: '0.8rem', transition: 'all 0.15s' }}
                                                        className="hover:text-[#00e5ff] hover:bg-[rgba(0,229,255,0.05)]">
                                                        <i className="fa-solid fa-gauge" style={{ fontSize: 12 }}></i> Dashboard
                                                    </Link>
                                                )}
                                                <button onClick={handleLogout}
                                                    style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 8, padding: '0.55rem 1rem', color: 'rgba(239,68,68,0.8)', fontSize: '0.8rem', background: 'none', border: 'none', cursor: 'pointer', transition: 'all 0.15s' }}
                                                    className="hover:text-[#ef4444] hover:bg-[rgba(239,68,68,0.06)]">
                                                    <FaRightFromBracket style={{ fontSize: 12 }} /> Logout
                                                </button>
                                            </div>
                                        </motion.div>
                                    )}
                                </AnimatePresence>
                            </div>
                        ) : (
                            <div className="flex items-center gap-2">
                                <Link to="/login"
                                    style={{ padding: '0.4rem 0.9rem', fontSize: '0.825rem', fontWeight: 500, color: 'rgba(0,229,255,0.85)', borderRadius: 8, transition: 'all 0.2s', border: '1px solid transparent' }}
                                    className="hover:border-[rgba(0,229,255,0.2)] hover:bg-[rgba(0,229,255,0.06)]">
                                    Sign In
                                </Link>
                                <Link to="/register" className="btn-solid-cyan" style={{ padding: '0.4rem 1rem', fontSize: '0.825rem' }}>
                                    <i className="fa-solid fa-user-plus" style={{ fontSize: 12 }}></i> Register
                                </Link>
                            </div>
                        )}
                    </div>

                    {/* Mobile Toggle */}
                    <button onClick={() => setIsOpen(!isOpen)}
                        style={{ color: 'rgba(194,211,240,0.8)', padding: '0.4rem', borderRadius: 6, background: 'rgba(0,229,255,0.06)', border: '1px solid rgba(0,229,255,0.1)', cursor: 'pointer' }}
                        className="md:hidden">
                        {isOpen ? <FaXmark size={18} /> : <FaBars size={18} />}
                    </button>
                </div>
            </div>

            {/* Mobile Menu */}
            <AnimatePresence>
                {isOpen && (
                    <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} transition={{ duration: 0.2 }}
                        style={{ borderTop: '1px solid rgba(0,229,255,0.08)', background: 'rgba(7,11,20,0.95)', overflow: 'hidden' }}>
                        <div style={{ padding: '0.75rem 1rem', display: 'flex', flexDirection: 'column', gap: 4 }}>
                            {navLinks.map((link) => (
                                <Link key={link.path} to={link.path} onClick={() => setIsOpen(false)}
                                    style={{
                                        display: 'flex', alignItems: 'center', gap: 8,
                                        padding: '0.65rem 0.875rem', borderRadius: 8, fontSize: '0.85rem', fontWeight: 500,
                                        color: isActive(link.path) ? '#00e5ff' : 'rgba(194,211,240,0.7)',
                                        background: isActive(link.path) ? 'rgba(0,229,255,0.08)' : 'transparent',
                                        border: isActive(link.path) ? '1px solid rgba(0,229,255,0.2)' : '1px solid transparent',
                                        transition: 'all 0.15s',
                                    }}>
                                    <i className={`fa-solid ${link.icon}`} style={{ fontSize: 13 }}></i>
                                    {link.label}
                                </Link>
                            ))}
                            <div style={{ marginTop: 8, paddingTop: 8, borderTop: '1px solid rgba(0,229,255,0.08)' }}>
                                {isAuthenticated ? (
                                    <>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '0.5rem 0.875rem', color: '#6b84b0', fontSize: '0.8rem' }}>
                                            <FaUser size={12} /> {user?.firstName} {user?.lastName}
                                        </div>
                                        <Link to="/profile" onClick={() => setIsOpen(false)}
                                            style={{ display: 'block', padding: '0.55rem 0.875rem', color: 'rgba(0,229,255,0.8)', fontSize: '0.85rem', fontWeight: 500 }}>
                                            My Profile
                                        </Link>
                                        {isCustomer && (
                                            <Link to="/profile?tab=payments" onClick={() => setIsOpen(false)}
                                                style={{ display: 'block', padding: '0.55rem 0.875rem', color: 'rgba(16,185,129,0.85)', fontSize: '0.85rem', fontWeight: 500 }}>
                                                Payment History
                                            </Link>
                                        )}
                                        <button onClick={handleLogout}
                                            style={{ width: '100%', textAlign: 'left', display: 'flex', alignItems: 'center', gap: 8, padding: '0.55rem 0.875rem', color: '#ef4444', fontSize: '0.85rem', background: 'none', border: 'none', cursor: 'pointer', fontWeight: 500 }}>
                                            <FaRightFromBracket size={13} /> Logout
                                        </button>
                                    </>
                                ) : (
                                    <>
                                        <Link to="/login" onClick={() => setIsOpen(false)}
                                            style={{ display: 'block', padding: '0.55rem 0.875rem', color: 'rgba(0,229,255,0.8)', fontSize: '0.85rem', fontWeight: 500 }}>
                                            Sign In
                                        </Link>
                                        <Link to="/register" onClick={() => setIsOpen(false)}
                                            style={{ display: 'block', margin: '4px 0', padding: '0.6rem 0.875rem', background: 'linear-gradient(135deg, #00c4d6, #00e5ff)', color: '#070b14', borderRadius: 8, fontSize: '0.85rem', fontWeight: 700, textAlign: 'center' }}>
                                            Register
                                        </Link>
                                    </>
                                )}
                            </div>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </nav>
    );
};

export default Navbar;

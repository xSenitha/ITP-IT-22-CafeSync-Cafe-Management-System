// futuristic cinematic hero section
import { motion } from 'framer-motion';
import { FaArrowRight, FaMugHot, FaCartShopping, FaCalendarCheck, FaCreditCard } from 'react-icons/fa6';
import { Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import heroImg from '../../assets/cafe_hero.png';

const HeroSection = () => {
    const { user, isAuthenticated } = useAuth();
    const isStaffUser = user?.role === 'admin' || user?.role === 'staff';
    const primaryLink = isStaffUser ? '/dashboard' : (isAuthenticated ? '/profile' : '/register');
    const primaryLabel = isStaffUser ? 'Open Dashboard' : (isAuthenticated ? 'Open Profile' : 'Get Started');
    const containerVariants = {
        hidden: { opacity: 0 },
        visible: { opacity: 1, transition: { staggerChildren: 0.13, delayChildren: 0.2 } }
    };
    const itemVariants = {
        hidden: { opacity: 0, y: 24 },
        visible: { opacity: 1, y: 0, transition: { duration: 0.7, ease: [0.22, 1, 0.36, 1] } }
    };

    const stats = [
        { label: 'Order Tracking', value: 'Live', icon: FaCartShopping, color: '#00e5ff' },
        { label: 'Menu Control', value: 'Full', icon: FaMugHot, color: '#f59e0b' },
        { label: 'Reservations', value: 'Smart', icon: FaCalendarCheck, color: '#a855f7' },
        { label: 'Payments', value: 'Secure', icon: FaCreditCard, color: '#10b981' },
    ];

    return (
        <section style={{ position: 'relative', minHeight: '92vh', overflow: 'hidden', display: 'flex', alignItems: 'center' }}>
            {/* BG Image with dark overlay */}
            <div style={{ position: 'absolute', inset: 0 }}>
                <img src={heroImg} alt="Cafe Interior" style={{ width: '100%', height: '100%', objectFit: 'cover', filter: 'brightness(0.3) saturate(0.6)' }} />
                <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(135deg, rgba(7,11,20,0.95) 0%, rgba(7,11,20,0.75) 50%, rgba(7,11,20,0.92) 100%)' }} />
            </div>

            {/* HUD grid overlay */}
            <div className="hud-grid" style={{ position: 'absolute', inset: 0, opacity: 0.5 }} />

            {/* Radial glow */}
            <div style={{ position: 'absolute', top: '30%', left: '50%', transform: 'translate(-50%,-50%)', width: 600, height: 600, background: 'radial-gradient(circle, rgba(0,229,255,0.07) 0%, transparent 70%)', borderRadius: '50%', pointerEvents: 'none' }} />
            <div style={{ position: 'absolute', top: '60%', left: '20%', width: 300, height: 300, background: 'radial-gradient(circle, rgba(245,158,11,0.06) 0%, transparent 70%)', borderRadius: '50%', pointerEvents: 'none' }} />

            {/* Floating particles */}
            <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none' }}>
                {[...Array(12)].map((_, i) => (
                    <motion.div key={i}
                        style={{
                            position: 'absolute',
                            width: i % 3 === 0 ? 3 : 1.5,
                            height: i % 3 === 0 ? 3 : 1.5,
                            borderRadius: '50%',
                            background: i % 2 === 0 ? 'rgba(0,229,255,0.5)' : 'rgba(245,158,11,0.4)',
                            left: `${Math.random() * 100}%`,
                            top: `${Math.random() * 100}%`,
                        }}
                        animate={{ y: [-20, 20, -20], opacity: [0.2, 0.6, 0.2] }}
                        transition={{ duration: 3 + Math.random() * 4, repeat: Infinity, delay: Math.random() * 3, ease: 'easeInOut' }}
                    />
                ))}
            </div>

            {/* Content */}
            <div style={{ width: '100%', maxWidth: 1200, margin: '0 auto', padding: '0 1.25rem', position: 'relative', zIndex: 10, paddingTop: '4rem', paddingBottom: '4rem' }}>
                <motion.div variants={containerVariants} initial="hidden" animate="visible" style={{ textAlign: 'center', maxWidth: 760, margin: '0 auto' }}>

                    {/* System badge */}
                    <motion.div variants={itemVariants}
                        style={{
                            display: 'inline-flex', alignItems: 'center', gap: 8,
                            padding: '0.35rem 1rem', borderRadius: 99,
                            background: 'rgba(0,229,255,0.06)',
                            border: '1px solid rgba(0,229,255,0.2)',
                            marginBottom: '1.5rem',
                        }}>
                        <span style={{ width: 7, height: 7, borderRadius: '50%', background: '#10b981', boxShadow: '0 0 8px #10b981', display: 'inline-block' }} />
                        <span style={{ color: '#00e5ff', fontSize: '0.72rem', fontWeight: 600, letterSpacing: '0.12em', textTransform: 'uppercase' }}>
                            Cafe Management System — Online
                        </span>
                    </motion.div>

                    {/* Heading */}
                    <motion.h1 variants={itemVariants}
                        style={{
                            fontFamily: "'Rajdhani', sans-serif",
                            fontSize: 'clamp(2.4rem, 6vw, 4rem)',
                            fontWeight: 700,
                            lineHeight: 1.1,
                            color: '#e2eaf7',
                            marginBottom: '1rem',
                            letterSpacing: '-0.01em',
                        }}>
                        Next-Gen Cafe<br />
                        <span style={{
                            background: 'linear-gradient(90deg, #00e5ff, #f59e0b)',
                            WebkitBackgroundClip: 'text',
                            WebkitTextFillColor: 'transparent',
                        }}>Operations Platform</span>
                    </motion.h1>

                    {/* Subtext */}
                    <motion.p variants={itemVariants}
                        style={{ color: '#6b84b0', fontSize: '1rem', maxWidth: 520, margin: '0 auto 2rem', lineHeight: 1.7 }}>
                        Streamline orders, track inventory, manage reservations, and process payments — all in one powerful, real-time system.
                    </motion.p>

                    {/* CTA Buttons */}
                    <motion.div variants={itemVariants}
                        style={{ display: 'flex', flexWrap: 'wrap', gap: 12, justifyContent: 'center', marginBottom: '3rem' }}>
                        <Link to={primaryLink}
                            style={{
                                display: 'inline-flex', alignItems: 'center', gap: 8,
                                padding: '0.75rem 1.75rem',
                                background: 'linear-gradient(135deg, #00c4d6, #00e5ff)',
                                color: '#070b14', borderRadius: 8,
                                fontWeight: 700, fontSize: '0.9rem',
                                boxShadow: '0 0 30px rgba(0,229,255,0.3)',
                                transition: 'all 0.25s',
                            }}
                            className="hover:-translate-y-0.5 hover:shadow-[0_0_40px_rgba(0,229,255,0.5)]">
                            <i className="fa-solid fa-gauge"></i>
                            {primaryLabel} <FaArrowRight style={{ fontSize: 13 }} />
                        </Link>
                        <Link to="/browse-menu"
                            style={{
                                display: 'inline-flex', alignItems: 'center', gap: 8,
                                padding: '0.75rem 1.75rem',
                                background: 'rgba(245,158,11,0.1)',
                                border: '1px solid rgba(245,158,11,0.35)',
                                color: '#f59e0b', borderRadius: 8,
                                fontWeight: 600, fontSize: '0.9rem',
                                transition: 'all 0.25s',
                            }}
                            className="hover:bg-[rgba(245,158,11,0.18)] hover:border-[rgba(245,158,11,0.6)]">
                            <FaMugHot style={{ fontSize: 14 }} /> View Menu
                        </Link>
                    </motion.div>

                    {/* Stats grid */}
                    <motion.div variants={itemVariants}
                        style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12, maxWidth: 680, margin: '0 auto' }}>
                        {stats.map(({ label, value, icon: Icon, color }, i) => (
                            <motion.div key={i}
                                whileHover={{ scale: 1.04, y: -3 }}
                                style={{
                                    background: 'rgba(13,21,38,0.75)',
                                    backdropFilter: 'blur(12px)',
                                    border: `1px solid ${color}25`,
                                    borderRadius: 10,
                                    padding: '1rem 0.5rem',
                                    textAlign: 'center',
                                    cursor: 'default',
                                    transition: 'all 0.2s',
                                }}>
                                <div style={{
                                    width: 36, height: 36, borderRadius: 8, margin: '0 auto 0.5rem',
                                    background: `${color}18`,
                                    border: `1px solid ${color}30`,
                                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                                }}>
                                    <Icon style={{ color, fontSize: 14 }} />
                                </div>
                                <p style={{ fontFamily: "'Rajdhani', sans-serif", fontSize: '1.1rem', fontWeight: 700, color: '#e2eaf7' }}>{value}</p>
                                <p style={{ fontSize: '0.65rem', color: '#3d5278', marginTop: 2 }}>{label}</p>
                            </motion.div>
                        ))}
                    </motion.div>
                </motion.div>
            </div>

            {/* Bottom fade */}
            <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: 120, background: 'linear-gradient(to top, #070b14, transparent)', pointerEvents: 'none' }} />
        </section>
    );
};

export default HeroSection;

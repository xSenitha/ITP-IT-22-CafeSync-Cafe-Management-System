// futuristic home page
import { motion } from 'framer-motion';
import { FaCartShopping, FaCreditCard, FaBookOpen, FaCalendarCheck, FaArrowRight, FaCheck, FaChartLine, FaUsers, FaGlobe, FaMugHot } from 'react-icons/fa6';
import { Link } from 'react-router-dom';
import Navbar from '../components/common/Navbar';
import HeroSection from '../components/common/HeroSection';
import Footer from '../components/common/Footer';
import { useAuth } from '../context/AuthContext';

const Home = () => {
    const { user, isAuthenticated } = useAuth();
    const isCustomer = user?.role === 'customer';
    const isStaffUser = user?.role === 'admin' || user?.role === 'staff';
    const features = [
        { icon: FaCartShopping, title: 'Order Management', desc: 'Track and manage all customer orders seamlessly from counter or online platforms.', link: isStaffUser ? '/orders' : (isCustomer ? '/profile?tab=orders' : '/login'), color: '#00e5ff', faIcon: 'fa-cart-shopping' },
        { icon: FaCreditCard, title: 'Billing & Payments', desc: 'Automated billing, secure multiple payment methods, and instant invoice generation.', link: isStaffUser ? '/payments' : (isCustomer ? '/profile?tab=orders' : '/login'), color: '#10b981', faIcon: 'fa-credit-card' },
        { icon: FaBookOpen, title: 'Menu & Inventory', desc: 'Full menu management with real-time inventory tracking, recipe costs, and low-stock alerts.', link: isStaffUser ? '/menu' : '/browse-menu', color: '#f59e0b', faIcon: 'fa-book-open' },
        {
            icon: FaCalendarCheck,
            title: 'Table & Reservations',
            desc: 'Manage interactive table layouts, live availability, and online customer reservations.',
            link: isStaffUser ? '/tables' : (isCustomer ? '/reservations' : '/login'),
            color: '#a855f7',
            faIcon: 'fa-calendar-check'
        },
    ];

    const benefits = ['Real-time Order Tracking', 'Integrated Billing', 'Inventory Management', 'Table Reservations'];

    return (
        <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', background: '#070b14', fontFamily: "'Inter', sans-serif" }}>
            <Navbar />
            <HeroSection />

            {/* Features Section */}
            <section style={{ padding: '5rem 1.25rem', background: '#070b14', position: 'relative' }}>
                <div className="hud-grid" style={{ position: 'absolute', inset: 0, opacity: 0.4 }} />
                <div style={{ maxWidth: 1200, margin: '0 auto', position: 'relative', zIndex: 1 }}>
                    <motion.div initial={{ opacity: 0, y: 16 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.5 }} style={{ textAlign: 'center', marginBottom: '3rem' }}>
                        <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, padding: '0.3rem 0.875rem', borderRadius: 99, background: 'rgba(0,229,255,0.06)', border: '1px solid rgba(0,229,255,0.18)', marginBottom: '1rem' }}>
                            <span style={{ fontSize: '0.68rem', fontWeight: 700, color: '#00e5ff', letterSpacing: '0.12em', textTransform: 'uppercase' }}>Core Modules</span>
                        </div>
                        <h2 style={{ fontFamily: "'Rajdhani', sans-serif", fontSize: 'clamp(1.6rem, 4vw, 2.2rem)', fontWeight: 700, color: '#e2eaf7', marginBottom: '0.75rem' }}>
                            Enterprise-Grade Components
                        </h2>
                        <p style={{ color: '#6b84b0', fontSize: '0.9rem', maxWidth: 500, margin: '0 auto' }}>
                            Our system covers every aspect of modern cafe management, designed to scale with your business.
                        </p>
                    </motion.div>

                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '1.25rem' }}>
                        {features.map((f, i) => (
                            <motion.div key={i} initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.4, delay: i * 0.08 }}
                                whileHover={{ y: -4 }}
                                style={{
                                    background: 'rgba(13,21,38,0.7)', backdropFilter: 'blur(12px)',
                                    border: `1px solid ${f.color}20`, borderRadius: '1rem',
                                    padding: '1.5rem', display: 'flex', flexDirection: 'column',
                                    transition: 'all 0.25s', cursor: 'default',
                                }}
                                className="hover:border-[rgba(0,229,255,0.25)]">
                                <div style={{
                                    width: 44, height: 44, borderRadius: 10,
                                    background: `${f.color}18`, border: `1px solid ${f.color}30`,
                                    display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '1rem',
                                }}>
                                    <i className={`fa-solid ${f.faIcon}`} style={{ color: f.color, fontSize: 17 }}></i>
                                </div>
                                <h3 style={{ fontSize: '0.95rem', fontWeight: 700, color: '#e2eaf7', marginBottom: '0.5rem' }}>{f.title}</h3>
                                <p style={{ fontSize: '0.8rem', color: '#6b84b0', lineHeight: 1.7, flex: 1, marginBottom: '1rem' }}>{f.desc}</p>
                                <Link to={f.link}
                                    style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: '0.78rem', fontWeight: 600, color: f.color, transition: 'gap 0.2s' }}
                                    className="hover:gap-[10px]">
                                    Explore <FaArrowRight style={{ fontSize: 11 }} />
                                </Link>
                            </motion.div>
                        ))}
                    </div>
                </div>
            </section>

            {/* About Section */}
            <section style={{ padding: '5rem 1.25rem', background: 'rgba(8,13,24,0.95)', borderTop: '1px solid rgba(0,229,255,0.06)', borderBottom: '1px solid rgba(0,229,255,0.06)', position: 'relative', overflow: 'hidden' }}>
                <div style={{ position: 'absolute', right: -100, top: '50%', transform: 'translateY(-50%)', width: 500, height: 500, background: 'radial-gradient(circle, rgba(245,158,11,0.05) 0%, transparent 65%)', borderRadius: '50%', pointerEvents: 'none' }} />
                <div style={{ maxWidth: 1200, margin: '0 auto', position: 'relative', zIndex: 1 }}>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '3rem', alignItems: 'center' }}>
                        {/* Left */}
                        <motion.div initial={{ opacity: 0, x: -20 }} whileInView={{ opacity: 1, x: 0 }} viewport={{ once: true }} transition={{ duration: 0.5 }}>
                            <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, padding: '0.3rem 0.875rem', borderRadius: 99, background: 'rgba(245,158,11,0.08)', border: '1px solid rgba(245,158,11,0.2)', marginBottom: '1rem' }}>
                                <span style={{ fontSize: '0.68rem', fontWeight: 700, color: '#f59e0b', letterSpacing: '0.12em', textTransform: 'uppercase' }}>The Smart Choice</span>
                            </div>
                            <h2 style={{ fontFamily: "'Rajdhani', sans-serif", fontSize: 'clamp(1.5rem, 4vw, 2rem)', fontWeight: 700, color: '#e2eaf7', marginBottom: '1rem', lineHeight: 1.25 }}>
                                Transform your cafe with{' '}
                                <span style={{ background: 'linear-gradient(90deg, #00e5ff, #f59e0b)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>CafeSync</span>
                            </h2>
                            <p style={{ color: '#6b84b0', fontSize: '0.88rem', lineHeight: 1.8, marginBottom: '0.875rem' }}>
                                Traditional restaurant management relies on fragmented, manual processes causing order mistakes, slow service, and inaccurate inventory tracking.
                            </p>
                            <p style={{ color: '#6b84b0', fontSize: '0.88rem', lineHeight: 1.8, marginBottom: '2rem' }}>
                                <strong style={{ color: '#c2d3f0' }}>CafeSync</strong> provides a unified platform bridging front-of-house operations with back-office analytics.
                            </p>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                                {benefits.map((item, i) => (
                                    <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                        <div style={{ width: 22, height: 22, borderRadius: '50%', background: 'rgba(16,185,129,0.15)', border: '1px solid rgba(16,185,129,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                                            <FaCheck style={{ color: '#10b981', fontSize: 9 }} />
                                        </div>
                                        <span style={{ fontSize: '0.82rem', color: '#c2d3f0', fontWeight: 500 }}>{item}</span>
                                    </div>
                                ))}
                            </div>
                        </motion.div>

                        {/* Right — Stats */}
                        <motion.div initial={{ opacity: 0, x: 20 }} whileInView={{ opacity: 1, x: 0 }} viewport={{ once: true }} transition={{ duration: 0.5 }}>
                            <div style={{ background: 'rgba(13,21,38,0.8)', border: '1px solid rgba(0,229,255,0.15)', borderRadius: '1.25rem', padding: '2rem', boxShadow: '0 0 40px rgba(0,229,255,0.07)', position: 'relative', overflow: 'hidden' }}>
                                <div style={{ position: 'absolute', top: 0, right: 0, padding: '1.5rem', opacity: 0.05 }}>
                                    <FaChartLine style={{ fontSize: 100, color: '#00e5ff' }} />
                                </div>
                                <div style={{ marginBottom: '0.75rem', display: 'flex', alignItems: 'center', gap: 8 }}>
                                    <span className="dot-live" />
                                    <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#00e5ff', letterSpacing: '0.1em', textTransform: 'uppercase' }}>Performance Metrics</span>
                                </div>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem', marginTop: '1.25rem' }}>
                                    {[
                                        { label: 'Order Processing', value: 'Instant', icon: 'fa-bolt', color: '#00e5ff' },
                                        { label: 'Menu & Stock', value: 'Live', icon: 'fa-chart-line', color: '#f59e0b' },
                                        { label: 'Table Management', value: 'Smart', icon: 'fa-chair', color: '#a855f7' },
                                    ].map(({ label, value, icon, color }) => (
                                        <div key={label} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingBottom: '1.25rem', borderBottom: '1px solid rgba(0,229,255,0.06)' }}>
                                            <div>
                                                <p style={{ fontSize: '0.72rem', color: '#3d5278', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 4 }}>{label}</p>
                                                <p style={{ fontFamily: "'Rajdhani', sans-serif", fontSize: '1.7rem', fontWeight: 700, color: '#e2eaf7' }}>{value}</p>
                                            </div>
                                            <div style={{ width: 40, height: 40, borderRadius: 10, background: `${color}15`, border: `1px solid ${color}25`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                                <i className={`fa-solid ${icon}`} style={{ color, fontSize: 16 }}></i>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            {/* Mini stat cards */}
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.875rem', marginTop: '0.875rem' }}>
                                {[
                                    { icon: FaGlobe, label: 'Core Modules', value: '4', color: '#00e5ff' },
                                    { icon: FaUsers, label: 'Availability', value: '24/7', color: '#10b981' },
                                ].map(({ icon: Icon, label, value, color }) => (
                                    <div key={label} style={{ background: 'rgba(13,21,38,0.7)', border: `1px solid ${color}15`, borderRadius: '0.875rem', padding: '1rem', display: 'flex', alignItems: 'center', gap: 12 }}>
                                        <div style={{ width: 38, height: 38, borderRadius: 9, background: `${color}12`, border: `1px solid ${color}25`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                                            <Icon style={{ color, fontSize: 15 }} />
                                        </div>
                                        <div>
                                            <p style={{ fontFamily: "'Rajdhani', sans-serif", fontSize: '1.4rem', fontWeight: 700, color: '#e2eaf7' }}>{value}</p>
                                            <p style={{ fontSize: '0.7rem', color: '#3d5278' }}>{label}</p>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </motion.div>
                    </div>
                </div>
            </section>

            {/* CTA Section */}
            <section style={{ padding: '4.5rem 1.25rem', background: '#070b14', textAlign: 'center', position: 'relative', overflow: 'hidden' }}>
                <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%,-50%)', width: 700, height: 400, background: 'radial-gradient(ellipse, rgba(0,229,255,0.06) 0%, transparent 65%)', borderRadius: '50%', pointerEvents: 'none' }} />
                <div style={{ position: 'relative', zIndex: 1, maxWidth: 600, margin: '0 auto' }}>
                    <motion.div initial={{ opacity: 0, y: 16 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.5 }}>
                        <FaMugHot style={{ fontSize: 40, color: '#00e5ff', marginBottom: '1.25rem', filter: 'drop-shadow(0 0 12px rgba(0,229,255,0.5))' }} />
                        <h2 style={{ fontFamily: "'Rajdhani', sans-serif", fontSize: 'clamp(1.5rem, 4vw, 2rem)', fontWeight: 700, color: '#e2eaf7', marginBottom: '0.875rem' }}>
                            Ready to Modernize Your Cafe?
                        </h2>
                        <p style={{ color: '#6b84b0', fontSize: '0.9rem', marginBottom: '2rem', lineHeight: 1.7 }}>
                            Join CafeSync and transform every aspect of your cafe operations with a single powerful platform.
                        </p>
                        <div style={{ display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap' }}>
                            <Link to="/register"
                                style={{ display: 'inline-flex', alignItems: 'center', gap: 8, padding: '0.75rem 2rem', background: 'linear-gradient(135deg, #00c4d6, #00e5ff)', color: '#070b14', borderRadius: 8, fontWeight: 700, fontSize: '0.9rem', boxShadow: '0 0 30px rgba(0,229,255,0.3)', transition: 'all 0.25s' }}
                                className="hover:-translate-y-0.5">
                                <i className="fa-solid fa-user-plus"></i> Get Started Free
                            </Link>
                            <Link to="/browse-menu"
                                style={{ display: 'inline-flex', alignItems: 'center', gap: 8, padding: '0.75rem 1.75rem', background: 'transparent', border: '1px solid rgba(0,229,255,0.25)', color: 'rgba(0,229,255,0.8)', borderRadius: 8, fontWeight: 600, fontSize: '0.9rem', transition: 'all 0.25s' }}
                                className="hover:bg-[rgba(0,229,255,0.06)]">
                                <i className="fa-solid fa-book-open"></i> Browse Menu
                            </Link>
                        </div>
                    </motion.div>
                </div>
            </section>

            <Footer />
        </div>
    );
};

export default Home;

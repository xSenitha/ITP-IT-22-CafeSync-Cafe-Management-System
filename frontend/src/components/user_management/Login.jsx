// futuristic dark login page
import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { FaEnvelope, FaLock, FaEye, FaEyeSlash, FaMugHot, FaRightToBracket } from 'react-icons/fa6';
import { useAuth } from '../../context/AuthContext';

const Login = () => {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const { login } = useAuth();
    const navigate = useNavigate();

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        setLoading(true);
        try {
            const result = await login(email, password);
            navigate(result.user?.role === 'customer' ? '/' : '/dashboard');
        } catch (err) {
            setError(err.response?.data?.message || 'Login failed. Please check your credentials.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div style={{
            minHeight: '100vh',
            background: '#070b14',
            display: 'flex',
            fontFamily: "'Inter', sans-serif",
            position: 'relative',
            overflow: 'hidden',
        }}>
            {/* HUD grid */}
            <div className="hud-grid" style={{ position: 'absolute', inset: 0, opacity: 0.6, pointerEvents: 'none' }} />

            {/* Glow orbs */}
            <div style={{ position: 'absolute', top: '20%', left: '30%', width: 500, height: 500, background: 'radial-gradient(circle, rgba(0,229,255,0.06) 0%, transparent 65%)', borderRadius: '50%', pointerEvents: 'none' }} />
            <div style={{ position: 'absolute', bottom: '10%', right: '20%', width: 350, height: 350, background: 'radial-gradient(circle, rgba(245,158,11,0.05) 0%, transparent 65%)', borderRadius: '50%', pointerEvents: 'none' }} />

            {/* Left panel — wallpaper branding */}
            <div style={{ flex: 1, flexDirection: 'column', justifyContent: 'flex-end', alignItems: 'flex-start', padding: 0, position: 'relative', borderRight: '1px solid rgba(0,229,255,0.08)', display: 'flex', overflow: 'hidden', minHeight: '100vh' }}>
                {/* Background wallpaper */}
                <img src="/assets/cafe_login.jpg" alt="cafe" style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover', objectPosition: 'center' }} />
                {/* Dark overlay */}
                <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(180deg, rgba(7,11,20,0.35) 0%, rgba(7,11,20,0.85) 100%)' }} />
                {/* Grid overlay */}
                <div className="hud-grid" style={{ position: 'absolute', inset: 0, opacity: 0.25 }} />

                <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.8 }}
                    style={{ position: 'relative', zIndex: 2, padding: '2.5rem', width: '100%' }}>
                    {/* Logo */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: '2rem' }}>
                        <div style={{ width: 48, height: 48, borderRadius: 12, background: 'linear-gradient(135deg, rgba(0,229,255,0.25), rgba(245,158,11,0.15))', border: '1px solid rgba(0,229,255,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 0 25px rgba(0,229,255,0.2)' }}>
                            <FaMugHot style={{ color: '#00e5ff', fontSize: 22 }} />
                        </div>
                        <span style={{ fontFamily: "'Rajdhani', sans-serif", fontSize: '1.5rem', fontWeight: 700, background: 'linear-gradient(90deg, #00e5ff, #f59e0b)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', letterSpacing: '0.05em' }}>CafeSync</span>
                    </div>
                    <h2 style={{ fontFamily: "'Rajdhani', sans-serif", fontSize: '2rem', fontWeight: 700, color: '#e2eaf7', marginBottom: '0.75rem', lineHeight: 1.2, textShadow: '0 0 30px rgba(0,0,0,0.8)' }}>
                        The next-gen<br />cafe platform
                    </h2>
                    <p style={{ color: 'rgba(194,211,240,0.75)', fontSize: '0.85rem', lineHeight: 1.7, marginBottom: '1.75rem', maxWidth: 320 }}>
                        Unified dashboards for orders, menus, reservations and billing — all in one futuristic system.
                    </p>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                        {[
                            { icon: 'fa-gauge', label: 'Real-time Dashboard', color: '#00e5ff' },
                            { icon: 'fa-cart-shopping', label: 'Smart Order Management', color: '#f59e0b' },
                            { icon: 'fa-calendar-check', label: 'Table Reservations', color: '#a855f7' },
                            { icon: 'fa-credit-card', label: 'Secure Billing & Payments', color: '#10b981' },
                        ].map(({ icon, label, color }) => (
                            <div key={label} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                                <div style={{ width: 28, height: 28, borderRadius: 7, flexShrink: 0, background: `${color}25`, border: `1px solid ${color}40`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                    <i className={`fa-solid ${icon}`} style={{ color, fontSize: 11 }}></i>
                                </div>
                                <span style={{ fontSize: '0.82rem', color: 'rgba(194,211,240,0.8)' }}>{label}</span>
                            </div>
                        ))}
                    </div>
                </motion.div>
            </div>

            {/* Right panel — form */}
            <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '2rem 1.5rem', position: 'relative', zIndex: 1 }}>
                <motion.div initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.7 }}
                    style={{ width: '100%', maxWidth: 420 }}>

                    {/* Mobile logo */}
                    <div className="flex lg:hidden items-center gap-2.5 justify-center mb-8">
                        <FaMugHot style={{ color: '#00e5ff', fontSize: 22 }} />
                        <span style={{ fontFamily: "'Rajdhani', sans-serif", fontSize: '1.4rem', fontWeight: 700, background: 'linear-gradient(90deg, #00e5ff, #f59e0b)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>CafeSync</span>
                    </div>

                    <div style={{ marginBottom: '2rem' }}>
                        <h2 style={{ fontFamily: "'Rajdhani', sans-serif", fontSize: '1.75rem', fontWeight: 700, color: '#e2eaf7', letterSpacing: '0.02em' }}>Welcome back</h2>
                        <p style={{ color: '#3d5278', fontSize: '0.85rem', marginTop: 4 }}>Sign in to your account to continue</p>
                    </div>

                    {/* Error */}
                    {error && (
                        <motion.div initial={{ opacity: 0, x: -12 }} animate={{ opacity: 1, x: 0 }}
                            style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', borderRadius: 8, padding: '0.7rem 1rem', marginBottom: '1.25rem', display: 'flex', alignItems: 'center', gap: 8, fontSize: '0.82rem', color: '#ef4444' }}>
                            <i className="fa-solid fa-circle-exclamation"></i> {error}
                        </motion.div>
                    )}

                    <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                        {/* Email */}
                        <div>
                            <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 600, color: '#6b84b0', letterSpacing: '0.06em', textTransform: 'uppercase', marginBottom: 6 }}>
                                <i className="fa-solid fa-envelope mr-1.5" style={{ color: 'rgba(0,229,255,0.6)' }}></i> Email Address
                            </label>
                            <div style={{ position: 'relative' }}>
                                <input
                                    type="email" value={email} onChange={e => setEmail(e.target.value)} required
                                    placeholder="you@example.com"
                                    className="input-dark"
                                    style={{ paddingLeft: '2.5rem' }}
                                />
                                <FaEnvelope style={{ position: 'absolute', left: '0.875rem', top: '50%', transform: 'translateY(-50%)', color: '#3d5278', fontSize: 13, pointerEvents: 'none' }} />
                            </div>
                        </div>

                        {/* Password */}
                        <div>
                            <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 600, color: '#6b84b0', letterSpacing: '0.06em', textTransform: 'uppercase', marginBottom: 6 }}>
                                <i className="fa-solid fa-lock mr-1.5" style={{ color: 'rgba(0,229,255,0.6)' }}></i> Password
                            </label>
                            <div style={{ position: 'relative' }}>
                                <input
                                    type={showPassword ? 'text' : 'password'} value={password} onChange={e => setPassword(e.target.value)} required
                                    placeholder="Enter your password"
                                    className="input-dark"
                                    style={{ paddingLeft: '2.5rem', paddingRight: '2.75rem' }}
                                />
                                <FaLock style={{ position: 'absolute', left: '0.875rem', top: '50%', transform: 'translateY(-50%)', color: '#3d5278', fontSize: 13, pointerEvents: 'none' }} />
                                <button type="button" onClick={() => setShowPassword(!showPassword)}
                                    style={{ position: 'absolute', right: '0.875rem', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: '#3d5278', display: 'flex', alignItems: 'center' }}>
                                    {showPassword ? <FaEyeSlash size={14} /> : <FaEye size={14} />}
                                </button>
                            </div>
                        </div>

                        {/* Submit */}
                        <button type="submit" disabled={loading}
                            style={{
                                marginTop: 8,
                                width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                                padding: '0.8rem',
                                background: loading ? 'rgba(0,229,255,0.1)' : 'linear-gradient(135deg, #00c4d6, #00e5ff)',
                                border: loading ? '1px solid rgba(0,229,255,0.2)' : 'none',
                                borderRadius: 8,
                                color: loading ? '#00e5ff' : '#070b14',
                                fontWeight: 700, fontSize: '0.9rem',
                                cursor: loading ? 'not-allowed' : 'pointer',
                                transition: 'all 0.2s',
                                boxShadow: loading ? 'none' : '0 0 25px rgba(0,229,255,0.3)',
                            }}>
                            {loading ? (
                                <span style={{ display: 'flex', gap: 3 }}>
                                    {[0,1,2].map(i => <span key={i} className="dot-live" style={{ animationDelay: `${i * 0.2}s`, width: 6, height: 6 }} />)}
                                </span>
                            ) : (
                                <><FaRightToBracket /> Sign In</>
                            )}
                        </button>
                    </form>

                    {/* Links */}
                    <div style={{ marginTop: '1.5rem', display: 'flex', flexDirection: 'column', gap: 10, alignItems: 'center' }}>
                        <p style={{ fontSize: '0.83rem', color: '#3d5278' }}>
                            Don't have an account?{' '}
                            <Link to="/register" style={{ color: '#00e5ff', fontWeight: 600, transition: 'opacity 0.15s' }} className="hover:opacity-80">
                                Create account
                            </Link>
                        </p>
                        <Link to="/admin" style={{ fontSize: '0.78rem', color: '#6b84b0', display: 'flex', alignItems: 'center', gap: 6, transition: 'color 0.15s' }} className="hover:text-[#f59e0b]">
                            <i className="fa-solid fa-shield-halved" style={{ fontSize: 11 }}></i> Admin Portal
                        </Link>
                    </div>
                </motion.div>
            </div>
        </div>
    );
};

export default Login;

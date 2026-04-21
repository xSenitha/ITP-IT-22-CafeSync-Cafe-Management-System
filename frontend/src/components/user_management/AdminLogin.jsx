// futuristic admin login — dark with amber warning accents
import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { FaEnvelope, FaLock, FaEye, FaEyeSlash, FaShieldHalved, FaRightToBracket } from 'react-icons/fa6';
import { useAuth } from '../../context/AuthContext';

const AdminLogin = () => {
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
            const response = await login(email, password);
            if (response.user.role === 'admin' || response.user.role === 'staff') {
                navigate('/dashboard');
            } else {
                setError('Unauthorized access. Admin or Staff credentials required.');
            }
        } catch (err) {
            setError(err.response?.data?.message || 'Authentication failed. Please verify credentials.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div style={{ minHeight: '100vh', background: '#070b14', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '2rem 1.25rem', fontFamily: "'Inter', sans-serif", position: 'relative', overflow: 'hidden' }}>
            {/* Wallpaper */}
            <img src="/assets/cafe_login.jpg" alt="" style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover', opacity: 0.12, pointerEvents: 'none' }} />
            <div className="hud-grid" style={{ position: 'absolute', inset: 0, opacity: 0.5, pointerEvents: 'none' }} />
            <div style={{ position: 'absolute', top: '20%', left: '50%', transform: 'translateX(-50%)', width: 600, height: 500, background: 'radial-gradient(circle, rgba(245,158,11,0.06) 0%, transparent 65%)', borderRadius: '50%', pointerEvents: 'none' }} />
            <div style={{ position: 'absolute', bottom: '5%', right: '20%', width: 300, height: 300, background: 'radial-gradient(circle, rgba(0,229,255,0.04) 0%, transparent 65%)', borderRadius: '50%', pointerEvents: 'none' }} />

            <motion.div initial={{ opacity: 0, scale: 0.97 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 0.6 }}
                style={{ width: '100%', maxWidth: 420, position: 'relative', zIndex: 2 }}>

                {/* Logo */}
                <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
                    <div style={{
                        width: 68, height: 68, borderRadius: 16, margin: '0 auto 1rem',
                        background: 'linear-gradient(135deg, rgba(245,158,11,0.18), rgba(245,158,11,0.06))',
                        border: '1px solid rgba(245,158,11,0.35)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        boxShadow: '0 0 30px rgba(245,158,11,0.15)',
                    }}>
                        <FaShieldHalved style={{ color: '#f59e0b', fontSize: 28 }} />
                    </div>
                    <h1 style={{ fontFamily: "'Rajdhani', sans-serif", fontSize: '1.7rem', fontWeight: 700, color: '#f59e0b', letterSpacing: '0.06em', textTransform: 'uppercase' }}>Admin Portal</h1>
                    <p style={{ color: '#3d5278', fontSize: '0.82rem', marginTop: 4 }}>Restricted access — authorized personnel only</p>
                </div>

                {/* Warning bar */}
                <div style={{ background: 'rgba(245,158,11,0.07)', border: '1px solid rgba(245,158,11,0.2)', borderRadius: 8, padding: '0.6rem 0.875rem', marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: 8, fontSize: '0.75rem', color: '#f59e0b' }}>
                    <i className="fa-solid fa-triangle-exclamation"></i>
                    This portal is restricted to admin and staff members only.
                </div>

                {/* Form */}
                <div style={{ background: 'rgba(13,21,38,0.8)', backdropFilter: 'blur(16px)', border: '1px solid rgba(245,158,11,0.15)', borderRadius: '1.125rem', padding: '2rem', boxShadow: '0 0 50px rgba(245,158,11,0.06)' }}>

                    {error && (
                        <motion.div initial={{ opacity: 0, x: -12 }} animate={{ opacity: 1, x: 0 }}
                            style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', borderRadius: 8, padding: '0.65rem 0.875rem', marginBottom: '1.25rem', fontSize: '0.82rem', color: '#ef4444', display: 'flex', alignItems: 'center', gap: 8 }}>
                            <i className="fa-solid fa-circle-exclamation"></i> {error}
                        </motion.div>
                    )}

                    <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                        <div>
                            <label style={{ display: 'block', fontSize: '0.72rem', fontWeight: 600, color: '#6b84b0', letterSpacing: '0.07em', textTransform: 'uppercase', marginBottom: 5 }}>
                                <i className="fa-solid fa-envelope mr-1.5" style={{ color: 'rgba(245,158,11,0.7)' }}></i> Admin Email
                            </label>
                            <div style={{ position: 'relative' }}>
                                <input type="email" value={email} onChange={e => setEmail(e.target.value)} required placeholder="admin@cafesync.com"
                                    className="input-dark-amber" style={{ paddingLeft: '2.5rem' }} />
                                <FaEnvelope style={{ position: 'absolute', left: '0.875rem', top: '50%', transform: 'translateY(-50%)', color: '#3d5278', fontSize: 12, pointerEvents: 'none' }} />
                            </div>
                        </div>

                        <div>
                            <label style={{ display: 'block', fontSize: '0.72rem', fontWeight: 600, color: '#6b84b0', letterSpacing: '0.07em', textTransform: 'uppercase', marginBottom: 5 }}>
                                <i className="fa-solid fa-lock mr-1.5" style={{ color: 'rgba(245,158,11,0.7)' }}></i> Secure Password
                            </label>
                            <div style={{ position: 'relative' }}>
                                <input type={showPassword ? 'text' : 'password'} value={password} onChange={e => setPassword(e.target.value)} required placeholder="Enter password"
                                    className="input-dark-amber" style={{ paddingLeft: '2.5rem', paddingRight: '2.75rem' }} />
                                <FaLock style={{ position: 'absolute', left: '0.875rem', top: '50%', transform: 'translateY(-50%)', color: '#3d5278', fontSize: 12, pointerEvents: 'none' }} />
                                <button type="button" onClick={() => setShowPassword(!showPassword)}
                                    style={{ position: 'absolute', right: '0.875rem', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: '#3d5278', display: 'flex' }}>
                                    {showPassword ? <FaEyeSlash size={13} /> : <FaEye size={13} />}
                                </button>
                            </div>
                        </div>

                        <button type="submit" disabled={loading}
                            style={{
                                marginTop: 8, width: '100%',
                                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                                padding: '0.8rem',
                                background: loading ? 'rgba(245,158,11,0.08)' : 'linear-gradient(135deg, #d97706, #f59e0b)',
                                border: loading ? '1px solid rgba(245,158,11,0.2)' : 'none',
                                borderRadius: 8, color: loading ? '#f59e0b' : '#070b14',
                                fontWeight: 700, fontSize: '0.9rem',
                                cursor: loading ? 'not-allowed' : 'pointer',
                                boxShadow: loading ? 'none' : '0 0 25px rgba(245,158,11,0.3)',
                            }}>
                            {loading ? (
                                <span style={{ display: 'flex', gap: 3 }}>
                                    {[0, 1, 2].map(i => <span key={i} style={{ width: 6, height: 6, borderRadius: '50%', background: '#f59e0b', boxShadow: '0 0 4px #f59e0b', animation: 'pulse-dot 1.5s ease-in-out infinite', animationDelay: `${i * 0.2}s`, display: 'inline-block' }} />)}
                                </span>
                            ) : (
                                <><FaRightToBracket /> Access Dashboard</>
                            )}
                        </button>
                    </form>

                    <div style={{ marginTop: '1.25rem', display: 'flex', justifyContent: 'center' }}>
                        <Link to="/login" style={{ fontSize: '0.8rem', color: '#3d5278', display: 'flex', alignItems: 'center', gap: 6, transition: 'color 0.15s' }} className="hover:text-[#00e5ff]">
                            <i className="fa-solid fa-arrow-left" style={{ fontSize: 11 }}></i> Back to Customer Login
                        </Link>
                    </div>
                </div>
            </motion.div>
        </div>
    );
};

export default AdminLogin;

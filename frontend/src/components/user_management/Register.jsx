// futuristic dark register page
import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { FaUser, FaEnvelope, FaLock, FaPhone, FaUserPlus, FaMugHot, FaEye, FaEyeSlash } from 'react-icons/fa6';
import { useAuth } from '../../context/AuthContext';

const Register = () => {
    const [formData, setFormData] = useState({ firstName: '', lastName: '', email: '', password: '', confirmPassword: '', phone: '' });
    const [showPassword, setShowPassword] = useState(false);
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const { register } = useAuth();
    const navigate = useNavigate();

    const handleChange = (e) => setFormData({ ...formData, [e.target.name]: e.target.value });

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');

        if (!formData.firstName.trim() || !formData.lastName.trim()) {
            setError('First name and last name are required');
            return;
        }
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
            setError('Please enter a valid email address');
            return;
        }
        if (formData.phone && !/^\+?\d{9,15}$/.test(formData.phone.replace(/\s/g, ''))) {
            setError('Phone number must contain 9 to 15 digits');
            return;
        }
        if (formData.password.length < 6) {
            setError('Password must be at least 6 characters');
            return;
        }
        if (formData.password !== formData.confirmPassword) {
            setError('Passwords do not match');
            return;
        }

        setLoading(true);
        try {
            const { confirmPassword, ...payload } = formData;
            await register(payload);
            navigate('/');
        } catch (err) {
            setError(err.response?.data?.message || 'Registration failed. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    const fields = [
        { label: 'First Name', name: 'firstName', type: 'text', icon: FaUser, placeholder: 'First name' },
        { label: 'Last Name', name: 'lastName', type: 'text', icon: FaUser, placeholder: 'Last name' },
        { label: 'Email Address', name: 'email', type: 'email', icon: FaEnvelope, placeholder: 'you@example.com', fullWidth: true },
        { label: 'Phone Number', name: 'phone', type: 'tel', icon: FaPhone, placeholder: '+94 71 234 5678', fullWidth: true },
        { label: 'Password', name: 'password', type: 'password', icon: FaLock, placeholder: 'Min 6 characters' },
        { label: 'Confirm Password', name: 'confirmPassword', type: 'password', icon: FaLock, placeholder: 'Repeat password' },
    ];

    return (
        <div style={{ minHeight: '100vh', background: '#070b14', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '2rem 1.25rem', fontFamily: "'Inter', sans-serif", position: 'relative', overflow: 'hidden' }}>
            {/* Wallpaper */}
            <img src="/assets/cafe_login.jpg" alt="" style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover', objectPosition: 'center top', opacity: 0.18, pointerEvents: 'none' }} />
            <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(135deg, rgba(7,11,20,0.92) 0%, rgba(7,11,20,0.85) 100%)', pointerEvents: 'none' }} />
            <div style={{ position: 'absolute', top: '15%', right: '15%', width: 450, height: 450, background: 'radial-gradient(circle, rgba(0,229,255,0.06) 0%, transparent 65%)', borderRadius: '50%', pointerEvents: 'none' }} />
            <div style={{ position: 'absolute', bottom: '10%', left: '10%', width: 350, height: 350, background: 'radial-gradient(circle, rgba(245,158,11,0.05) 0%, transparent 65%)', borderRadius: '50%', pointerEvents: 'none' }} />

            <motion.div initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.7 }}
                style={{ width: '100%', maxWidth: 520, position: 'relative', zIndex: 2 }}>

                {/* Logo */}
                <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
                    <div style={{
                        width: 56, height: 56, borderRadius: 14, margin: '0 auto 0.875rem',
                        background: 'linear-gradient(135deg, rgba(0,229,255,0.15), rgba(245,158,11,0.1))',
                        border: '1px solid rgba(0,229,255,0.3)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        boxShadow: '0 0 25px rgba(0,229,255,0.12)',
                    }}>
                        <FaMugHot style={{ color: '#00e5ff', fontSize: 22 }} />
                    </div>
                    <h1 style={{ fontFamily: "'Rajdhani', sans-serif", fontSize: '1.75rem', fontWeight: 700, background: 'linear-gradient(90deg, #00e5ff, #f59e0b)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', letterSpacing: '0.04em' }}>CafeSync</h1>
                    <p style={{ color: '#3d5278', fontSize: '0.83rem', marginTop: 4 }}>Create your account to get started</p>
                </div>

                {/* Form card */}
                <div style={{ background: 'rgba(13,21,38,0.75)', backdropFilter: 'blur(16px)', border: '1px solid rgba(0,229,255,0.14)', borderRadius: '1.125rem', padding: '2rem', boxShadow: '0 0 50px rgba(0,229,255,0.07)' }}>
                    <h2 style={{ fontFamily: "'Rajdhani', sans-serif", fontSize: '1.3rem', fontWeight: 700, color: '#e2eaf7', letterSpacing: '0.02em', marginBottom: '1.5rem' }}>Create Account</h2>

                    {error && (
                        <motion.div initial={{ opacity: 0, x: -12 }} animate={{ opacity: 1, x: 0 }}
                            style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', borderRadius: 8, padding: '0.65rem 0.875rem', marginBottom: '1.25rem', fontSize: '0.82rem', color: '#ef4444', display: 'flex', alignItems: 'center', gap: 8 }}>
                            <i className="fa-solid fa-circle-exclamation"></i> {error}
                        </motion.div>
                    )}

                    <form onSubmit={handleSubmit}>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.875rem' }}>
                            {fields.map(({ label, name, type, icon: Icon, placeholder, fullWidth }) => (
                                <div key={name} style={{ gridColumn: fullWidth ? '1 / -1' : 'auto' }}>
                                    <label style={{ display: 'block', fontSize: '0.72rem', fontWeight: 600, color: '#6b84b0', letterSpacing: '0.07em', textTransform: 'uppercase', marginBottom: 5 }}>
                                        {label}
                                    </label>
                                    <div style={{ position: 'relative' }}>
                                        <input
                                            type={name.includes('assword') && !showPassword ? 'password' : (name.includes('assword') && showPassword ? 'text' : type)}
                                            name={name} value={formData[name]} onChange={handleChange}
                                            required={name !== 'phone'} placeholder={placeholder} minLength={name === 'password' ? 6 : undefined}
                                            className="input-dark"
                                            style={{ paddingLeft: '2.5rem', paddingRight: name.includes('password') ? '2.5rem' : undefined }}
                                        />
                                        <Icon style={{ position: 'absolute', left: '0.875rem', top: '50%', transform: 'translateY(-50%)', color: '#3d5278', fontSize: 12, pointerEvents: 'none' }} />
                                        {name === 'password' && (
                                            <button type="button" onClick={() => setShowPassword(!showPassword)}
                                                style={{ position: 'absolute', right: '0.875rem', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: '#3d5278', display: 'flex' }}>
                                                {showPassword ? <FaEyeSlash size={13} /> : <FaEye size={13} />}
                                            </button>
                                        )}
                                    </div>
                                </div>
                            ))}
                        </div>

                        <button type="submit" disabled={loading}
                            style={{
                                marginTop: '1.5rem', width: '100%',
                                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                                padding: '0.8rem',
                                background: loading ? 'rgba(0,229,255,0.08)' : 'linear-gradient(135deg, #00c4d6, #00e5ff)',
                                border: loading ? '1px solid rgba(0,229,255,0.2)' : 'none',
                                borderRadius: 8, color: loading ? '#00e5ff' : '#070b14',
                                fontWeight: 700, fontSize: '0.9rem',
                                cursor: loading ? 'not-allowed' : 'pointer',
                                boxShadow: loading ? 'none' : '0 0 25px rgba(0,229,255,0.3)',
                            }}>
                            {loading ? (
                                <span style={{ display: 'flex', gap: 3 }}>
                                    {[0, 1, 2].map(i => <span key={i} className="dot-live" style={{ animationDelay: `${i * 0.2}s`, width: 6, height: 6 }} />)}
                                </span>
                            ) : (
                                <><FaUserPlus style={{ fontSize: 14 }} /> Create Account</>
                            )}
                        </button>
                    </form>

                    <p style={{ textAlign: 'center', fontSize: '0.83rem', color: '#3d5278', marginTop: '1.25rem' }}>
                        Already have an account?{' '}
                        <Link to="/login" style={{ color: '#00e5ff', fontWeight: 600, transition: 'opacity 0.15s' }} className="hover:opacity-75">Sign In</Link>
                    </p>
                </div>
            </motion.div>
        </div>
    );
};

export default Register;

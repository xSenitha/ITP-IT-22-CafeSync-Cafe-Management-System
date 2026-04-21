// futuristic dark staff management — preserves all logic
import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { FaPlus, FaXmark } from 'react-icons/fa6';
import toast from 'react-hot-toast';
import API from '../../services/api';

const FieldLabel = ({ icon, children }) => (
    <label style={{ display: 'block', fontSize: '0.7rem', fontWeight: 700, color: '#6b84b0', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 5 }}>
        {icon && <i className={`fa-solid ${icon} mr-1.5`} style={{ color: 'rgba(0,229,255,0.6)', fontSize: 10 }}></i>}
        {children}
    </label>
);

const getRoleStyle = (role) => ({
    admin: { badge: 'badge-danger', icon: 'fa-user-shield', color: '#ef4444' },
    staff: { badge: 'badge-info', icon: 'fa-user-tie', color: '#00e5ff' },
    customer: { badge: 'badge-muted', icon: 'fa-user', color: '#6b84b0' },
}[role] || { badge: 'badge-muted', icon: 'fa-user', color: '#6b84b0' });

const StaffManagement = () => {
    const [users, setUsers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [showModal, setShowModal] = useState(false);
    const [editingUser, setEditingUser] = useState(null);
    const [formData, setFormData] = useState({ firstName: '', lastName: '', email: '', password: '', phone: '', role: 'staff' });
    const [roleFilter, setRoleFilter] = useState('all');

    const fetchUsers = async () => {
        try { const res = await API.get('/users/all'); setUsers(res.data); }
        catch { toast.error('Failed to fetch users'); }
        finally { setLoading(false); }
    };

    useEffect(() => { fetchUsers(); }, []);

    const handleSubmit = async (e) => {
        e.preventDefault();

        if (!formData.firstName.trim() || !formData.lastName.trim()) {
            toast.error('First name and last name are required');
            return;
        }
        if (!editingUser && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
            toast.error('Please enter a valid email address');
            return;
        }
        if (formData.phone && !/^\+?\d{9,15}$/.test(formData.phone.replace(/\s/g, ''))) {
            toast.error('Phone number must contain 9 to 15 digits');
            return;
        }
        if (!editingUser && formData.password.length < 6) {
            toast.error('Password must be at least 6 characters');
            return;
        }

        try {
            if (editingUser) {
                const { password, email, ...updateData } = formData;
                await API.put(`/users/${editingUser.id}`, updateData);
                toast.success('User updated');
            } else {
                await API.post('/users/admin-create', formData);
                toast.success('User created');
            }
            fetchUsers(); setShowModal(false);
        } catch (err) { toast.error(err.response?.data?.message || 'Failed to save user'); }
    };

    const handleDelete = async (id) => {
        if (!confirm('Delete this user? This cannot be undone.')) return;
        try { await API.delete(`/users/${id}`); toast.success('User deleted'); fetchUsers(); }
        catch { toast.error('Failed to delete user'); }
    };

    const handleToggleActive = async (user) => {
        try { await API.put(`/users/${user.id}`, { ...user, isActive: !user.isActive }); toast.success(`User ${user.isActive ? 'deactivated' : 'activated'}`); fetchUsers(); }
        catch { toast.error('Failed to update user status'); }
    };

    const openCreate = () => { setEditingUser(null); setFormData({ firstName: '', lastName: '', email: '', password: '', phone: '', role: 'staff' }); setShowModal(true); };
    const openEdit = (user) => { setEditingUser(user); setFormData({ firstName: user.firstName, lastName: user.lastName, email: user.email, password: '', phone: user.phone || '', role: user.role }); setShowModal(true); };

    const filteredUsers = users.filter(u => {
        const matchSearch = `${u.firstName} ${u.lastName} ${u.email}`.toLowerCase().includes(search.toLowerCase());
        const matchRole = roleFilter === 'all' || u.role === roleFilter;
        return matchSearch && matchRole;
    });

    const stats = {
        total: users.length,
        admins: users.filter(u => u.role === 'admin').length,
        staff: users.filter(u => u.role === 'staff').length,
        customers: users.filter(u => u.role === 'customer').length,
        active: users.filter(u => u.isActive).length
    };

    const inputCls = 'input-dark';
    const statItems = [
        { label: 'Total', value: stats.total, icon: 'fa-users', color: '#00e5ff' },
        { label: 'Admins', value: stats.admins, icon: 'fa-user-shield', color: '#ef4444' },
        { label: 'Staff', value: stats.staff, icon: 'fa-user-tie', color: '#00e5ff' },
        { label: 'Customers', value: stats.customers, icon: 'fa-user', color: '#10b981' },
        { label: 'Active', value: stats.active, icon: 'fa-circle-check', color: '#f59e0b' },
    ];

    return (
        <div style={{ fontFamily: "'Inter', sans-serif" }}>
            {/* Header */}
            <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="page-header">
                <div>
                    <h1 className="page-title"><i className="fa-solid fa-users" style={{ color: '#00e5ff', marginRight: 10 }}></i>Staff Management</h1>
                    <p className="page-subtitle">Manage users, roles, and access permissions</p>
                </div>
                <button onClick={openCreate} className="btn-solid-cyan"><FaPlus style={{ fontSize: 12 }} /> Add Staff</button>
            </motion.div>

            {/* Stats */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '0.875rem', marginBottom: '1.5rem' }}>
                {statItems.map(({ label, value, icon, color }, i) => (
                    <motion.div key={i} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.06 }}
                        style={{ background: 'rgba(13,21,38,0.7)', border: `1px solid ${color}18`, borderRadius: '0.875rem', padding: '0.875rem', textAlign: 'center' }}>
                        <div style={{ width: 32, height: 32, borderRadius: 8, background: `${color}15`, border: `1px solid ${color}25`, display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 0.5rem' }}>
                            <i className={`fa-solid ${icon}`} style={{ color, fontSize: 12 }}></i>
                        </div>
                        <p style={{ fontFamily: "'Rajdhani', sans-serif", fontSize: '1.5rem', fontWeight: 700, color: '#e2eaf7', lineHeight: 1 }}>{loading ? '...' : value}</p>
                        <p style={{ fontSize: '0.68rem', color: '#6b84b0', marginTop: 4, textTransform: 'uppercase', letterSpacing: '0.07em', fontWeight: 600 }}>{label}</p>
                    </motion.div>
                ))}
            </div>

            {/* Search and Role Filter */}
            <div className="section-card" style={{ marginBottom: '1.25rem' }}>
                <div style={{ padding: '0.875rem 1.25rem', display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 10 }}>
                    <div style={{ position: 'relative', flex: 1, minWidth: 200 }}>
                        <i className="fa-solid fa-magnifying-glass" style={{ position: 'absolute', left: '0.875rem', top: '50%', transform: 'translateY(-50%)', color: '#3d5278', fontSize: 12, pointerEvents: 'none' }}></i>
                        <input type="text" value={search} onChange={e => setSearch(e.target.value)} placeholder="Search by name or email..." className={inputCls} style={{ paddingLeft: '2.5rem', padding: '0.45rem 0.875rem 0.45rem 2.5rem' }} />
                    </div>
                    <div style={{ display: 'flex', gap: 6 }}>
                        {['all', 'admin', 'staff', 'customer'].map(role => (
                            <button key={role} onClick={() => setRoleFilter(role)}
                                style={{ padding: '0.35rem 0.875rem', borderRadius: 6, fontSize: '0.75rem', fontWeight: 600, cursor: 'pointer', textTransform: 'capitalize', transition: 'all 0.2s', background: roleFilter === role ? 'rgba(0,229,255,0.15)' : 'rgba(0,0,0,0.3)', border: roleFilter === role ? '1px solid rgba(0,229,255,0.3)' : '1px solid rgba(0,229,255,0.08)', color: roleFilter === role ? '#00e5ff' : '#6b84b0' }}>
                                {role}
                            </button>
                        ))}
                    </div>
                </div>
            </div>

            {/* Table */}
            {loading ? (
                <div style={{ display: 'flex', justifyContent: 'center', padding: '4rem 0' }}>
                    <div style={{ width: 36, height: 36, borderRadius: '50%', border: '2px solid rgba(0,229,255,0.2)', borderTopColor: '#00e5ff', animation: 'spin 0.8s linear infinite' }} />
                </div>
            ) : filteredUsers.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '4rem 1rem' }}>
                    <div style={{ width: 64, height: 64, borderRadius: 16, background: 'rgba(0,229,255,0.06)', border: '1px solid rgba(0,229,255,0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1.25rem' }}>
                        <i className="fa-solid fa-users" style={{ color: '#3d5278', fontSize: 24 }}></i>
                    </div>
                    <h3 style={{ color: '#c2d3f0', fontWeight: 700, marginBottom: 6 }}>No Users Found</h3>
                    <p style={{ color: '#3d5278', fontSize: '0.82rem', marginBottom: '1.25rem' }}>No users match your search criteria</p>
                    <button onClick={openCreate} className="btn-solid-cyan"><FaPlus style={{ fontSize: 11 }} /> Add Staff</button>
                </div>
            ) : (
                <div style={{ background: 'rgba(13,21,38,0.7)', border: '1px solid rgba(0,229,255,0.1)', borderRadius: '0.875rem', overflow: 'hidden' }}>
                    <div style={{ overflowX: 'auto' }}>
                        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                            <thead>
                                <tr style={{ background: 'rgba(0,229,255,0.03)', borderBottom: '1px solid rgba(0,229,255,0.07)' }}>
                                    {['User', 'Email', 'Phone', 'Role', 'Status', 'Actions'].map(h => (
                                        <th key={h} style={{ textAlign: h === 'Actions' ? 'right' : 'left', padding: '0.75rem 1rem', fontSize: '0.65rem', fontWeight: 700, color: '#3d5278', textTransform: 'uppercase', letterSpacing: '0.1em', whiteSpace: 'nowrap' }}>{h}</th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody>
                                {filteredUsers.map((user, i) => {
                                    const rs = getRoleStyle(user.role);
                                    return (
                                        <motion.tr key={user.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: i * 0.03 }}
                                            style={{ borderBottom: '1px solid rgba(0,229,255,0.05)', transition: 'background 0.15s' }}
                                            onMouseEnter={e => e.currentTarget.style.background = 'rgba(0,229,255,0.03)'}
                                            onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                                            <td style={{ padding: '0.75rem 1rem' }}>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                                                    <div style={{ width: 36, height: 36, borderRadius: 8, background: `${rs.color}15`, border: `1px solid ${rs.color}25`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: "'Rajdhani', sans-serif", fontSize: '0.85rem', fontWeight: 700, color: rs.color, flexShrink: 0 }}>
                                                        {user.firstName?.[0]}{user.lastName?.[0]}
                                                    </div>
                                                    <div>
                                                        <p style={{ fontSize: '0.82rem', fontWeight: 700, color: '#c2d3f0' }}>{user.firstName} {user.lastName}</p>
                                                        <p style={{ fontSize: '0.65rem', color: '#3d5278' }}>ID: {user.id}</p>
                                                    </div>
                                                </div>
                                            </td>
                                            <td style={{ padding: '0.75rem 1rem', fontSize: '0.78rem', color: '#6b84b0' }}>{user.email}</td>
                                            <td style={{ padding: '0.75rem 1rem', fontSize: '0.78rem', color: '#6b84b0' }}>{user.phone || '—'}</td>
                                            <td style={{ padding: '0.75rem 1rem' }}>
                                                <span className={`badge ${rs.badge}`} style={{ display: 'inline-flex', alignItems: 'center', gap: 5 }}>
                                                    <i className={`fa-solid ${rs.icon}`} style={{ fontSize: 9 }}></i>
                                                    {user.role}
                                                </span>
                                            </td>
                                            <td style={{ padding: '0.75rem 1rem' }}>
                                                <button onClick={() => handleToggleActive(user)} title={user.isActive ? 'Deactivate' : 'Activate'}
                                                    style={{ border: 'none', cursor: 'pointer', fontSize: '0.75rem', fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: 5, padding: '3px 8px', borderRadius: 6, transition: 'all 0.15s', color: user.isActive ? '#10b981' : '#3d5278', background: user.isActive ? 'rgba(16,185,129,0.08)' : 'rgba(61,82,120,0.1)' }}>
                                                    <i className={`fa-solid ${user.isActive ? 'fa-toggle-on' : 'fa-toggle-off'}`} style={{ fontSize: 14 }}></i>
                                                    {user.isActive ? 'Active' : 'Inactive'}
                                                </button>
                                            </td>
                                            <td style={{ padding: '0.75rem 1rem', textAlign: 'right' }}>
                                                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 6 }}>
                                                    <button onClick={() => openEdit(user)} title="Edit" style={{ padding: '5px 8px', borderRadius: 6, background: 'rgba(0,229,255,0.08)', border: '1px solid rgba(0,229,255,0.15)', color: '#00e5ff', cursor: 'pointer', fontSize: 12, transition: 'all 0.15s' }}>
                                                        <i className="fa-solid fa-pen" style={{ fontSize: 11 }}></i>
                                                    </button>
                                                    <button onClick={() => handleDelete(user.id)} title="Delete" style={{ padding: '5px 8px', borderRadius: 6, background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.15)', color: '#ef4444', cursor: 'pointer', fontSize: 12, transition: 'all 0.15s' }}>
                                                        <i className="fa-solid fa-trash" style={{ fontSize: 11 }}></i>
                                                    </button>
                                                </div>
                                            </td>
                                        </motion.tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {/* Modal */}
            <AnimatePresence>
                {showModal && (
                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                        style={{ position: 'fixed', inset: 0, background: 'rgba(7,11,20,0.85)', backdropFilter: 'blur(8px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 50, padding: '1rem' }}>
                        <motion.div initial={{ scale: 0.92, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.92, opacity: 0 }}
                            style={{ background: '#0d1526', border: '1px solid rgba(0,229,255,0.18)', borderRadius: '1.25rem', width: '100%', maxWidth: 460, boxShadow: '0 0 60px rgba(0,229,255,0.1)' }}>
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '1.25rem 1.5rem', borderBottom: '1px solid rgba(0,229,255,0.08)', background: 'rgba(0,229,255,0.03)' }}>
                                <h2 style={{ fontFamily: "'Rajdhani', sans-serif", fontSize: '1.15rem', fontWeight: 700, color: '#e2eaf7', display: 'flex', alignItems: 'center', gap: 8 }}>
                                    <i className="fa-solid fa-user-plus" style={{ color: '#00e5ff', fontSize: 14 }}></i> {editingUser ? 'Edit User' : 'Add Staff Member'}
                                </h2>
                                <button onClick={() => setShowModal(false)} style={{ color: '#3d5278', background: 'none', border: 'none', cursor: 'pointer', padding: 4 }}><FaXmark size={18} /></button>
                            </div>
                            <form onSubmit={handleSubmit} style={{ padding: '1.25rem 1.5rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                                    <div><FieldLabel icon="fa-user">First Name</FieldLabel><input type="text" value={formData.firstName} onChange={e => setFormData({ ...formData, firstName: e.target.value })} required className={inputCls} placeholder="First name" /></div>
                                    <div><FieldLabel icon="fa-user">Last Name</FieldLabel><input type="text" value={formData.lastName} onChange={e => setFormData({ ...formData, lastName: e.target.value })} required className={inputCls} placeholder="Last name" /></div>
                                </div>
                                {!editingUser && (
                                    <>
                                        <div><FieldLabel icon="fa-envelope">Email</FieldLabel><input type="email" value={formData.email} onChange={e => setFormData({ ...formData, email: e.target.value })} required className={inputCls} placeholder="email@example.com" /></div>
                                        <div><FieldLabel icon="fa-lock">Password</FieldLabel><input type="password" value={formData.password} onChange={e => setFormData({ ...formData, password: e.target.value })} required minLength={6} className={inputCls} placeholder="Min 6 characters" /></div>
                                    </>
                                )}
                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                                    <div><FieldLabel icon="fa-phone">Phone</FieldLabel><input type="text" value={formData.phone} onChange={e => setFormData({ ...formData, phone: e.target.value })} className={inputCls} placeholder="Phone number" /></div>
                                    <div>
                                        <FieldLabel icon="fa-user-shield">Role</FieldLabel>
                                        <select value={formData.role} onChange={e => setFormData({ ...formData, role: e.target.value })} className={inputCls}>
                                            <option value="staff">Staff</option><option value="admin">Admin</option><option value="customer">Customer</option>
                                        </select>
                                    </div>
                                </div>
                                <div style={{ display: 'flex', gap: 10, paddingTop: 4 }}>
                                    <button type="button" onClick={() => setShowModal(false)} className="btn-neon-cyan" style={{ flex: 1, justifyContent: 'center' }}>Cancel</button>
                                    <button type="submit" className="btn-solid-cyan" style={{ flex: 1, justifyContent: 'center' }}>{editingUser ? 'Update' : 'Create'} User</button>
                                </div>
                            </form>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
};

export default StaffManagement;

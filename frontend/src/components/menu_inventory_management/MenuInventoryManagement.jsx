import { useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { FaDownload, FaEnvelope, FaPlus, FaXmark } from 'react-icons/fa6';
import API, { downloadApiFile } from '../../services/api';
import toast from 'react-hot-toast';

const FieldLabel = ({ icon, children }) => (
    <label style={{ display: 'block', fontSize: '0.7rem', fontWeight: 700, color: '#6b84b0', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 5 }}>
        {icon && <i className={`fa-solid ${icon} mr-1.5`} style={{ color: 'rgba(0,229,255,0.6)', fontSize: 10 }}></i>}
        {children}
    </label>
);

const ModalBox = ({ title, icon, onClose, children }) => (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        style={{ position: 'fixed', inset: 0, background: 'rgba(7,11,20,0.85)', backdropFilter: 'blur(8px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 50, padding: '1rem' }}>
        <motion.div initial={{ scale: 0.92, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.92, opacity: 0 }}
            style={{ background: '#0d1526', border: '1px solid rgba(0,229,255,0.18)', borderRadius: '1.25rem', width: '100%', maxWidth: 560, maxHeight: '90vh', overflowY: 'auto', boxShadow: '0 0 60px rgba(0,229,255,0.1)' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '1.25rem 1.5rem', borderBottom: '1px solid rgba(0,229,255,0.08)', background: 'rgba(0,229,255,0.03)' }}>
                <h2 style={{ fontFamily: "'Rajdhani', sans-serif", fontSize: '1.15rem', fontWeight: 700, color: '#e2eaf7', display: 'flex', alignItems: 'center', gap: 8 }}>
                    <i className={`fa-solid ${icon}`} style={{ color: '#00e5ff', fontSize: 14 }}></i> {title}
                </h2>
                <button onClick={onClose} style={{ color: '#3d5278', background: 'none', border: 'none', cursor: 'pointer', padding: 4 }}>
                    <FaXmark size={18} />
                </button>
            </div>
            {children}
        </motion.div>
    </motion.div>
);

const emptyMenuForm = { name: '', description: '', category: 'beverage', price: '', isAvailable: true, preparationTime: '' };
const emptyStockForm = { ingredientName: '', category: 'other', quantity: '', unit: 'kg', minimumStock: '10', unitPrice: '', supplier: '', expiryDate: '' };

const MenuInventoryManagement = () => {
    const [activeTab, setActiveTab] = useState('menu');
    const [menuItems, setMenuItems] = useState([]);
    const [stockItems, setStockItems] = useState([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [categoryFilter, setCategoryFilter] = useState('all');
    const [showMenuModal, setShowMenuModal] = useState(false);
    const [showStockModal, setShowStockModal] = useState(false);
    const [editingMenuItem, setEditingMenuItem] = useState(null);
    const [editingStockItem, setEditingStockItem] = useState(null);
    const [menuForm, setMenuForm] = useState(emptyMenuForm);
    const [stockForm, setStockForm] = useState(emptyStockForm);
    const [imageFile, setImageFile] = useState(null);

    useEffect(() => {
        fetchData();
    }, []);

    const fetchData = async () => {
        try {
            const [menuRes, stockRes] = await Promise.all([
                API.get('/menu/items').catch(() => ({ data: [] })),
                API.get('/menu/stock').catch(() => ({ data: [] }))
            ]);
            setMenuItems(menuRes.data);
            setStockItems(stockRes.data);
        } catch {
            toast.error('Failed to load menu and stock data');
        } finally {
            setLoading(false);
        }
    };

    const validateMenuForm = () => {
        if (!menuForm.name.trim()) return 'Item name is required';
        if (menuForm.name.trim().length > 100) return 'Item name is too long';
        if (!menuForm.price || parseFloat(menuForm.price) <= 0) return 'Price must be greater than 0';
        if (menuForm.preparationTime && parseInt(menuForm.preparationTime, 10) < 1) return 'Preparation time must be at least 1 minute';
        return '';
    };

    const validateStockForm = () => {
        if (!stockForm.ingredientName.trim()) return 'Ingredient name is required';
        if (!stockForm.quantity || parseFloat(stockForm.quantity) < 0) return 'Quantity cannot be negative';
        if (!stockForm.minimumStock || parseFloat(stockForm.minimumStock) < 0) return 'Minimum stock cannot be negative';
        if (!stockForm.unitPrice || parseFloat(stockForm.unitPrice) <= 0) return 'Unit price must be greater than 0';
        if (stockForm.expiryDate) {
            const today = new Date();
            today.setHours(0, 0, 0, 0);
            if (new Date(stockForm.expiryDate) < today) return 'Expiry date cannot be in the past';
        }
        return '';
    };

    const handleMenuSubmit = async (e) => {
        e.preventDefault();
        const errorMessage = validateMenuForm();
        if (errorMessage) {
            toast.error(errorMessage);
            return;
        }

        try {
            const formData = new FormData();
            Object.entries(menuForm).forEach(([key, value]) => {
                formData.append(key, value);
            });
            if (imageFile) formData.append('image', imageFile);

            const config = { headers: { 'Content-Type': 'multipart/form-data' } };
            if (editingMenuItem) {
                await API.put(`/menu/items/${editingMenuItem.id}`, formData, config);
                toast.success('Menu item updated');
            } else {
                await API.post('/menu/items', formData, config);
                toast.success('Menu item added');
            }

            setShowMenuModal(false);
            setEditingMenuItem(null);
            setMenuForm(emptyMenuForm);
            setImageFile(null);
            fetchData();
        } catch (error) {
            toast.error(error.response?.data?.message || 'Failed to save menu item');
        }
    };

    const handleStockSubmit = async (e) => {
        e.preventDefault();
        const errorMessage = validateStockForm();
        if (errorMessage) {
            toast.error(errorMessage);
            return;
        }

        try {
            if (editingStockItem) {
                await API.put(`/menu/stock/${editingStockItem.id}`, stockForm);
                toast.success('Stock item updated');
            } else {
                await API.post('/menu/stock', stockForm);
                toast.success('Stock item added');
            }

            setShowStockModal(false);
            setEditingStockItem(null);
            setStockForm(emptyStockForm);
            fetchData();
        } catch (error) {
            toast.error(error.response?.data?.message || 'Failed to save stock item');
        }
    };

    const handleDelete = async (id, type) => {
        if (!confirm(`Delete this ${type}?`)) return;
        try {
            await API.delete(`/menu/${type === 'menu' ? 'items' : 'stock'}/${id}`);
            toast.success(`${type} deleted`);
            fetchData();
        } catch {
            toast.error('Failed to delete item');
        }
    };

    const downloadStockReport = async () => {
        try {
            await downloadApiFile('/menu/stock/export/file', 'stock-report.xlsx');
            toast.success('Stock report downloaded');
        } catch {
            toast.error('Failed to download stock report');
        }
    };

    const downloadStockPdf = async () => {
        try {
            await downloadApiFile('/menu/stock/export/pdf', 'stock-report.pdf');
            toast.success('Stock PDF downloaded');
        } catch {
            toast.error('Failed to download stock PDF');
        }
    };

    const downloadMenuPdf = async () => {
        try {
            await downloadApiFile('/menu/items/export/pdf', 'menu-items-report.pdf');
            toast.success('Menu PDF downloaded');
        } catch {
            toast.error('Failed to download menu PDF');
        }
    };

    const sendStockAlert = async () => {
        try {
            await API.post('/menu/stock/alerts/email');
            toast.success('Low stock email sent');
        } catch (error) {
            toast.error(error.response?.data?.message || 'Failed to send low stock email');
        }
    };

    const openMenuEdit = (item) => {
        setEditingMenuItem(item);
        setMenuForm({
            name: item.name,
            description: item.description || '',
            category: item.category,
            price: String(item.price),
            isAvailable: item.isAvailable,
            preparationTime: item.preparationTime ? String(item.preparationTime) : ''
        });
        setImageFile(null);
        setShowMenuModal(true);
    };

    const openStockEdit = (item) => {
        setEditingStockItem(item);
        setStockForm({
            ingredientName: item.ingredientName,
            category: item.category,
            quantity: String(item.quantity),
            unit: item.unit,
            minimumStock: String(item.minimumStock ?? 10),
            unitPrice: String(item.unitPrice),
            supplier: item.supplier || '',
            expiryDate: item.expiryDate?.split('T')[0] || ''
        });
        setShowStockModal(true);
    };

    const openNewMenu = () => {
        setEditingMenuItem(null);
        setMenuForm(emptyMenuForm);
        setImageFile(null);
        setShowMenuModal(true);
    };

    const openNewStock = () => {
        setEditingStockItem(null);
        setStockForm(emptyStockForm);
        setShowStockModal(true);
    };

    const categories = ['all', 'beverage', 'appetizer', 'main_course', 'dessert', 'snack', 'special'];
    const filteredMenu = menuItems.filter((item) => (categoryFilter === 'all' || item.category === categoryFilter) && item.name?.toLowerCase().includes(search.toLowerCase()));
    const filteredStock = stockItems.filter((item) => item.ingredientName?.toLowerCase().includes(search.toLowerCase()));
    const lowStockCount = stockItems.filter((item) => parseFloat(item.quantity) <= parseFloat(item.minimumStock || 10)).length;

    const categoryColors = { beverage: '#00e5ff', appetizer: '#f59e0b', main_course: '#10b981', dessert: '#a855f7', snack: '#f97316', special: '#ec4899' };

    return (
        <div style={{ fontFamily: "'Inter', sans-serif" }}>
            <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="page-header">
                <div>
                    <h1 className="page-title"><i className="fa-solid fa-book-open" style={{ color: '#f59e0b', marginRight: 10 }}></i>Menu &amp; Inventory</h1>
                    <p className="page-subtitle">Manage menu items, stock levels, alerts, and exports</p>
                </div>
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                    {activeTab === 'stock' && (
                        <>
                            <button onClick={sendStockAlert} className="btn-neon-cyan">
                                <FaEnvelope style={{ fontSize: 12 }} /> Email Alerts
                            </button>
                            <button onClick={downloadStockReport} className="btn-neon-cyan">
                                <FaDownload style={{ fontSize: 12 }} /> Stock Excel
                            </button>
                            <button onClick={downloadStockPdf} className="btn-neon-cyan">
                                <FaDownload style={{ fontSize: 12 }} /> Stock PDF
                            </button>
                        </>
                    )}
                    {activeTab === 'menu' && (
                        <button onClick={downloadMenuPdf} className="btn-neon-cyan">
                            <FaDownload style={{ fontSize: 12 }} /> Menu PDF
                        </button>
                    )}
                    <button onClick={activeTab === 'menu' ? openNewMenu : openNewStock} className="btn-solid-cyan">
                        <FaPlus style={{ fontSize: 12 }} /> Add {activeTab === 'menu' ? 'Item' : 'Stock'}
                    </button>
                </div>
            </motion.div>

            <div className="section-card" style={{ marginBottom: '1.25rem' }}>
                <div style={{ padding: '0.875rem 1.25rem', display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 10 }}>
                    <div style={{ display: 'flex', background: 'rgba(0,0,0,0.3)', borderRadius: 8, padding: 3, border: '1px solid rgba(0,229,255,0.1)' }}>
                        {['menu', 'stock'].map((tab) => (
                            <button key={tab} onClick={() => setActiveTab(tab)}
                                style={{ padding: '0.4rem 1rem', borderRadius: 6, fontSize: '0.8rem', fontWeight: 600, cursor: 'pointer', background: activeTab === tab ? 'rgba(0,229,255,0.12)' : 'transparent', border: activeTab === tab ? '1px solid rgba(0,229,255,0.25)' : '1px solid transparent', color: activeTab === tab ? '#00e5ff' : '#6b84b0', transition: 'all 0.2s' }}>
                                {tab === 'menu' ? 'Menu Items' : 'Inventory'}
                            </button>
                        ))}
                    </div>
                    {activeTab === 'menu' && (
                        <select value={categoryFilter} onChange={(e) => setCategoryFilter(e.target.value)} className="input-dark" style={{ width: 'auto', padding: '0.4rem 2rem 0.4rem 0.75rem', fontSize: '0.8rem' }}>
                            {categories.map((category) => (
                                <option key={category} value={category}>{category === 'all' ? 'All Categories' : category.replace('_', ' ')}</option>
                            ))}
                        </select>
                    )}
                    <div style={{ position: 'relative', flex: 1, minWidth: 180 }}>
                        <i className="fa-solid fa-magnifying-glass" style={{ position: 'absolute', left: '0.875rem', top: '50%', transform: 'translateY(-50%)', color: '#3d5278', fontSize: 12 }}></i>
                        <input type="text" value={search} onChange={(e) => setSearch(e.target.value)} placeholder={`Search ${activeTab}...`} className="input-dark" style={{ paddingLeft: '2.5rem', padding: '0.45rem 0.875rem 0.45rem 2.5rem' }} />
                    </div>
                </div>
            </div>

            {activeTab === 'stock' && lowStockCount > 0 && (
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                    style={{ display: 'flex', alignItems: 'center', gap: 10, background: 'rgba(245,158,11,0.08)', border: '1px solid rgba(245,158,11,0.25)', borderRadius: 8, padding: '0.65rem 1rem', marginBottom: '1rem', fontSize: '0.8rem', color: '#f59e0b' }}>
                    <i className="fa-solid fa-triangle-exclamation"></i>
                    {lowStockCount} item{lowStockCount > 1 ? 's are' : ' is'} at or below minimum stock
                </motion.div>
            )}

            {loading ? (
                <div style={{ display: 'flex', justifyContent: 'center', padding: '4rem 0' }}>
                    <div style={{ width: 36, height: 36, borderRadius: '50%', border: '2px solid rgba(245,158,11,0.2)', borderTopColor: '#f59e0b', animation: 'spin 0.8s linear infinite' }} />
                </div>
            ) : activeTab === 'menu' ? (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: '1rem' }}>
                    {filteredMenu.map((item) => (
                        <div key={item.id} style={{ background: 'rgba(13,21,38,0.7)', border: '1px solid rgba(245,158,11,0.12)', borderRadius: '0.875rem', overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
                            {item.image ? (
                                <img src={item.image} alt={item.name} style={{ width: '100%', height: 120, objectFit: 'cover' }} />
                            ) : (
                                <div style={{ height: 120, background: 'linear-gradient(135deg, rgba(245,158,11,0.08), rgba(245,158,11,0.03))', display: 'flex', alignItems: 'center', justifyContent: 'center', borderBottom: '1px solid rgba(245,158,11,0.08)' }}>
                                    <i className="fa-solid fa-mug-hot" style={{ fontSize: 28, color: 'rgba(245,158,11,0.3)' }}></i>
                                </div>
                            )}
                            <div style={{ padding: '0.875rem 1rem', flex: 1, display: 'flex', flexDirection: 'column' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 6 }}>
                                    <h3 style={{ fontSize: '0.875rem', fontWeight: 700, color: '#e2eaf7' }}>{item.name}</h3>
                                    <span className={`badge ${item.isAvailable ? 'badge-success' : 'badge-danger'}`} style={{ fontSize: '0.6rem', padding: '0.15rem 0.5rem' }}>{item.isAvailable ? 'Available' : 'Unavailable'}</span>
                                </div>
                                <p style={{ fontSize: '0.72rem', color: '#3d5278', marginBottom: 8, flex: 1 }}>{item.description || 'No description'}</p>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 10 }}>
                                    <div>
                                        <span style={{ fontSize: '0.7rem', padding: '0.15rem 0.5rem', borderRadius: 99, background: `${categoryColors[item.category] || '#6b84b0'}15`, color: categoryColors[item.category] || '#6b84b0', border: `1px solid ${categoryColors[item.category] || '#6b84b0'}25`, fontWeight: 600 }}>
                                            {item.category?.replace('_', ' ')}
                                        </span>
                                        {item.preparationTime && <p style={{ fontSize: '0.65rem', color: '#6b84b0', marginTop: 6 }}>Prep: {item.preparationTime} min</p>}
                                    </div>
                                    <span style={{ fontFamily: "'Rajdhani', sans-serif", fontSize: '1rem', fontWeight: 700, color: '#f59e0b' }}>LKR {parseFloat(item.price).toFixed(2)}</span>
                                </div>
                            </div>
                            <div className="card-actions">
                                <button onClick={() => openMenuEdit(item)} className="btn-neon-cyan" style={{ padding: '0.28rem 0.7rem', fontSize: '0.7rem' }}><i className="fa-solid fa-pen" style={{ fontSize: 10 }}></i> Edit</button>
                                <button onClick={() => handleDelete(item.id, 'menu')} className="btn-danger" style={{ padding: '0.28rem 0.7rem', fontSize: '0.7rem' }}><i className="fa-solid fa-trash" style={{ fontSize: 10 }}></i> Delete</button>
                            </div>
                        </div>
                    ))}
                </div>
            ) : (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: '1rem' }}>
                    {filteredStock.map((item) => {
                        const isLow = parseFloat(item.quantity) <= parseFloat(item.minimumStock || 10);
                        return (
                            <div key={item.id} style={{ background: 'rgba(13,21,38,0.7)', border: `1px solid ${isLow ? 'rgba(245,158,11,0.25)' : 'rgba(0,229,255,0.1)'}`, borderRadius: '0.875rem', overflow: 'hidden' }}>
                                <div style={{ padding: '1rem 1.125rem' }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                                        <h3 style={{ fontSize: '0.9rem', fontWeight: 700, color: '#e2eaf7' }}>{item.ingredientName}</h3>
                                        <span className={`badge ${isLow ? 'badge-warning' : 'badge-success'}`}>{item.status}</span>
                                    </div>
                                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, fontSize: '0.78rem' }}>
                                        <div style={{ background: 'rgba(0,229,255,0.05)', borderRadius: 6, padding: '0.4rem 0.6rem' }}>
                                            <p style={{ color: '#3d5278', fontSize: '0.65rem', textTransform: 'uppercase', letterSpacing: '0.07em' }}>Quantity</p>
                                            <p style={{ color: '#00e5ff', fontWeight: 700, marginTop: 2 }}>{item.quantity} {item.unit}</p>
                                        </div>
                                        <div style={{ background: 'rgba(245,158,11,0.05)', borderRadius: 6, padding: '0.4rem 0.6rem' }}>
                                            <p style={{ color: '#3d5278', fontSize: '0.65rem', textTransform: 'uppercase', letterSpacing: '0.07em' }}>Minimum</p>
                                            <p style={{ color: '#f59e0b', fontWeight: 700, marginTop: 2 }}>{item.minimumStock} {item.unit}</p>
                                        </div>
                                    </div>
                                    <p style={{ fontSize: '0.72rem', color: '#6b84b0', marginTop: 8 }}>Unit price: LKR {parseFloat(item.unitPrice).toFixed(2)}</p>
                                    {item.supplier && <p style={{ fontSize: '0.72rem', color: '#6b84b0', marginTop: 4 }}>Supplier: {item.supplier}</p>}
                                </div>
                                <div className="card-actions">
                                    <button onClick={() => openStockEdit(item)} className="btn-neon-cyan" style={{ padding: '0.28rem 0.7rem', fontSize: '0.7rem' }}><i className="fa-solid fa-pen" style={{ fontSize: 10 }}></i> Edit</button>
                                    <button onClick={() => handleDelete(item.id, 'stock')} className="btn-danger" style={{ padding: '0.28rem 0.7rem', fontSize: '0.7rem' }}><i className="fa-solid fa-trash" style={{ fontSize: 10 }}></i> Delete</button>
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}

            <AnimatePresence>
                {showMenuModal && (
                    <ModalBox title={editingMenuItem ? 'Edit Menu Item' : 'Add Menu Item'} icon="fa-book-open" onClose={() => setShowMenuModal(false)}>
                        <form onSubmit={handleMenuSubmit} style={{ padding: '1.25rem 1.5rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                            <div>
                                <FieldLabel icon="fa-tag">Item Name</FieldLabel>
                                <input type="text" value={menuForm.name} onChange={(e) => setMenuForm({ ...menuForm, name: e.target.value })} className="input-dark" />
                            </div>
                            <div>
                                <FieldLabel icon="fa-align-left">Description</FieldLabel>
                                <textarea value={menuForm.description} onChange={(e) => setMenuForm({ ...menuForm, description: e.target.value })} className="input-dark" rows={2} style={{ resize: 'vertical' }} />
                            </div>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                                <div>
                                    <FieldLabel icon="fa-layer-group">Category</FieldLabel>
                                    <select value={menuForm.category} onChange={(e) => setMenuForm({ ...menuForm, category: e.target.value })} className="input-dark">
                                        <option value="beverage">Beverage</option>
                                        <option value="appetizer">Appetizer</option>
                                        <option value="main_course">Main Course</option>
                                        <option value="dessert">Dessert</option>
                                        <option value="snack">Snack</option>
                                        <option value="special">Special</option>
                                    </select>
                                </div>
                                <div>
                                    <FieldLabel icon="fa-coins">Price</FieldLabel>
                                    <input type="number" min="0.01" step="0.01" value={menuForm.price} onChange={(e) => setMenuForm({ ...menuForm, price: e.target.value })} className="input-dark" />
                                </div>
                            </div>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                                <div>
                                    <FieldLabel icon="fa-clock">Preparation Time (minutes)</FieldLabel>
                                    <input type="number" min="1" value={menuForm.preparationTime} onChange={(e) => setMenuForm({ ...menuForm, preparationTime: e.target.value })} className="input-dark" />
                                </div>
                                <div>
                                    <FieldLabel icon="fa-image">Item Image</FieldLabel>
                                    <input type="file" accept="image/*" onChange={(e) => setImageFile(e.target.files[0])} className="input-dark" style={{ cursor: 'pointer' }} />
                                </div>
                            </div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                                <input type="checkbox" checked={menuForm.isAvailable} onChange={(e) => setMenuForm({ ...menuForm, isAvailable: e.target.checked })} style={{ width: 16, height: 16, accentColor: '#00e5ff' }} />
                                <span style={{ fontSize: '0.82rem', color: '#c2d3f0' }}>Available for ordering</span>
                            </div>
                            <div style={{ display: 'flex', gap: 10 }}>
                                <button type="button" onClick={() => setShowMenuModal(false)} className="btn-neon-cyan" style={{ flex: 1, justifyContent: 'center' }}>Cancel</button>
                                <button type="submit" className="btn-solid-cyan" style={{ flex: 1, justifyContent: 'center' }}>{editingMenuItem ? 'Update' : 'Add'} Item</button>
                            </div>
                        </form>
                    </ModalBox>
                )}
            </AnimatePresence>

            <AnimatePresence>
                {showStockModal && (
                    <ModalBox title={editingStockItem ? 'Edit Stock Item' : 'Add Stock Item'} icon="fa-box" onClose={() => setShowStockModal(false)}>
                        <form onSubmit={handleStockSubmit} style={{ padding: '1.25rem 1.5rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                            <div>
                                <FieldLabel icon="fa-tag">Ingredient Name</FieldLabel>
                                <input type="text" value={stockForm.ingredientName} onChange={(e) => setStockForm({ ...stockForm, ingredientName: e.target.value })} className="input-dark" />
                            </div>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                                <div>
                                    <FieldLabel icon="fa-layer-group">Category</FieldLabel>
                                    <select value={stockForm.category} onChange={(e) => setStockForm({ ...stockForm, category: e.target.value })} className="input-dark">
                                        <option value="other">Other</option>
                                        <option value="dairy">Dairy</option>
                                        <option value="meat">Meat</option>
                                        <option value="vegetable">Vegetable</option>
                                        <option value="fruit">Fruit</option>
                                        <option value="grain">Grain</option>
                                        <option value="spice">Spice</option>
                                        <option value="beverage">Beverage</option>
                                    </select>
                                </div>
                                <div>
                                    <FieldLabel icon="fa-ruler">Unit</FieldLabel>
                                    <select value={stockForm.unit} onChange={(e) => setStockForm({ ...stockForm, unit: e.target.value })} className="input-dark">
                                        <option value="kg">Kg</option>
                                        <option value="g">Grams</option>
                                        <option value="l">Liters</option>
                                        <option value="ml">mL</option>
                                        <option value="pieces">Pieces</option>
                                        <option value="packets">Packets</option>
                                    </select>
                                </div>
                            </div>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '0.75rem' }}>
                                <div>
                                    <FieldLabel icon="fa-hashtag">Quantity</FieldLabel>
                                    <input type="number" min="0" step="0.01" value={stockForm.quantity} onChange={(e) => setStockForm({ ...stockForm, quantity: e.target.value })} className="input-dark" />
                                </div>
                                <div>
                                    <FieldLabel icon="fa-triangle-exclamation">Minimum Stock</FieldLabel>
                                    <input type="number" min="0" step="0.01" value={stockForm.minimumStock} onChange={(e) => setStockForm({ ...stockForm, minimumStock: e.target.value })} className="input-dark" />
                                </div>
                                <div>
                                    <FieldLabel icon="fa-coins">Unit Price</FieldLabel>
                                    <input type="number" min="0.01" step="0.01" value={stockForm.unitPrice} onChange={(e) => setStockForm({ ...stockForm, unitPrice: e.target.value })} className="input-dark" />
                                </div>
                            </div>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                                <div>
                                    <FieldLabel icon="fa-truck">Supplier</FieldLabel>
                                    <input type="text" value={stockForm.supplier} onChange={(e) => setStockForm({ ...stockForm, supplier: e.target.value })} className="input-dark" />
                                </div>
                                <div>
                                    <FieldLabel icon="fa-calendar-xmark">Expiry Date</FieldLabel>
                                    <input type="date" value={stockForm.expiryDate} onChange={(e) => setStockForm({ ...stockForm, expiryDate: e.target.value })} className="input-dark" />
                                </div>
                            </div>
                            <div style={{ display: 'flex', gap: 10 }}>
                                <button type="button" onClick={() => setShowStockModal(false)} className="btn-neon-cyan" style={{ flex: 1, justifyContent: 'center' }}>Cancel</button>
                                <button type="submit" className="btn-solid-cyan" style={{ flex: 1, justifyContent: 'center' }}>{editingStockItem ? 'Update' : 'Add'} Stock</button>
                            </div>
                        </form>
                    </ModalBox>
                )}
            </AnimatePresence>
        </div>
    );
};

export default MenuInventoryManagement;

import { useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { FaDownload, FaEnvelope, FaPlus, FaQrcode, FaXmark } from 'react-icons/fa6';
import API, { downloadApiFile } from '../../services/api';
import toast from 'react-hot-toast';

const FieldLabel = ({ icon, children }) => (
    <label style={{ display: 'block', fontSize: '0.7rem', fontWeight: 700, color: '#6b84b0', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 5 }}>
        {icon && <i className={`fa-solid ${icon} mr-1.5`} style={{ color: 'rgba(0,229,255,0.6)', fontSize: 10 }}></i>}
        {children}
    </label>
);

const ModalBox = ({ title, icon, accent, onClose, children }) => (
    <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        style={{ position: 'fixed', inset: 0, background: 'rgba(7,11,20,0.85)', backdropFilter: 'blur(8px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 50, padding: '1rem' }}
    >
        <motion.div
            initial={{ scale: 0.92, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.92, opacity: 0 }}
            style={{ background: '#0d1526', border: `1px solid ${accent || 'rgba(0,229,255,0.18)'}`, borderRadius: '1.25rem', width: '100%', maxWidth: 520, maxHeight: '90vh', overflowY: 'auto', boxShadow: `0 0 60px ${accent || 'rgba(0,229,255,0.1)'}` }}
        >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '1.25rem 1.5rem', borderBottom: '1px solid rgba(0,229,255,0.08)', background: 'rgba(0,229,255,0.02)' }}>
                <h2 style={{ fontFamily: "'Rajdhani', sans-serif", fontSize: '1.15rem', fontWeight: 700, color: '#e2eaf7', display: 'flex', alignItems: 'center', gap: 8 }}>
                    <i className={`fa-solid ${icon}`} style={{ color: accent || '#00e5ff', fontSize: 14 }}></i> {title}
                </h2>
                <button onClick={onClose} style={{ color: '#3d5278', background: 'none', border: 'none', cursor: 'pointer', padding: 4 }}>
                    <FaXmark size={18} />
                </button>
            </div>
            {children}
        </motion.div>
    </motion.div>
);

const emptyPaymentForm = { orderId: '', amount: '', tax: '0', discount: '0', paymentMethod: 'cash', paymentStatus: 'pending', paidBy: '' };
const emptyInvoiceForm = { paymentId: '', customerName: '', customerEmail: '', subtotal: '', tax: '0', discount: '0', status: 'draft' };

const BillingPaymentManagement = () => {
    const [activeTab, setActiveTab] = useState('payments');
    const [payments, setPayments] = useState([]);
    const [invoices, setInvoices] = useState([]);
    const [orders, setOrders] = useState([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [showPaymentModal, setShowPaymentModal] = useState(false);
    const [showInvoiceModal, setShowInvoiceModal] = useState(false);
    const [showQrModal, setShowQrModal] = useState(false);
    const [editingPayment, setEditingPayment] = useState(null);
    const [editingInvoice, setEditingInvoice] = useState(null);
    const [paymentForm, setPaymentForm] = useState(emptyPaymentForm);
    const [invoiceForm, setInvoiceForm] = useState(emptyInvoiceForm);
    const [qrPreview, setQrPreview] = useState({ title: '', image: '' });

    useEffect(() => {
        fetchData();
    }, []);

    const fetchData = async () => {
        try {
            const [payRes, invRes, ordRes] = await Promise.all([
                API.get('/payments').catch(() => ({ data: [] })),
                API.get('/payments/invoices').catch(() => ({ data: [] })),
                API.get('/orders').catch(() => ({ data: [] }))
            ]);
            setPayments(payRes.data);
            setInvoices(invRes.data);
            setOrders(ordRes.data);
        } catch {
            toast.error('Failed to load billing data');
        } finally {
            setLoading(false);
        }
    };

    const validatePaymentForm = () => {
        if (!paymentForm.orderId) return 'Please select an order';
        if (!paymentForm.amount || parseFloat(paymentForm.amount) <= 0) return 'Amount must be greater than 0';
        if (parseFloat(paymentForm.tax || 0) < 0) return 'Tax cannot be negative';
        if (parseFloat(paymentForm.discount || 0) < 0) return 'Discount cannot be negative';
        if (parseFloat(paymentForm.amount || 0) + parseFloat(paymentForm.tax || 0) - parseFloat(paymentForm.discount || 0) <= 0) {
            return 'Total payment amount must be greater than 0';
        }
        return '';
    };

    const validateInvoiceForm = () => {
        if (!invoiceForm.paymentId) return 'Please select a payment';
        if (!invoiceForm.customerName.trim()) return 'Customer name is required';
        if (invoiceForm.customerEmail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(invoiceForm.customerEmail)) return 'Customer email is invalid';
        if (!invoiceForm.subtotal || parseFloat(invoiceForm.subtotal) <= 0) return 'Subtotal must be greater than 0';
        if (parseFloat(invoiceForm.tax || 0) < 0) return 'Tax cannot be negative';
        if (parseFloat(invoiceForm.discount || 0) < 0) return 'Discount cannot be negative';
        if (parseFloat(invoiceForm.subtotal || 0) + parseFloat(invoiceForm.tax || 0) - parseFloat(invoiceForm.discount || 0) <= 0) {
            return 'Grand total must be greater than 0';
        }
        return '';
    };

    const selectOrder = async (orderId) => {
        setPaymentForm((current) => ({ ...current, orderId }));
        if (!orderId) return;
        try {
            const response = await API.get(`/payments/order/${orderId}`);
            setPaymentForm((current) => ({
                ...current,
                orderId,
                amount: parseFloat(response.data.totalAmount || 0).toFixed(2),
                paidBy: response.data.customerName || ''
            }));
        } catch {
            toast.error('Failed to load order details');
        }
    };

    const selectPayment = (paymentId) => {
        const payment = payments.find((item) => String(item.id) === String(paymentId));
        if (!payment) {
            setInvoiceForm((current) => ({ ...current, paymentId }));
            return;
        }

        const linkedOrder = orders.find((item) => item.id === payment.orderId);
        setInvoiceForm((current) => ({
            ...current,
            paymentId,
            customerName: linkedOrder?.customerName || current.customerName,
            customerEmail: linkedOrder?.customerEmail || current.customerEmail,
            subtotal: parseFloat(payment.amount || 0).toFixed(2),
            tax: parseFloat(payment.tax || 0).toFixed(2),
            discount: parseFloat(payment.discount || 0).toFixed(2)
        }));
    };

    const handlePaymentSubmit = async (e) => {
        e.preventDefault();
        const errorMessage = validatePaymentForm();
        if (errorMessage) {
            toast.error(errorMessage);
            return;
        }

        const payload = {
            orderId: parseInt(paymentForm.orderId, 10),
            amount: parseFloat(paymentForm.amount),
            tax: parseFloat(paymentForm.tax || 0),
            discount: parseFloat(paymentForm.discount || 0),
            paymentMethod: paymentForm.paymentMethod,
            paymentStatus: paymentForm.paymentStatus,
            paidBy: paymentForm.paidBy
        };

        try {
            if (editingPayment) {
                await API.put(`/payments/${editingPayment.id}`, payload);
                toast.success('Payment updated');
            } else {
                await API.post('/payments', payload);
                toast.success('Payment created');
            }
            setShowPaymentModal(false);
            setEditingPayment(null);
            setPaymentForm(emptyPaymentForm);
            fetchData();
        } catch (error) {
            toast.error(error.response?.data?.message || 'Failed to save payment');
        }
    };

    const handleInvoiceSubmit = async (e) => {
        e.preventDefault();
        const errorMessage = validateInvoiceForm();
        if (errorMessage) {
            toast.error(errorMessage);
            return;
        }

        const payload = {
            paymentId: parseInt(invoiceForm.paymentId, 10),
            customerName: invoiceForm.customerName.trim(),
            customerEmail: invoiceForm.customerEmail.trim(),
            subtotal: parseFloat(invoiceForm.subtotal),
            tax: parseFloat(invoiceForm.tax || 0),
            discount: parseFloat(invoiceForm.discount || 0),
            status: invoiceForm.status
        };

        try {
            if (editingInvoice) {
                await API.put(`/payments/invoices/${editingInvoice.id}`, payload);
                toast.success('Invoice updated');
            } else {
                await API.post('/payments/invoices', payload);
                toast.success('Invoice created');
            }
            setShowInvoiceModal(false);
            setEditingInvoice(null);
            setInvoiceForm(emptyInvoiceForm);
            fetchData();
        } catch (error) {
            toast.error(error.response?.data?.message || 'Failed to save invoice');
        }
    };

    const handleDelete = async (id, type) => {
        if (!confirm(`Delete this ${type}?`)) return;
        try {
            await API.delete(`/payments${type === 'invoice' ? '/invoices' : ''}/${id}`);
            toast.success(`${type} deleted`);
            fetchData();
        } catch {
            toast.error('Failed to delete item');
        }
    };

    const openPaymentEdit = (payment) => {
        setEditingPayment(payment);
        setPaymentForm({
            orderId: String(payment.orderId),
            amount: String(payment.amount),
            tax: String(payment.tax ?? 0),
            discount: String(payment.discount ?? 0),
            paymentMethod: payment.paymentMethod,
            paymentStatus: payment.paymentStatus,
            paidBy: payment.paidBy || ''
        });
        setShowPaymentModal(true);
    };

    const openInvoiceEdit = (invoice) => {
        setEditingInvoice(invoice);
        setInvoiceForm({
            paymentId: String(invoice.paymentId),
            customerName: invoice.customerName,
            customerEmail: invoice.customerEmail || '',
            subtotal: String(invoice.subtotal),
            tax: String(invoice.tax ?? 0),
            discount: String(invoice.discount ?? 0),
            status: invoice.status
        });
        setShowInvoiceModal(true);
    };

    const openNewPayment = () => {
        setEditingPayment(null);
        setPaymentForm(emptyPaymentForm);
        setShowPaymentModal(true);
    };

    const openNewInvoice = () => {
        setEditingInvoice(null);
        setInvoiceForm(emptyInvoiceForm);
        setShowInvoiceModal(true);
    };

    const previewInvoiceQr = async (invoice) => {
        try {
            const response = await API.get(`/payments/invoices/${invoice.id}/qr`);
            setQrPreview({ title: invoice.invoiceNumber, image: response.data.qrDataUrl });
            setShowQrModal(true);
        } catch {
            toast.error('Failed to load invoice QR');
        }
    };

    const emailInvoice = async (invoice) => {
        try {
            await API.post(`/payments/invoices/${invoice.id}/send-email`);
            toast.success('Invoice email sent');
            fetchData();
        } catch (error) {
            toast.error(error.response?.data?.message || 'Failed to send invoice email');
        }
    };

    const downloadReport = async () => {
        try {
            if (activeTab === 'payments') {
                await downloadApiFile('/payments/export/file', 'payments-report.xlsx');
            } else {
                await downloadApiFile('/payments/invoices/export/file', 'invoices-report.xlsx');
            }
            toast.success('Report downloaded');
        } catch {
            toast.error('Failed to download report');
        }
    };

    const downloadReportPdf = async () => {
        try {
            if (activeTab === 'payments') {
                await downloadApiFile('/payments/export/pdf', 'payments-report.pdf');
            } else {
                await downloadApiFile('/payments/invoices/export/pdf', 'invoices-report.pdf');
            }
            toast.success('PDF report downloaded');
        } catch {
            toast.error('Failed to download PDF report');
        }
    };

    const downloadInvoicePdf = async (invoice) => {
        try {
            await downloadApiFile(`/payments/invoices/${invoice.id}/pdf`, `${invoice.invoiceNumber}.pdf`);
            toast.success('Invoice PDF downloaded');
        } catch {
            toast.error('Failed to download invoice PDF');
        }
    };

    const filteredPayments = payments.filter((payment) =>
        payment.paymentNumber?.toLowerCase().includes(search.toLowerCase())
        || payment.paymentMethod?.toLowerCase().includes(search.toLowerCase())
        || payment.paymentStatus?.toLowerCase().includes(search.toLowerCase())
    );
    const filteredInvoices = invoices.filter((invoice) =>
        invoice.invoiceNumber?.toLowerCase().includes(search.toLowerCase())
        || invoice.customerName?.toLowerCase().includes(search.toLowerCase())
    );

    const totalRevenue = payments
        .filter((payment) => payment.paymentStatus === 'completed')
        .reduce((sum, payment) => sum + parseFloat(payment.totalAmount || 0), 0);
    const completedPayments = payments.filter((payment) => payment.paymentStatus === 'completed').length;
    const pendingInvoices = invoices.filter((invoice) => invoice.status === 'draft').length;

    const payStatusBadge = (status) => ({ completed: 'badge-success', failed: 'badge-danger', pending: 'badge-warning', refunded: 'badge-info' }[status] || 'badge-muted');
    const invStatusBadge = (status) => ({ paid: 'badge-success', draft: 'badge-warning', sent: 'badge-info', cancelled: 'badge-danger' }[status] || 'badge-muted');

    return (
        <div style={{ fontFamily: "'Inter', sans-serif" }}>
            <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="page-header">
                <div>
                    <h1 className="page-title"><i className="fa-solid fa-credit-card" style={{ color: '#10b981', marginRight: 10 }}></i>Billing &amp; Payments</h1>
                    <p className="page-subtitle">Manage payments, invoices, exports, and customer email actions</p>
                </div>
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                    <button onClick={downloadReport} className="btn-neon-cyan">
                        <FaDownload style={{ fontSize: 12 }} /> Excel {activeTab === 'payments' ? 'Report' : 'Report'}
                    </button>
                    <button onClick={downloadReportPdf} className="btn-neon-cyan">
                        <FaDownload style={{ fontSize: 12 }} /> PDF {activeTab === 'payments' ? 'Report' : 'Report'}
                    </button>
                    <button onClick={activeTab === 'payments' ? openNewPayment : openNewInvoice} className="btn-solid-cyan">
                        <FaPlus style={{ fontSize: 12 }} /> New {activeTab === 'payments' ? 'Payment' : 'Invoice'}
                    </button>
                </div>
            </motion.div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1rem', marginBottom: '1.5rem' }}>
                {[
                    { label: 'Total Revenue', value: `LKR ${totalRevenue.toFixed(2)}`, icon: 'fa-chart-line', color: '#10b981' },
                    { label: 'Completed Payments', value: completedPayments, icon: 'fa-circle-check', color: '#00e5ff' },
                    { label: 'Draft Invoices', value: pendingInvoices, icon: 'fa-clock', color: '#f59e0b' }
                ].map((item, index) => (
                    <motion.div key={item.label} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: index * 0.07 }} className="stat-card" style={{ borderColor: `${item.color}18` }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: '0.75rem' }}>
                            <div style={{ width: 34, height: 34, borderRadius: 8, background: `${item.color}15`, border: `1px solid ${item.color}25`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                <i className={`fa-solid ${item.icon}`} style={{ color: item.color, fontSize: 13 }}></i>
                            </div>
                            <span style={{ fontSize: '0.72rem', color: '#6b84b0', textTransform: 'uppercase', letterSpacing: '0.07em', fontWeight: 700 }}>{item.label}</span>
                        </div>
                        <p style={{ fontFamily: "'Rajdhani', sans-serif", fontSize: '1.5rem', fontWeight: 700, color: '#e2eaf7' }}>{item.value}</p>
                    </motion.div>
                ))}
            </div>

            <div className="section-card" style={{ marginBottom: '1.25rem' }}>
                <div style={{ padding: '0.875rem 1.25rem', display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 10 }}>
                    <div style={{ display: 'flex', background: 'rgba(0,0,0,0.3)', borderRadius: 8, padding: 3, border: '1px solid rgba(0,229,255,0.1)' }}>
                        {['payments', 'invoices'].map((tab) => (
                            <button
                                key={tab}
                                onClick={() => setActiveTab(tab)}
                                style={{ padding: '0.4rem 1rem', borderRadius: 6, fontSize: '0.8rem', fontWeight: 600, cursor: 'pointer', background: activeTab === tab ? 'rgba(0,229,255,0.12)' : 'transparent', border: activeTab === tab ? '1px solid rgba(0,229,255,0.25)' : '1px solid transparent', color: activeTab === tab ? '#00e5ff' : '#6b84b0', transition: 'all 0.2s' }}
                            >
                                {tab === 'payments' ? 'Payments' : 'Invoices'}
                            </button>
                        ))}
                    </div>
                    <div style={{ position: 'relative', flex: 1, minWidth: 180 }}>
                        <i className="fa-solid fa-magnifying-glass" style={{ position: 'absolute', left: '0.875rem', top: '50%', transform: 'translateY(-50%)', color: '#3d5278', fontSize: 12 }}></i>
                        <input type="text" value={search} onChange={(e) => setSearch(e.target.value)} placeholder={`Search ${activeTab}...`} className="input-dark" style={{ paddingLeft: '2.5rem', padding: '0.45rem 0.875rem 0.45rem 2.5rem' }} />
                    </div>
                </div>
            </div>

            {loading ? (
                <div style={{ display: 'flex', justifyContent: 'center', padding: '4rem 0' }}>
                    <div style={{ width: 36, height: 36, borderRadius: '50%', border: '2px solid rgba(16,185,129,0.2)', borderTopColor: '#10b981', animation: 'spin 0.8s linear infinite' }} />
                </div>
            ) : activeTab === 'payments' ? (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(270px, 1fr))', gap: '1rem' }}>
                    {filteredPayments.map((payment) => (
                        <div key={payment.id} style={{ background: 'rgba(13,21,38,0.7)', border: '1px solid rgba(16,185,129,0.12)', borderRadius: '0.875rem', overflow: 'hidden' }}>
                            <div style={{ padding: '1rem 1.125rem' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                                    <span style={{ fontSize: '0.72rem', color: '#3d5278', fontWeight: 600 }}>{payment.paymentNumber}</span>
                                    <span className={`badge ${payStatusBadge(payment.paymentStatus)}`}>{payment.paymentStatus}</span>
                                </div>
                                <p style={{ fontFamily: "'Rajdhani', sans-serif", fontSize: '1.5rem', fontWeight: 700, color: '#10b981', marginBottom: 8 }}>LKR {parseFloat(payment.totalAmount).toFixed(2)}</p>
                                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', fontSize: '0.77rem', color: '#6b84b0' }}>
                                    <span>Method: {payment.paymentMethod}</span>
                                    <span>Order #{payment.orderId}</span>
                                    <span>Paid by: {payment.paidBy || '-'}</span>
                                </div>
                            </div>
                            <div className="card-actions">
                                <button onClick={() => openPaymentEdit(payment)} className="btn-neon-cyan" style={{ padding: '0.28rem 0.7rem', fontSize: '0.7rem' }}>
                                    <i className="fa-solid fa-pen" style={{ fontSize: 10 }}></i> Edit
                                </button>
                                <button onClick={() => handleDelete(payment.id, 'payment')} className="btn-danger" style={{ padding: '0.28rem 0.7rem', fontSize: '0.7rem' }}>
                                    <i className="fa-solid fa-trash" style={{ fontSize: 10 }}></i> Delete
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
            ) : (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '1rem' }}>
                    {filteredInvoices.map((invoice) => (
                        <div key={invoice.id} style={{ background: 'rgba(13,21,38,0.7)', border: '1px solid rgba(168,85,247,0.12)', borderRadius: '0.875rem', overflow: 'hidden' }}>
                            <div style={{ padding: '1rem 1.125rem' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                                    <span style={{ fontFamily: "'Rajdhani', sans-serif", fontSize: '0.95rem', fontWeight: 700, color: '#a855f7' }}>{invoice.invoiceNumber}</span>
                                    <span className={`badge ${invStatusBadge(invoice.status)}`}>{invoice.status}</span>
                                </div>
                                <p style={{ fontSize: '0.82rem', color: '#c2d3f0', marginBottom: 6 }}>{invoice.customerName}</p>
                                <p style={{ fontFamily: "'Rajdhani', sans-serif", fontSize: '1.45rem', fontWeight: 700, color: '#e2eaf7' }}>LKR {parseFloat(invoice.grandTotal).toFixed(2)}</p>
                                <p style={{ fontSize: '0.72rem', color: '#6b84b0', marginTop: 8 }}>{invoice.customerEmail || 'No email saved'}</p>
                            </div>
                            <div className="card-actions" style={{ flexWrap: 'wrap', justifyContent: 'flex-start' }}>
                                <button onClick={() => downloadInvoicePdf(invoice)} style={{ display: 'inline-flex', alignItems: 'center', gap: 5, padding: '0.28rem 0.7rem', borderRadius: 6, fontSize: '0.7rem', fontWeight: 600, cursor: 'pointer', background: 'rgba(16,185,129,0.1)', border: '1px solid rgba(16,185,129,0.2)', color: '#10b981' }}>
                                    <FaDownload style={{ fontSize: 9 }} /> PDF
                                </button>
                                <button onClick={() => previewInvoiceQr(invoice)} className="btn-neon-cyan" style={{ padding: '0.28rem 0.7rem', fontSize: '0.7rem' }}>
                                    <FaQrcode style={{ fontSize: 10 }} /> QR
                                </button>
                                <button onClick={() => emailInvoice(invoice)} style={{ display: 'inline-flex', alignItems: 'center', gap: 5, padding: '0.28rem 0.7rem', borderRadius: 6, fontSize: '0.7rem', fontWeight: 600, cursor: 'pointer', background: 'rgba(245,158,11,0.1)', border: '1px solid rgba(245,158,11,0.2)', color: '#f59e0b' }}>
                                    <FaEnvelope style={{ fontSize: 10 }} /> Email
                                </button>
                                <button onClick={() => openInvoiceEdit(invoice)} className="btn-neon-cyan" style={{ padding: '0.28rem 0.7rem', fontSize: '0.7rem' }}>
                                    <i className="fa-solid fa-pen" style={{ fontSize: 10 }}></i> Edit
                                </button>
                                <button onClick={() => handleDelete(invoice.id, 'invoice')} className="btn-danger" style={{ padding: '0.28rem 0.7rem', fontSize: '0.7rem' }}>
                                    <i className="fa-solid fa-trash" style={{ fontSize: 10 }}></i> Delete
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            <AnimatePresence>
                {showPaymentModal && (
                    <ModalBox title={editingPayment ? 'Edit Payment' : 'New Payment'} icon="fa-credit-card" accent="rgba(16,185,129,0.2)" onClose={() => setShowPaymentModal(false)}>
                        <form onSubmit={handlePaymentSubmit} style={{ padding: '1.25rem 1.5rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                            <div>
                                <FieldLabel icon="fa-cart-shopping">Order</FieldLabel>
                                <select value={paymentForm.orderId} onChange={(e) => selectOrder(e.target.value)} required className="input-dark">
                                    <option value="">Select order</option>
                                    {orders.map((order) => (
                                        <option key={order.id} value={order.id}>{order.orderNumber} - {order.customerName}</option>
                                    ))}
                                </select>
                            </div>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                                <div>
                                    <FieldLabel icon="fa-coins">Amount</FieldLabel>
                                    <input type="number" min="0.01" step="0.01" value={paymentForm.amount} onChange={(e) => setPaymentForm({ ...paymentForm, amount: e.target.value })} className="input-dark" />
                                </div>
                                <div>
                                    <FieldLabel icon="fa-user">Paid By</FieldLabel>
                                    <input type="text" value={paymentForm.paidBy} onChange={(e) => setPaymentForm({ ...paymentForm, paidBy: e.target.value })} className="input-dark" />
                                </div>
                            </div>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                                <div>
                                    <FieldLabel icon="fa-percent">Tax</FieldLabel>
                                    <input type="number" min="0" step="0.01" value={paymentForm.tax} onChange={(e) => setPaymentForm({ ...paymentForm, tax: e.target.value })} className="input-dark" />
                                </div>
                                <div>
                                    <FieldLabel icon="fa-tag">Discount</FieldLabel>
                                    <input type="number" min="0" step="0.01" value={paymentForm.discount} onChange={(e) => setPaymentForm({ ...paymentForm, discount: e.target.value })} className="input-dark" />
                                </div>
                            </div>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                                <div>
                                    <FieldLabel icon="fa-wallet">Method</FieldLabel>
                                    <select value={paymentForm.paymentMethod} onChange={(e) => setPaymentForm({ ...paymentForm, paymentMethod: e.target.value })} className="input-dark">
                                        <option value="cash">Cash</option>
                                        <option value="card">Card</option>
                                        <option value="online">Online</option>
                                    </select>
                                </div>
                                <div>
                                    <FieldLabel icon="fa-circle-dot">Status</FieldLabel>
                                    <select value={paymentForm.paymentStatus} onChange={(e) => setPaymentForm({ ...paymentForm, paymentStatus: e.target.value })} className="input-dark">
                                        <option value="pending">Pending</option>
                                        <option value="completed">Completed</option>
                                        <option value="refunded">Refunded</option>
                                        <option value="failed">Failed</option>
                                    </select>
                                </div>
                            </div>
                            <div style={{ background: 'rgba(16,185,129,0.06)', border: '1px solid rgba(16,185,129,0.15)', borderRadius: 8, padding: '0.75rem', display: 'flex', justifyContent: 'space-between' }}>
                                <span style={{ color: '#6b84b0', fontSize: '0.8rem' }}>Total</span>
                                <span style={{ fontFamily: "'Rajdhani', sans-serif", fontWeight: 700, color: '#10b981' }}>
                                    LKR {(parseFloat(paymentForm.amount || 0) + parseFloat(paymentForm.tax || 0) - parseFloat(paymentForm.discount || 0)).toFixed(2)}
                                </span>
                            </div>
                            <div style={{ display: 'flex', gap: 10 }}>
                                <button type="button" onClick={() => setShowPaymentModal(false)} className="btn-neon-cyan" style={{ flex: 1, justifyContent: 'center' }}>Cancel</button>
                                <button type="submit" className="btn-solid-cyan" style={{ flex: 1, justifyContent: 'center' }}>{editingPayment ? 'Update' : 'Create'} Payment</button>
                            </div>
                        </form>
                    </ModalBox>
                )}
            </AnimatePresence>

            <AnimatePresence>
                {showInvoiceModal && (
                    <ModalBox title={editingInvoice ? 'Edit Invoice' : 'New Invoice'} icon="fa-file-invoice" accent="rgba(168,85,247,0.2)" onClose={() => setShowInvoiceModal(false)}>
                        <form onSubmit={handleInvoiceSubmit} style={{ padding: '1.25rem 1.5rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                                <div>
                                    <FieldLabel icon="fa-credit-card">Payment</FieldLabel>
                                    <select value={invoiceForm.paymentId} onChange={(e) => selectPayment(e.target.value)} required className="input-dark">
                                        <option value="">Select payment</option>
                                        {payments.map((payment) => (
                                            <option key={payment.id} value={payment.id}>{payment.paymentNumber} - LKR {parseFloat(payment.totalAmount).toFixed(2)}</option>
                                        ))}
                                    </select>
                                </div>
                                <div>
                                    <FieldLabel icon="fa-circle-dot">Status</FieldLabel>
                                    <select value={invoiceForm.status} onChange={(e) => setInvoiceForm({ ...invoiceForm, status: e.target.value })} className="input-dark">
                                        <option value="draft">Draft</option>
                                        <option value="sent">Sent</option>
                                        <option value="paid">Paid</option>
                                        <option value="cancelled">Cancelled</option>
                                    </select>
                                </div>
                            </div>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                                <div>
                                    <FieldLabel icon="fa-user">Customer Name</FieldLabel>
                                    <input type="text" value={invoiceForm.customerName} onChange={(e) => setInvoiceForm({ ...invoiceForm, customerName: e.target.value })} className="input-dark" />
                                </div>
                                <div>
                                    <FieldLabel icon="fa-envelope">Customer Email</FieldLabel>
                                    <input type="email" value={invoiceForm.customerEmail} onChange={(e) => setInvoiceForm({ ...invoiceForm, customerEmail: e.target.value })} className="input-dark" />
                                </div>
                            </div>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '0.75rem' }}>
                                <div>
                                    <FieldLabel icon="fa-coins">Subtotal</FieldLabel>
                                    <input type="number" min="0.01" step="0.01" value={invoiceForm.subtotal} onChange={(e) => setInvoiceForm({ ...invoiceForm, subtotal: e.target.value })} className="input-dark" />
                                </div>
                                <div>
                                    <FieldLabel icon="fa-percent">Tax</FieldLabel>
                                    <input type="number" min="0" step="0.01" value={invoiceForm.tax} onChange={(e) => setInvoiceForm({ ...invoiceForm, tax: e.target.value })} className="input-dark" />
                                </div>
                                <div>
                                    <FieldLabel icon="fa-tag">Discount</FieldLabel>
                                    <input type="number" min="0" step="0.01" value={invoiceForm.discount} onChange={(e) => setInvoiceForm({ ...invoiceForm, discount: e.target.value })} className="input-dark" />
                                </div>
                            </div>
                            <div style={{ background: 'rgba(168,85,247,0.06)', border: '1px solid rgba(168,85,247,0.15)', borderRadius: 8, padding: '0.75rem', display: 'flex', justifyContent: 'space-between' }}>
                                <span style={{ color: '#6b84b0', fontSize: '0.8rem' }}>Grand Total</span>
                                <span style={{ fontFamily: "'Rajdhani', sans-serif", fontWeight: 700, color: '#a855f7' }}>
                                    LKR {(parseFloat(invoiceForm.subtotal || 0) + parseFloat(invoiceForm.tax || 0) - parseFloat(invoiceForm.discount || 0)).toFixed(2)}
                                </span>
                            </div>
                            <div style={{ display: 'flex', gap: 10 }}>
                                <button type="button" onClick={() => setShowInvoiceModal(false)} className="btn-neon-cyan" style={{ flex: 1, justifyContent: 'center' }}>Cancel</button>
                                <button type="submit" className="btn-solid-cyan" style={{ flex: 1, justifyContent: 'center' }}>{editingInvoice ? 'Update' : 'Create'} Invoice</button>
                            </div>
                        </form>
                    </ModalBox>
                )}
            </AnimatePresence>

            <AnimatePresence>
                {showQrModal && (
                    <ModalBox title={`QR Preview - ${qrPreview.title}`} icon="fa-qrcode" accent="rgba(0,229,255,0.2)" onClose={() => setShowQrModal(false)}>
                        <div style={{ padding: '1.5rem', textAlign: 'center' }}>
                            <img src={qrPreview.image} alt="QR preview" style={{ width: 240, height: 240, borderRadius: 12, background: '#fff', padding: 12 }} />
                        </div>
                    </ModalBox>
                )}
            </AnimatePresence>
        </div>
    );
};

export default BillingPaymentManagement;

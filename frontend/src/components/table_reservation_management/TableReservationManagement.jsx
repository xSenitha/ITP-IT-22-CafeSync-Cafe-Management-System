import { useEffect, useMemo, useState } from 'react';
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

const ModalBox = ({ title, icon, onClose, children }) => (
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
            style={{ background: '#0d1526', border: '1px solid rgba(168,85,247,0.2)', borderRadius: '1.25rem', width: '100%', maxWidth: 560, maxHeight: '90vh', overflowY: 'auto', boxShadow: '0 0 60px rgba(168,85,247,0.1)' }}
        >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '1.25rem 1.5rem', borderBottom: '1px solid rgba(168,85,247,0.1)', background: 'rgba(168,85,247,0.03)' }}>
                <h2 style={{ fontFamily: "'Rajdhani', sans-serif", fontSize: '1.15rem', fontWeight: 700, color: '#e2eaf7', display: 'flex', alignItems: 'center', gap: 8 }}>
                    <i className={`fa-solid ${icon}`} style={{ color: '#a855f7', fontSize: 14 }}></i> {title}
                </h2>
                <button onClick={onClose} style={{ color: '#3d5278', background: 'none', border: 'none', cursor: 'pointer', padding: 4 }}>
                    <FaXmark size={18} />
                </button>
            </div>
            {children}
        </motion.div>
    </motion.div>
);

const emptyTableForm = { tableNumber: '', seatingCapacity: '', location: 'indoor', status: 'available', description: '' };
const emptyReservationForm = { customerName: '', customerPhone: '', customerEmail: '', partySize: '', reservationDate: '', reservationTime: '', duration: '60', status: 'confirmed', tableId: '', specialRequests: '' };

const reservationBadgeClass = (status) => ({
    confirmed: 'badge-success',
    pending: 'badge-warning',
    cancelled: 'badge-danger',
    completed: 'badge-info',
    no_show: 'badge-muted'
}[status] || 'badge-muted');

const tableStatusMeta = {
    available: { color: '#10b981', border: 'rgba(16,185,129,0.3)', glow: 'rgba(16,185,129,0.16)', badge: 'badge-success', label: 'Available' },
    reserved: { color: '#f59e0b', border: 'rgba(245,158,11,0.3)', glow: 'rgba(245,158,11,0.14)', badge: 'badge-warning', label: 'Reserved' },
    occupied: { color: '#ef4444', border: 'rgba(239,68,68,0.3)', glow: 'rgba(239,68,68,0.14)', badge: 'badge-danger', label: 'Occupied' },
    maintenance: { color: '#64748b', border: 'rgba(100,116,139,0.3)', glow: 'rgba(100,116,139,0.14)', badge: 'badge-muted', label: 'Maintenance' }
};

const locationMeta = {
    indoor: { title: 'Indoor Hall', icon: 'fa-mug-hot', accent: '#00e5ff', note: 'Main guest area near service desk' },
    outdoor: { title: 'Garden Deck', icon: 'fa-tree', accent: '#10b981', note: 'Open-air seating for casual dining' },
    vip: { title: 'VIP Lounge', icon: 'fa-crown', accent: '#f59e0b', note: 'Private high-priority guest zone' },
    balcony: { title: 'Balcony View', icon: 'fa-mountain-city', accent: '#a855f7', note: 'Quiet upper-level seating space' }
};

const getTodayString = () => {
    const today = new Date();
    const year = today.getFullYear();
    const month = String(today.getMonth() + 1).padStart(2, '0');
    const day = String(today.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
};

const formatDisplayDate = (dateValue) => {
    if (!dateValue) return 'Selected day';
    return new Date(`${dateValue}T00:00:00`).toLocaleDateString('en-LK', {
        weekday: 'short',
        month: 'short',
        day: 'numeric',
        year: 'numeric'
    });
};

const formatTime = (timeValue) => String(timeValue || '').slice(0, 5);
const getManualTableStatus = (table) => table?.manualStatus || table?.status || 'available';

const TableReservationManagement = () => {
    const [activeTab, setActiveTab] = useState('tables');
    const [tables, setTables] = useState([]);
    const [reservations, setReservations] = useState([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [selectedDate, setSelectedDate] = useState(getTodayString());
    const [locationFilter, setLocationFilter] = useState('all');
    const [selectedTableId, setSelectedTableId] = useState('');
    const [showTableModal, setShowTableModal] = useState(false);
    const [showReservationModal, setShowReservationModal] = useState(false);
    const [showQrModal, setShowQrModal] = useState(false);
    const [editingTable, setEditingTable] = useState(null);
    const [editingReservation, setEditingReservation] = useState(null);
    const [tableForm, setTableForm] = useState(emptyTableForm);
    const [reservationForm, setReservationForm] = useState({ ...emptyReservationForm, reservationDate: getTodayString() });
    const [reservationTableOptions, setReservationTableOptions] = useState([]);
    const [qrPreview, setQrPreview] = useState({ title: '', image: '' });

    useEffect(() => {
        fetchData(selectedDate);
    }, [selectedDate]);

    useEffect(() => {
        if (!showReservationModal) return;
        fetchReservationTableOptions(reservationForm.reservationDate || selectedDate);
    }, [showReservationModal, reservationForm.reservationDate, selectedDate]);

    const fetchData = async (dateValue) => {
        setLoading(true);
        try {
            const [tablesRes, reservationsRes] = await Promise.all([
                API.get(`/tables/tables?date=${dateValue}`).catch(() => ({ data: [] })),
                API.get(`/tables/reservations?date=${dateValue}`).catch(() => ({ data: [] }))
            ]);
            setTables(tablesRes.data);
            setReservations(reservationsRes.data);
        } catch {
            toast.error('Failed to load table and reservation data');
        } finally {
            setLoading(false);
        }
    };

    const fetchReservationTableOptions = async (dateValue) => {
        try {
            const response = await API.get(`/tables/tables?date=${dateValue}`);
            setReservationTableOptions(response.data);
        } catch {
            setReservationTableOptions([]);
        }
    };

    useEffect(() => {
        if (!tables.length) {
            setSelectedTableId('');
            return;
        }

        const hasSelectedTable = tables.some((table) => String(table.id) === String(selectedTableId));
        if (!hasSelectedTable) {
            setSelectedTableId(String(tables[0].id));
        }
    }, [tables, selectedTableId]);

    const validateTableForm = () => {
        if (!tableForm.tableNumber || parseInt(tableForm.tableNumber, 10) < 1) return 'Table number must be positive';
        if (!tableForm.seatingCapacity || parseInt(tableForm.seatingCapacity, 10) < 1) return 'Seating capacity must be at least 1';
        if (tableForm.description && tableForm.description.length > 255) return 'Description is too long';
        return '';
    };

    const validateReservationForm = () => {
        if (!reservationForm.customerName.trim()) return 'Customer name is required';
        if (!/^\+?\d{9,15}$/.test(reservationForm.customerPhone.replace(/\s/g, ''))) return 'Customer phone number must contain 9 to 15 digits';
        if (reservationForm.customerEmail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(reservationForm.customerEmail)) return 'Customer email is invalid';
        if (!reservationForm.partySize || parseInt(reservationForm.partySize, 10) < 1) return 'Party size must be at least 1';
        if (!reservationForm.tableId) return 'Please select a table';
        const selectedTable = reservationTableOptions.find((table) => String(table.id) === String(reservationForm.tableId));
        if (selectedTable && parseInt(reservationForm.partySize, 10) > selectedTable.seatingCapacity) return 'Party size exceeds selected table capacity';
        if (!reservationForm.reservationDate) return 'Reservation date is required';
        if (new Date(`${reservationForm.reservationDate}T00:00:00`) < new Date(`${getTodayString()}T00:00:00`)) return 'Reservation date cannot be in the past';
        if (!reservationForm.reservationTime) return 'Reservation time is required';
        if (!reservationForm.duration || parseInt(reservationForm.duration, 10) < 15) return 'Duration must be at least 15 minutes';
        if (reservationForm.specialRequests && reservationForm.specialRequests.length > 500) return 'Special requests are too long';
        return '';
    };

    const handleTableSubmit = async (e) => {
        e.preventDefault();
        const errorMessage = validateTableForm();
        if (errorMessage) {
            toast.error(errorMessage);
            return;
        }

        try {
            const payload = {
                ...tableForm,
                tableNumber: parseInt(tableForm.tableNumber, 10),
                seatingCapacity: parseInt(tableForm.seatingCapacity, 10)
            };

            if (editingTable) {
                await API.put(`/tables/tables/${editingTable.id}`, payload);
                toast.success('Table updated');
            } else {
                await API.post('/tables/tables', payload);
                toast.success('Table added');
            }
            setShowTableModal(false);
            setEditingTable(null);
            setTableForm(emptyTableForm);
            fetchData(selectedDate);
        } catch (error) {
            toast.error(error.response?.data?.message || 'Failed to save table');
        }
    };

    const handleReservationSubmit = async (e) => {
        e.preventDefault();
        const errorMessage = validateReservationForm();
        if (errorMessage) {
            toast.error(errorMessage);
            return;
        }

        const payload = {
            ...reservationForm,
            partySize: parseInt(reservationForm.partySize, 10),
            duration: parseInt(reservationForm.duration, 10),
            tableId: parseInt(reservationForm.tableId, 10),
            customerName: reservationForm.customerName.trim(),
            customerPhone: reservationForm.customerPhone.replace(/\s/g, ''),
            customerEmail: reservationForm.customerEmail.trim(),
            specialRequests: reservationForm.specialRequests.trim()
        };

        try {
            if (editingReservation) {
                await API.put(`/tables/reservations/${editingReservation.id}`, payload);
                toast.success('Reservation updated');
            } else {
                await API.post('/tables/reservations', payload);
                toast.success('Reservation created');
            }
            setShowReservationModal(false);
            setEditingReservation(null);
            setReservationForm({ ...emptyReservationForm, reservationDate: selectedDate });
            fetchData(selectedDate);
        } catch (error) {
            toast.error(error.response?.data?.message || 'Failed to save reservation');
        }
    };

    const handleDelete = async (id, type) => {
        if (!confirm(`Delete this ${type}?`)) return;
        try {
            await API.delete(`/tables/${type === 'table' ? 'tables' : 'reservations'}/${id}`);
            toast.success(`${type} deleted`);
            fetchData(selectedDate);
        } catch {
            toast.error('Failed to delete item');
        }
    };

    const previewReservationQr = async (reservation) => {
        try {
            const response = await API.get(`/tables/reservations/${reservation.id}/qr`);
            setQrPreview({ title: reservation.reservationNumber, image: response.data.qrDataUrl });
            setShowQrModal(true);
        } catch {
            toast.error('Failed to load reservation QR');
        }
    };

    const emailReservation = async (reservation) => {
        try {
            await API.post(`/tables/reservations/${reservation.id}/send-email`);
            toast.success('Reservation email sent');
        } catch (error) {
            toast.error(error.response?.data?.message || 'Failed to send reservation email');
        }
    };

    const exportReservations = async () => {
        try {
            await downloadApiFile('/tables/reservations/export/file', 'reservations-report.xlsx');
            toast.success('Reservations report downloaded');
        } catch {
            toast.error('Failed to download reservation report');
        }
    };

    const exportReservationsPdf = async () => {
        try {
            await downloadApiFile('/tables/reservations/export/pdf', 'reservations-report.pdf');
            toast.success('Reservations PDF downloaded');
        } catch {
            toast.error('Failed to download reservation PDF');
        }
    };

    const exportTablesPdf = async () => {
        try {
            await downloadApiFile('/tables/tables/export/pdf', 'tables-report.pdf');
            toast.success('Tables PDF downloaded');
        } catch {
            toast.error('Failed to download tables PDF');
        }
    };

    const openEditTable = (table) => {
        setEditingTable(table);
        setTableForm({
            tableNumber: String(table.tableNumber),
            seatingCapacity: String(table.seatingCapacity),
            location: table.location,
            status: table.manualStatus || table.status || 'available',
            description: table.description || ''
        });
        setShowTableModal(true);
    };

    const openEditReservation = (reservation) => {
        setEditingReservation(reservation);
        setReservationForm({
            customerName: reservation.customerName,
            customerPhone: reservation.customerPhone,
            customerEmail: reservation.customerEmail || '',
            partySize: String(reservation.partySize),
            reservationDate: reservation.reservationDate?.split('T')[0] || reservation.reservationDate,
            reservationTime: formatTime(reservation.reservationTime),
            duration: String(reservation.duration || 60),
            status: reservation.status,
            tableId: String(reservation.tableId),
            specialRequests: reservation.specialRequests || ''
        });
        setShowReservationModal(true);
    };

    const openNewTable = () => {
        setEditingTable(null);
        setTableForm(emptyTableForm);
        setShowTableModal(true);
    };

    const openNewReservation = (table = null) => {
        setEditingReservation(null);
        setReservationForm({
            ...emptyReservationForm,
            reservationDate: selectedDate,
            tableId: table ? String(table.id) : ''
        });
        setShowReservationModal(true);
    };

    const filteredTables = useMemo(() => {
        return tables.filter((table) => {
            const matchesSearch =
                String(table.tableNumber).includes(search)
                || table.location?.toLowerCase().includes(search.toLowerCase())
                || table.description?.toLowerCase().includes(search.toLowerCase())
                || table.displayStatus?.toLowerCase().includes(search.toLowerCase());

            const matchesLocation = locationFilter === 'all' || table.location === locationFilter;
            return matchesSearch && matchesLocation;
        });
    }, [tables, search, locationFilter]);

    const filteredReservations = useMemo(() => {
        return reservations.filter((reservation) => {
            const matchesSearch =
                reservation.customerName?.toLowerCase().includes(search.toLowerCase())
                || reservation.reservationNumber?.toLowerCase().includes(search.toLowerCase())
                || String(reservation.table?.tableNumber || reservation.tableId).includes(search)
                || reservation.status?.toLowerCase().includes(search.toLowerCase());
            const matchesLocation = locationFilter === 'all' || reservation.table?.location === locationFilter;
            return matchesSearch && matchesLocation;
        });
    }, [reservations, search, locationFilter]);

    const selectedTable = filteredTables.find((table) => String(table.id) === String(selectedTableId)) || filteredTables[0] || null;
    const selectedTableManualStatus = selectedTable ? getManualTableStatus(selectedTable) : 'available';
    const selectedTableManualStatusMeta = tableStatusMeta[selectedTableManualStatus] || tableStatusMeta.available;
    const selectedTableShowsDerivedOccupied = !!selectedTable
        && selectedTable.displayStatus === 'occupied'
        && selectedTableManualStatus !== 'occupied'
        && selectedTable.hasActiveDineInOrder;

    const tableSummary = useMemo(() => ([
        { label: 'Tables in View', value: filteredTables.length, icon: 'fa-table-cells-large', color: '#00e5ff' },
        { label: 'Reserved on Day', value: filteredTables.filter((table) => table.displayStatus === 'reserved').length, icon: 'fa-calendar-check', color: '#f59e0b' },
        { label: 'Free on Day', value: filteredTables.filter((table) => table.displayStatus === 'available').length, icon: 'fa-circle-check', color: '#10b981' },
        { label: 'Reservations', value: filteredReservations.length, icon: 'fa-users', color: '#a855f7' }
    ]), [filteredTables, filteredReservations.length]);

    const floorSections = useMemo(() => {
        return Object.keys(locationMeta).map((locationKey) => ({
            key: locationKey,
            ...locationMeta[locationKey],
            tables: filteredTables.filter((table) => table.location === locationKey)
        }));
    }, [filteredTables]);

    const availableOptions = reservationTableOptions.filter((table) => (
        table.displayStatus === 'available' || String(table.id) === String(reservationForm.tableId)
    ));

    return (
        <div style={{ fontFamily: "'Inter', sans-serif" }}>
            <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} style={{ marginBottom: '1.25rem' }}>
                <div style={{ background: 'linear-gradient(135deg, rgba(12,20,36,0.96) 0%, rgba(15,23,42,0.92) 100%)', border: '1px solid rgba(0,229,255,0.1)', borderRadius: '1.25rem', padding: '1.35rem 1.4rem', position: 'relative', overflow: 'hidden' }}>
                    <div style={{ position: 'absolute', top: -80, right: -50, width: 260, height: 260, background: 'radial-gradient(circle, rgba(168,85,247,0.14) 0%, transparent 65%)', borderRadius: '50%' }} />
                    <div style={{ position: 'absolute', bottom: -90, left: -60, width: 280, height: 280, background: 'radial-gradient(circle, rgba(0,229,255,0.10) 0%, transparent 70%)', borderRadius: '50%' }} />
                    <div style={{ position: 'relative', zIndex: 1, display: 'flex', justifyContent: 'space-between', gap: '1rem', flexWrap: 'wrap' }}>
                        <div style={{ maxWidth: 620 }}>
                            <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, padding: '0.3rem 0.85rem', borderRadius: 99, background: 'rgba(168,85,247,0.08)', border: '1px solid rgba(168,85,247,0.18)', marginBottom: '0.9rem' }}>
                                <i className="fa-solid fa-hotel" style={{ color: '#a855f7', fontSize: 11 }}></i>
                                <span style={{ fontSize: '0.68rem', fontWeight: 700, color: '#a855f7', letterSpacing: '0.11em', textTransform: 'uppercase' }}>Dining Floor Control</span>
                            </div>
                            <h1 style={{ fontFamily: "'Rajdhani', sans-serif", fontSize: '1.7rem', fontWeight: 700, color: '#e2eaf7', marginBottom: 6 }}>
                                Tables &amp; Reservations for <span style={{ color: '#00e5ff' }}>{formatDisplayDate(selectedDate)}</span>
                            </h1>
                            <p style={{ color: '#6b84b0', fontSize: '0.84rem', lineHeight: 1.7 }}>
                                View the cafe floor by selected day, see which tables are free or reserved, and manage bookings from a more visual operations layout.
                            </p>
                        </div>

                        <div style={{ display: 'flex', gap: 8, alignItems: 'flex-start', flexWrap: 'wrap' }}>
                            {activeTab === 'reservations' && (
                                <>
                                    <button onClick={exportReservations} className="btn-neon-cyan">
                                        <FaDownload style={{ fontSize: 12 }} /> Reservations Excel
                                    </button>
                                    <button onClick={exportReservationsPdf} className="btn-neon-cyan">
                                        <FaDownload style={{ fontSize: 12 }} /> Reservations PDF
                                    </button>
                                </>
                            )}
                            {activeTab === 'tables' && (
                                <button onClick={exportTablesPdf} className="btn-neon-cyan">
                                    <FaDownload style={{ fontSize: 12 }} /> Tables PDF
                                </button>
                            )}
                            <button onClick={activeTab === 'tables' ? openNewTable : () => openNewReservation()} className="btn-solid-cyan">
                                <FaPlus style={{ fontSize: 12 }} /> Add {activeTab === 'tables' ? 'Table' : 'Reservation'}
                            </button>
                        </div>
                    </div>
                </div>
            </motion.div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '1rem', marginBottom: '1.25rem' }} className="grid-cols-1 md:grid-cols-2 xl:grid-cols-4">
                {tableSummary.map((item, index) => (
                    <motion.div key={item.label} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: index * 0.06 }} className="stat-card" style={{ borderColor: `${item.color}18` }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: '0.75rem' }}>
                            <div style={{ width: 36, height: 36, borderRadius: 10, background: `${item.color}15`, border: `1px solid ${item.color}25`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                <i className={`fa-solid ${item.icon}`} style={{ color: item.color, fontSize: 13 }}></i>
                            </div>
                            <span style={{ fontSize: '0.72rem', color: '#6b84b0', textTransform: 'uppercase', letterSpacing: '0.07em', fontWeight: 700 }}>{item.label}</span>
                        </div>
                        <p style={{ fontFamily: "'Rajdhani', sans-serif", fontSize: '2rem', fontWeight: 700, color: '#e2eaf7' }}>{item.value}</p>
                    </motion.div>
                ))}
            </div>

            <div className="section-card" style={{ marginBottom: '1.25rem' }}>
                <div style={{ padding: '0.95rem 1.2rem', display: 'grid', gridTemplateColumns: '1.15fr 0.9fr 0.9fr 1.2fr', gap: '0.85rem', alignItems: 'end' }} className="grid-cols-1 md:grid-cols-2 xl:grid-cols-4">
                    <div>
                        <FieldLabel icon="fa-layer-group">View Mode</FieldLabel>
                        <div style={{ display: 'flex', background: 'rgba(0,0,0,0.3)', borderRadius: 10, padding: 3, border: '1px solid rgba(168,85,247,0.15)' }}>
                            {['tables', 'reservations'].map((tab) => (
                                <button
                                    key={tab}
                                    onClick={() => setActiveTab(tab)}
                                    style={{ flex: 1, padding: '0.45rem 0.9rem', borderRadius: 8, fontSize: '0.8rem', fontWeight: 700, cursor: 'pointer', background: activeTab === tab ? 'rgba(168,85,247,0.12)' : 'transparent', border: activeTab === tab ? '1px solid rgba(168,85,247,0.3)' : '1px solid transparent', color: activeTab === tab ? '#a855f7' : '#6b84b0', transition: 'all 0.2s', textTransform: 'capitalize' }}
                                >
                                    {tab}
                                </button>
                            ))}
                        </div>
                    </div>

                    <div>
                        <FieldLabel icon="fa-calendar-day">Selected Date</FieldLabel>
                        <input type="date" value={selectedDate} onChange={(e) => setSelectedDate(e.target.value)} min={getTodayString()} className="input-dark" />
                    </div>

                    <div>
                        <FieldLabel icon="fa-location-dot">Area Filter</FieldLabel>
                        <select value={locationFilter} onChange={(e) => setLocationFilter(e.target.value)} className="input-dark">
                            <option value="all">All Areas</option>
                            <option value="indoor">Indoor</option>
                            <option value="outdoor">Outdoor</option>
                            <option value="vip">VIP</option>
                            <option value="balcony">Balcony</option>
                        </select>
                    </div>

                    <div>
                        <FieldLabel icon="fa-magnifying-glass">Search</FieldLabel>
                        <input type="text" value={search} onChange={(e) => setSearch(e.target.value)} placeholder={`Search ${activeTab}...`} className="input-dark" />
                    </div>
                </div>
            </div>

            {loading ? (
                <div style={{ display: 'flex', justifyContent: 'center', padding: '4rem 0' }}>
                    <div style={{ width: 36, height: 36, borderRadius: '50%', border: '2px solid rgba(168,85,247,0.2)', borderTopColor: '#a855f7', animation: 'spin 0.8s linear infinite' }} />
                </div>
            ) : activeTab === 'tables' ? (
                <div style={{ display: 'grid', gridTemplateColumns: 'minmax(330px, 0.95fr) minmax(420px, 1.25fr)', gap: '1.25rem' }} className="grid-cols-1 xl:grid-cols-[minmax(330px,0.95fr)_minmax(420px,1.25fr)]">
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                        <div className="section-card">
                            <div className="section-card-header">
                                <h3><i className="fa-solid fa-list-ul" style={{ color: '#00e5ff', marginRight: 8 }}></i> Table Directory</h3>
                                <span style={{ fontSize: '0.74rem', color: '#6b84b0' }}>{filteredTables.length} tables</span>
                            </div>
                            <div className="section-card-body" style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', maxHeight: 600, overflowY: 'auto' }}>
                                {filteredTables.length === 0 ? (
                                    <div style={{ textAlign: 'center', padding: '2.5rem 1rem', color: '#6b84b0' }}>
                                        No tables match the selected filters.
                                    </div>
                                ) : filteredTables.map((table) => {
                                    const status = tableStatusMeta[table.displayStatus] || tableStatusMeta.available;
                                    const manualStatus = getManualTableStatus(table);
                                    const manualStatusMeta = tableStatusMeta[manualStatus] || tableStatusMeta.available;
                                    const isDerivedOccupied = table.displayStatus === 'occupied' && manualStatus !== 'occupied' && table.hasActiveDineInOrder;
                                    const isSelected = String(selectedTableId) === String(table.id);
                                    return (
                                        <div
                                            key={table.id}
                                            role="button"
                                            tabIndex={0}
                                            onClick={() => setSelectedTableId(String(table.id))}
                                            onKeyDown={(event) => {
                                                if (event.key === 'Enter' || event.key === ' ') {
                                                    event.preventDefault();
                                                    setSelectedTableId(String(table.id));
                                                }
                                            }}
                                            style={{
                                                width: '100%',
                                                textAlign: 'left',
                                                background: isSelected ? 'rgba(0,229,255,0.07)' : 'rgba(13,21,38,0.78)',
                                                border: `1px solid ${isSelected ? 'rgba(0,229,255,0.25)' : status.border}`,
                                                borderRadius: '1rem',
                                                padding: '0.9rem',
                                                cursor: 'pointer',
                                                transition: 'all 0.2s'
                                            }}
                                        >
                                            <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, alignItems: 'flex-start' }}>
                                                <div style={{ display: 'flex', gap: 12 }}>
                                                    <div style={{ width: 42, height: 42, borderRadius: 12, background: status.glow, border: `1px solid ${status.border}`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                                                        <i className="fa-solid fa-chair" style={{ color: status.color, fontSize: 16 }}></i>
                                                    </div>
                                                    <div>
                                                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                                                            <span style={{ fontFamily: "'Rajdhani', sans-serif", fontSize: '1.2rem', fontWeight: 700, color: '#e2eaf7' }}>Table {table.tableNumber}</span>
                                                            <span className={`badge ${status.badge}`} style={{ fontSize: '0.62rem' }}>{status.label}</span>
                                                            {manualStatus !== table.displayStatus && (
                                                                <span className={`badge ${manualStatusMeta.badge}`} style={{ fontSize: '0.62rem' }}>
                                                                    Manual: {manualStatusMeta.label}
                                                                </span>
                                                            )}
                                                        </div>
                                                        <p style={{ fontSize: '0.75rem', color: '#6b84b0', marginTop: 4 }}>
                                                            {table.seatingCapacity} seats • {locationMeta[table.location]?.title || table.location}
                                                        </p>
                                                        {isDerivedOccupied && (
                                                            <p style={{ fontSize: '0.72rem', color: '#ef4444', marginTop: 4 }}>
                                                                Live dine-in order is keeping this table occupied right now.
                                                            </p>
                                                        )}
                                                        {table.activeReservation ? (
                                                            <p style={{ fontSize: '0.72rem', color: '#f59e0b', marginTop: 4 }}>
                                                                Reserved at {formatTime(table.activeReservation.reservationTime)} for {table.activeReservation.customerName}
                                                            </p>
                                                        ) : (
                                                            <p style={{ fontSize: '0.72rem', color: '#3d5278', marginTop: 4 }}>
                                                                No active reservation on {formatDisplayDate(selectedDate)}
                                                            </p>
                                                        )}
                                                    </div>
                                                </div>

                                                <div style={{ display: 'flex', gap: 6 }}>
                                                    <button
                                                        type="button"
                                                        onClick={(event) => { event.stopPropagation(); openEditTable(table); }}
                                                        className="btn-neon-cyan"
                                                        style={{ padding: '0.3rem 0.65rem', fontSize: '0.72rem' }}
                                                    >
                                                        <i className="fa-solid fa-pen" style={{ fontSize: 10 }}></i>
                                                    </button>
                                                    <button
                                                        type="button"
                                                        onClick={(event) => { event.stopPropagation(); handleDelete(table.id, 'table'); }}
                                                        className="btn-danger"
                                                        style={{ padding: '0.3rem 0.65rem', fontSize: '0.72rem' }}
                                                    >
                                                        <i className="fa-solid fa-trash" style={{ fontSize: 10 }}></i>
                                                    </button>
                                                </div>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>

                        <div className="section-card">
                            <div className="section-card-header">
                                <h3><i className="fa-solid fa-circle-info" style={{ color: '#a855f7', marginRight: 8 }}></i> Selected Table Details</h3>
                                {selectedTable && (
                                    <button onClick={() => openNewReservation(selectedTable)} className="btn-neon-cyan" style={{ padding: '0.35rem 0.75rem', fontSize: '0.75rem' }}>
                                        <FaPlus style={{ fontSize: 10 }} /> Book This Table
                                    </button>
                                )}
                            </div>
                            <div className="section-card-body">
                                {!selectedTable ? (
                                    <div style={{ padding: '2rem 1rem', textAlign: 'center', color: '#6b84b0' }}>
                                        Select a table to see its details.
                                    </div>
                                ) : (
                                    <>
                                        {(selectedTableManualStatus !== selectedTable.displayStatus || selectedTableShowsDerivedOccupied) && (
                                            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.45rem', background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 12, padding: '0.85rem', marginBottom: '1rem' }}>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                                                    <span style={{ fontSize: '0.72rem', color: '#6b84b0', textTransform: 'uppercase', letterSpacing: '0.08em', fontWeight: 700 }}>Manual status</span>
                                                    <span className={`badge ${selectedTableManualStatusMeta.badge}`}>{selectedTableManualStatusMeta.label}</span>
                                                    <span style={{ fontSize: '0.72rem', color: '#3d5278' }}>Live view</span>
                                                    <span className={`badge ${tableStatusMeta[selectedTable.displayStatus]?.badge || 'badge-muted'}`}>
                                                        {tableStatusMeta[selectedTable.displayStatus]?.label || selectedTable.displayStatus}
                                                    </span>
                                                </div>
                                                {selectedTableShowsDerivedOccupied && (
                                                    <p style={{ fontSize: '0.78rem', color: '#6b84b0', lineHeight: 1.6 }}>
                                                        This table has an active dine-in order, so the live floor view stays occupied until that order is completed or cancelled.
                                                    </p>
                                                )}
                                            </div>
                                        )}

                                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '0.75rem', marginBottom: '1rem' }} className="grid-cols-1 md:grid-cols-3">
                                            {[
                                                { label: 'Status', value: tableStatusMeta[selectedTable.displayStatus]?.label || selectedTable.displayStatus, icon: 'fa-signal', color: tableStatusMeta[selectedTable.displayStatus]?.color || '#6b84b0' },
                                                { label: 'Seats', value: `${selectedTable.seatingCapacity}`, icon: 'fa-users', color: '#00e5ff' },
                                                { label: 'Bookings', value: `${selectedTable.reservationCountForDate || 0}`, icon: 'fa-calendar-check', color: '#f59e0b' }
                                            ].map((item) => (
                                                <div key={item.label} style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 12, padding: '0.85rem' }}>
                                                    <p style={{ fontSize: '0.67rem', color: '#3d5278', textTransform: 'uppercase', letterSpacing: '0.08em', fontWeight: 700, marginBottom: 6 }}>
                                                        <i className={`fa-solid ${item.icon}`} style={{ color: item.color, fontSize: 10, marginRight: 5 }}></i>{item.label}
                                                    </p>
                                                    <p style={{ fontFamily: "'Rajdhani', sans-serif", fontSize: '1.25rem', fontWeight: 700, color: '#e2eaf7' }}>{item.value}</p>
                                                </div>
                                            ))}
                                        </div>

                                        <div style={{ background: 'rgba(7,11,20,0.55)', border: '1px solid rgba(168,85,247,0.1)', borderRadius: 12, padding: '0.95rem', marginBottom: '1rem' }}>
                                            <p style={{ fontSize: '0.72rem', color: '#6b84b0', marginBottom: 6 }}>Table Notes</p>
                                            <p style={{ color: '#c2d3f0', fontSize: '0.84rem', lineHeight: 1.7 }}>
                                                {selectedTable.description || 'No description added yet for this table. You can use the edit button to store location or service notes.'}
                                            </p>
                                        </div>

                                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.7rem' }}>
                                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12 }}>
                                                <h4 style={{ fontSize: '0.84rem', fontWeight: 700, color: '#e2eaf7' }}>Reservation Schedule</h4>
                                                <span style={{ fontSize: '0.72rem', color: '#6b84b0' }}>{formatDisplayDate(selectedDate)}</span>
                                            </div>

                                            {selectedTable.reservationsForDate?.length ? selectedTable.reservationsForDate.map((reservation) => (
                                                <div key={reservation.id} style={{ background: 'rgba(245,158,11,0.06)', border: '1px solid rgba(245,158,11,0.14)', borderRadius: 12, padding: '0.85rem' }}>
                                                    <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, alignItems: 'center', marginBottom: 6 }}>
                                                        <div>
                                                            <p style={{ fontSize: '0.82rem', fontWeight: 700, color: '#e2eaf7' }}>{reservation.customerName}</p>
                                                            <p style={{ fontSize: '0.72rem', color: '#6b84b0', marginTop: 3 }}>
                                                                {formatTime(reservation.reservationTime)} • {reservation.partySize} guests • {reservation.duration || 60} mins
                                                            </p>
                                                        </div>
                                                        <span className={`badge ${reservationBadgeClass(reservation.status)}`}>{reservation.status}</span>
                                                    </div>
                                                    <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                                                        <button onClick={() => previewReservationQr(reservation)} className="btn-neon-cyan" style={{ padding: '0.3rem 0.7rem', fontSize: '0.72rem' }}>
                                                            <FaQrcode style={{ fontSize: 10 }} /> QR
                                                        </button>
                                                        <button onClick={() => emailReservation(reservation)} style={{ display: 'inline-flex', alignItems: 'center', gap: 5, padding: '0.3rem 0.7rem', borderRadius: 6, fontSize: '0.72rem', fontWeight: 600, cursor: 'pointer', background: 'rgba(245,158,11,0.1)', border: '1px solid rgba(245,158,11,0.2)', color: '#f59e0b' }}>
                                                            <FaEnvelope style={{ fontSize: 10 }} /> Email
                                                        </button>
                                                        <button onClick={() => openEditReservation(reservation)} className="btn-neon-cyan" style={{ padding: '0.3rem 0.7rem', fontSize: '0.72rem' }}>
                                                            <i className="fa-solid fa-pen" style={{ fontSize: 10 }}></i> Edit
                                                        </button>
                                                    </div>
                                                </div>
                                            )) : (
                                                <div style={{ padding: '1.1rem', background: 'rgba(255,255,255,0.02)', border: '1px dashed rgba(255,255,255,0.08)', borderRadius: 12, color: '#6b84b0', fontSize: '0.8rem', textAlign: 'center' }}>
                                                    No reservations assigned to this table on the selected day.
                                                </div>
                                            )}
                                        </div>
                                    </>
                                )}
                            </div>
                        </div>
                    </div>

                    <div className="section-card">
                        <div className="section-card-header">
                            <h3><i className="fa-solid fa-map-location-dot" style={{ color: '#00e5ff', marginRight: 8 }}></i> Cafe Floor Flow</h3>
                            <span style={{ fontSize: '0.74rem', color: '#6b84b0' }}>Visual layout for {formatDisplayDate(selectedDate)}</span>
                        </div>
                        <div className="section-card-body">
                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '0.75rem', marginBottom: '1rem' }} className="grid-cols-1 md:grid-cols-3">
                                {[
                                    { label: 'Entrance', value: 'Front Access', icon: 'fa-door-open', color: '#00e5ff' },
                                    { label: 'Cashier', value: 'Service Desk', icon: 'fa-cash-register', color: '#f59e0b' },
                                    { label: 'Kitchen', value: 'Food Pass', icon: 'fa-fire-burner', color: '#ef4444' }
                                ].map((item) => (
                                    <div key={item.label} style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 12, padding: '0.85rem' }}>
                                        <p style={{ fontSize: '0.66rem', color: '#3d5278', textTransform: 'uppercase', letterSpacing: '0.08em', fontWeight: 700, marginBottom: 6 }}>
                                            <i className={`fa-solid ${item.icon}`} style={{ color: item.color, fontSize: 10, marginRight: 5 }}></i>{item.label}
                                        </p>
                                        <p style={{ fontSize: '0.82rem', color: '#c2d3f0', fontWeight: 600 }}>{item.value}</p>
                                    </div>
                                ))}
                            </div>

                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: '1rem' }} className="grid-cols-1 lg:grid-cols-2">
                                {floorSections.map((section) => (
                                    <div key={section.key} style={{ background: 'linear-gradient(180deg, rgba(8,12,22,0.92) 0%, rgba(11,16,28,0.82) 100%)', border: `1px solid ${section.accent}22`, borderRadius: '1rem', padding: '1rem', minHeight: 240, position: 'relative', overflow: 'hidden' }}>
                                        <div style={{ position: 'absolute', top: -20, right: -20, width: 120, height: 120, borderRadius: '50%', background: `radial-gradient(circle, ${section.accent}18 0%, transparent 70%)` }} />
                                        <div style={{ position: 'relative', zIndex: 1 }}>
                                            <div style={{ display: 'flex', justifyContent: 'space-between', gap: 10, alignItems: 'flex-start', marginBottom: '0.9rem' }}>
                                                <div>
                                                    <p style={{ fontSize: '0.72rem', color: section.accent, textTransform: 'uppercase', letterSpacing: '0.1em', fontWeight: 700, marginBottom: 6 }}>
                                                        <i className={`fa-solid ${section.icon}`} style={{ fontSize: 11, marginRight: 6 }}></i>{section.title}
                                                    </p>
                                                    <p style={{ fontSize: '0.74rem', color: '#6b84b0', lineHeight: 1.6 }}>{section.note}</p>
                                                </div>
                                                <span style={{ fontSize: '0.7rem', color: '#c2d3f0', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 99, padding: '0.2rem 0.6rem' }}>
                                                    {section.tables.length} tables
                                                </span>
                                            </div>

                                            {section.tables.length === 0 ? (
                                                <div style={{ borderRadius: 12, border: '1px dashed rgba(255,255,255,0.08)', minHeight: 140, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#3d5278', fontSize: '0.78rem' }}>
                                                    No tables in this section
                                                </div>
                                            ) : (
                                                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(105px, 1fr))', gap: '0.85rem' }}>
                                                    {section.tables.map((table) => {
                                                        const status = tableStatusMeta[table.displayStatus] || tableStatusMeta.available;
                                                        const isSelected = String(selectedTableId) === String(table.id);
                                                        return (
                                                            <button
                                                                key={table.id}
                                                                type="button"
                                                                onClick={() => setSelectedTableId(String(table.id))}
                                                                style={{ background: isSelected ? 'rgba(255,255,255,0.05)' : 'rgba(255,255,255,0.02)', border: `1px solid ${isSelected ? section.accent : status.border}`, borderRadius: 16, padding: '0.8rem 0.65rem', cursor: 'pointer', transition: 'all 0.2s' }}
                                                            >
                                                                <div style={{ position: 'relative', height: 70, display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 8 }}>
                                                                    {[
                                                                        { top: 6, left: '50%', transform: 'translateX(-50%)' },
                                                                        { bottom: 6, left: '50%', transform: 'translateX(-50%)' },
                                                                        { left: 10, top: '50%', transform: 'translateY(-50%)' },
                                                                        { right: 10, top: '50%', transform: 'translateY(-50%)' }
                                                                    ].map((seat, index) => (
                                                                        <span
                                                                            key={index}
                                                                            style={{ position: 'absolute', width: 10, height: 10, borderRadius: '50%', background: `${status.color}55`, boxShadow: `0 0 10px ${status.color}30`, ...seat }}
                                                                        />
                                                                    ))}
                                                                    <div style={{ width: 58, height: 40, borderRadius: 14, background: status.glow, border: `1px solid ${status.border}`, display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: `0 0 22px ${status.color}14 inset` }}>
                                                                        <span style={{ fontFamily: "'Rajdhani', sans-serif", fontSize: '1rem', fontWeight: 700, color: '#e2eaf7' }}>{table.tableNumber}</span>
                                                                    </div>
                                                                </div>
                                                                <p style={{ fontSize: '0.72rem', fontWeight: 700, color: '#c2d3f0', marginBottom: 4 }}>Table {table.tableNumber}</p>
                                                                <p style={{ fontSize: '0.68rem', color: '#6b84b0' }}>{table.seatingCapacity} seats</p>
                                                                <p style={{ fontSize: '0.66rem', color: status.color, marginTop: 4, fontWeight: 700 }}>{status.label}</p>
                                                            </button>
                                                        );
                                                    })}
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                ))}
                            </div>

                            <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', marginTop: '1rem' }}>
                                {Object.entries(tableStatusMeta).map(([key, value]) => (
                                    <div key={key} style={{ display: 'inline-flex', alignItems: 'center', gap: 7, fontSize: '0.74rem', color: '#c2d3f0' }}>
                                        <span style={{ width: 10, height: 10, borderRadius: '50%', background: value.color, boxShadow: `0 0 10px ${value.color}55` }} />
                                        {value.label}
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>
            ) : (
                <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1.2fr) minmax(320px, 0.8fr)', gap: '1.25rem' }} className="grid-cols-1 xl:grid-cols-[minmax(0,1.2fr)_minmax(320px,0.8fr)]">
                    <div className="section-card">
                        <div className="section-card-header">
                            <h3><i className="fa-solid fa-calendar-check" style={{ color: '#a855f7', marginRight: 8 }}></i> Reservation Board</h3>
                            <span style={{ fontSize: '0.74rem', color: '#6b84b0' }}>{filteredReservations.length} bookings for {formatDisplayDate(selectedDate)}</span>
                        </div>
                        <div className="section-card-body" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(290px, 1fr))', gap: '1rem' }}>
                            {filteredReservations.length === 0 ? (
                                <div style={{ gridColumn: '1 / -1', textAlign: 'center', padding: '3rem 1rem', color: '#6b84b0' }}>
                                    No reservations found for this day.
                                </div>
                            ) : filteredReservations.map((reservation) => (
                                <div key={reservation.id} style={{ background: 'rgba(13,21,38,0.7)', border: '1px solid rgba(168,85,247,0.12)', borderRadius: '1rem', overflow: 'hidden' }}>
                                    <div style={{ padding: '1rem 1.1rem' }}>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12, marginBottom: 12 }}>
                                            <div>
                                                <p style={{ fontSize: '0.92rem', fontWeight: 700, color: '#e2eaf7' }}>{reservation.customerName}</p>
                                                <p style={{ fontSize: '0.72rem', color: '#3d5278', marginTop: 4 }}>{reservation.reservationNumber}</p>
                                            </div>
                                            <span className={`badge ${reservationBadgeClass(reservation.status)}`}>{reservation.status}</span>
                                        </div>

                                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.65rem', marginBottom: '0.9rem' }}>
                                            {[
                                                { label: 'Time', value: formatTime(reservation.reservationTime), icon: 'fa-clock' },
                                                { label: 'Table', value: `#${reservation.table?.tableNumber || reservation.tableId}`, icon: 'fa-chair' },
                                                { label: 'Guests', value: `${reservation.partySize}`, icon: 'fa-users' },
                                                { label: 'Duration', value: `${reservation.duration || 60} min`, icon: 'fa-hourglass-half' }
                                            ].map((item) => (
                                                <div key={item.label} style={{ background: 'rgba(0,0,0,0.2)', borderRadius: 10, padding: '0.65rem 0.75rem' }}>
                                                    <p style={{ fontSize: '0.62rem', color: '#3d5278', textTransform: 'uppercase', letterSpacing: '0.07em', fontWeight: 700, marginBottom: 4 }}>
                                                        <i className={`fa-solid ${item.icon}`} style={{ fontSize: 9, marginRight: 4 }}></i>{item.label}
                                                    </p>
                                                    <p style={{ fontSize: '0.8rem', color: '#c2d3f0', fontWeight: 600 }}>{item.value}</p>
                                                </div>
                                            ))}
                                        </div>

                                        <div style={{ display: 'flex', flexDirection: 'column', gap: 5, fontSize: '0.78rem', color: '#6b84b0' }}>
                                            <span><i className="fa-solid fa-phone" style={{ marginRight: 6, color: '#3d5278' }}></i>{reservation.customerPhone}</span>
                                            {reservation.customerEmail && <span><i className="fa-solid fa-envelope" style={{ marginRight: 6, color: '#3d5278' }}></i>{reservation.customerEmail}</span>}
                                            {reservation.specialRequests && <span style={{ color: '#c2d3f0' }}><i className="fa-solid fa-note-sticky" style={{ marginRight: 6, color: '#3d5278' }}></i>{reservation.specialRequests}</span>}
                                        </div>
                                    </div>

                                    <div className="card-actions" style={{ flexWrap: 'wrap', justifyContent: 'flex-start' }}>
                                        <button onClick={() => previewReservationQr(reservation)} className="btn-neon-cyan" style={{ padding: '0.3rem 0.7rem', fontSize: '0.72rem' }}>
                                            <FaQrcode style={{ fontSize: 10 }} /> QR
                                        </button>
                                        <button onClick={() => emailReservation(reservation)} style={{ display: 'inline-flex', alignItems: 'center', gap: 5, padding: '0.3rem 0.7rem', borderRadius: 6, fontSize: '0.72rem', fontWeight: 600, cursor: 'pointer', background: 'rgba(245,158,11,0.1)', border: '1px solid rgba(245,158,11,0.2)', color: '#f59e0b' }}>
                                            <FaEnvelope style={{ fontSize: 10 }} /> Email
                                        </button>
                                        <button onClick={() => openEditReservation(reservation)} className="btn-neon-cyan" style={{ padding: '0.3rem 0.7rem', fontSize: '0.72rem' }}>
                                            <i className="fa-solid fa-pen" style={{ fontSize: 10 }}></i> Edit
                                        </button>
                                        <button onClick={() => handleDelete(reservation.id, 'reservation')} className="btn-danger" style={{ padding: '0.3rem 0.7rem', fontSize: '0.72rem' }}>
                                            <i className="fa-solid fa-trash" style={{ fontSize: 10 }}></i> Delete
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                        <div className="section-card">
                            <div className="section-card-header">
                                <h3><i className="fa-solid fa-chart-pie" style={{ color: '#00e5ff', marginRight: 8 }}></i> Day Snapshot</h3>
                            </div>
                            <div className="section-card-body" style={{ display: 'flex', flexDirection: 'column', gap: '0.8rem' }}>
                                {[
                                    { label: 'Confirmed', value: filteredReservations.filter((reservation) => reservation.status === 'confirmed').length, color: '#10b981' },
                                    { label: 'Pending', value: filteredReservations.filter((reservation) => reservation.status === 'pending').length, color: '#f59e0b' },
                                    { label: 'Cancelled', value: filteredReservations.filter((reservation) => reservation.status === 'cancelled').length, color: '#ef4444' },
                                    { label: 'VIP Area Bookings', value: filteredReservations.filter((reservation) => reservation.table?.location === 'vip').length, color: '#a855f7' }
                                ].map((item) => (
                                    <div key={item.label} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 12, padding: '0.85rem 0.9rem' }}>
                                        <span style={{ color: '#c2d3f0', fontSize: '0.8rem', fontWeight: 600 }}>{item.label}</span>
                                        <span style={{ color: item.color, fontFamily: "'Rajdhani', sans-serif", fontSize: '1.2rem', fontWeight: 700 }}>{item.value}</span>
                                    </div>
                                ))}
                            </div>
                        </div>

                        <div className="section-card">
                            <div className="section-card-header">
                                <h3><i className="fa-solid fa-location-dot" style={{ color: '#f59e0b', marginRight: 8 }}></i> Area Load</h3>
                            </div>
                            <div className="section-card-body" style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                                {Object.keys(locationMeta).map((locationKey) => {
                                    const totalAreaTables = tables.filter((table) => table.location === locationKey).length;
                                    const reservedAreaTables = tables.filter((table) => table.location === locationKey && table.displayStatus === 'reserved').length;
                                    const accent = locationMeta[locationKey].accent;
                                    const width = totalAreaTables ? `${(reservedAreaTables / totalAreaTables) * 100}%` : '0%';

                                    return (
                                        <div key={locationKey}>
                                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                                                <span style={{ fontSize: '0.78rem', color: '#c2d3f0', fontWeight: 600 }}>{locationMeta[locationKey].title}</span>
                                                <span style={{ fontSize: '0.72rem', color: '#6b84b0' }}>{reservedAreaTables}/{totalAreaTables} reserved</span>
                                            </div>
                                            <div style={{ height: 10, borderRadius: 999, background: 'rgba(255,255,255,0.05)', overflow: 'hidden' }}>
                                                <div style={{ width, height: '100%', background: `linear-gradient(90deg, ${accent}, rgba(255,255,255,0.75))`, borderRadius: 999 }} />
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    </div>
                </div>
            )}

            <AnimatePresence>
                {showTableModal && (
                    <ModalBox title={editingTable ? 'Edit Table' : 'Add Table'} icon="fa-chair" onClose={() => setShowTableModal(false)}>
                        <form onSubmit={handleTableSubmit} style={{ padding: '1.25rem 1.5rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                                <div>
                                    <FieldLabel icon="fa-hashtag">Table Number</FieldLabel>
                                    <input type="number" min="1" value={tableForm.tableNumber} onChange={(e) => setTableForm({ ...tableForm, tableNumber: e.target.value })} className="input-dark" />
                                </div>
                                <div>
                                    <FieldLabel icon="fa-users">Seating Capacity</FieldLabel>
                                    <input type="number" min="1" value={tableForm.seatingCapacity} onChange={(e) => setTableForm({ ...tableForm, seatingCapacity: e.target.value })} className="input-dark" />
                                </div>
                            </div>

                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                                <div>
                                    <FieldLabel icon="fa-location-dot">Location</FieldLabel>
                                    <select value={tableForm.location} onChange={(e) => setTableForm({ ...tableForm, location: e.target.value })} className="input-dark">
                                        <option value="indoor">Indoor</option>
                                        <option value="outdoor">Outdoor</option>
                                        <option value="vip">VIP</option>
                                        <option value="balcony">Balcony</option>
                                    </select>
                                </div>
                                <div>
                                    <FieldLabel icon="fa-signal">Manual Status</FieldLabel>
                                    <select value={tableForm.status} onChange={(e) => setTableForm({ ...tableForm, status: e.target.value })} className="input-dark">
                                        <option value="available">Available</option>
                                        <option value="occupied">Occupied</option>
                                        <option value="maintenance">Maintenance</option>
                                    </select>
                                </div>
                            </div>

                            <div>
                                <FieldLabel icon="fa-note-sticky">Description</FieldLabel>
                                <textarea value={tableForm.description} onChange={(e) => setTableForm({ ...tableForm, description: e.target.value })} className="input-dark" rows={2} style={{ resize: 'vertical' }} />
                            </div>

                            <div style={{ display: 'flex', gap: 10 }}>
                                <button type="button" onClick={() => setShowTableModal(false)} className="btn-neon-cyan" style={{ flex: 1, justifyContent: 'center' }}>Cancel</button>
                                <button type="submit" className="btn-solid-cyan" style={{ flex: 1, justifyContent: 'center' }}>{editingTable ? 'Update' : 'Add'} Table</button>
                            </div>
                        </form>
                    </ModalBox>
                )}
            </AnimatePresence>

            <AnimatePresence>
                {showReservationModal && (
                    <ModalBox title={editingReservation ? 'Edit Reservation' : 'New Reservation'} icon="fa-calendar-check" onClose={() => setShowReservationModal(false)}>
                        <form onSubmit={handleReservationSubmit} style={{ padding: '1.25rem 1.5rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                                <div>
                                    <FieldLabel icon="fa-user">Customer Name</FieldLabel>
                                    <input type="text" value={reservationForm.customerName} onChange={(e) => setReservationForm({ ...reservationForm, customerName: e.target.value })} className="input-dark" />
                                </div>
                                <div>
                                    <FieldLabel icon="fa-phone">Phone</FieldLabel>
                                    <input type="text" value={reservationForm.customerPhone} onChange={(e) => setReservationForm({ ...reservationForm, customerPhone: e.target.value })} className="input-dark" />
                                </div>
                            </div>

                            <div>
                                <FieldLabel icon="fa-envelope">Email</FieldLabel>
                                <input type="email" value={reservationForm.customerEmail} onChange={(e) => setReservationForm({ ...reservationForm, customerEmail: e.target.value })} className="input-dark" />
                            </div>

                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '0.75rem' }}>
                                <div>
                                    <FieldLabel icon="fa-calendar">Date</FieldLabel>
                                    <input type="date" min={getTodayString()} value={reservationForm.reservationDate} onChange={(e) => setReservationForm({ ...reservationForm, reservationDate: e.target.value })} className="input-dark" />
                                </div>
                                <div>
                                    <FieldLabel icon="fa-clock">Time</FieldLabel>
                                    <input type="time" value={reservationForm.reservationTime} onChange={(e) => setReservationForm({ ...reservationForm, reservationTime: e.target.value })} className="input-dark" />
                                </div>
                                <div>
                                    <FieldLabel icon="fa-users">Party Size</FieldLabel>
                                    <input type="number" min="1" value={reservationForm.partySize} onChange={(e) => setReservationForm({ ...reservationForm, partySize: e.target.value })} className="input-dark" />
                                </div>
                            </div>

                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '0.75rem' }}>
                                <div>
                                    <FieldLabel icon="fa-chair">Table</FieldLabel>
                                    <select value={reservationForm.tableId} onChange={(e) => setReservationForm({ ...reservationForm, tableId: e.target.value })} className="input-dark">
                                        <option value="">Select table</option>
                                        {availableOptions.map((table) => (
                                            <option key={table.id} value={table.id}>
                                                Table #{table.tableNumber} ({table.seatingCapacity} seats, {table.displayStatus})
                                            </option>
                                        ))}
                                    </select>
                                </div>
                                <div>
                                    <FieldLabel icon="fa-hourglass-half">Duration</FieldLabel>
                                    <input type="number" min="15" step="15" value={reservationForm.duration} onChange={(e) => setReservationForm({ ...reservationForm, duration: e.target.value })} className="input-dark" />
                                </div>
                                <div>
                                    <FieldLabel icon="fa-circle-dot">Status</FieldLabel>
                                    <select value={reservationForm.status} onChange={(e) => setReservationForm({ ...reservationForm, status: e.target.value })} className="input-dark">
                                        <option value="confirmed">Confirmed</option>
                                        <option value="pending">Pending</option>
                                        <option value="cancelled">Cancelled</option>
                                        <option value="completed">Completed</option>
                                        <option value="no_show">No Show</option>
                                    </select>
                                </div>
                            </div>

                            <div>
                                <FieldLabel icon="fa-note-sticky">Special Requests</FieldLabel>
                                <textarea value={reservationForm.specialRequests} onChange={(e) => setReservationForm({ ...reservationForm, specialRequests: e.target.value })} className="input-dark" rows={2} style={{ resize: 'vertical' }} />
                            </div>

                            <div style={{ display: 'flex', gap: 10 }}>
                                <button type="button" onClick={() => setShowReservationModal(false)} className="btn-neon-cyan" style={{ flex: 1, justifyContent: 'center' }}>Cancel</button>
                                <button type="submit" className="btn-solid-cyan" style={{ flex: 1, justifyContent: 'center' }}>{editingReservation ? 'Update' : 'Create'} Reservation</button>
                            </div>
                        </form>
                    </ModalBox>
                )}
            </AnimatePresence>

            <AnimatePresence>
                {showQrModal && (
                    <ModalBox title={`QR Preview - ${qrPreview.title}`} icon="fa-qrcode" onClose={() => setShowQrModal(false)}>
                        <div style={{ padding: '1.5rem', textAlign: 'center' }}>
                            <img src={qrPreview.image} alt="Reservation QR" style={{ width: 240, height: 240, background: '#fff', padding: 12, borderRadius: 12 }} />
                        </div>
                    </ModalBox>
                )}
            </AnimatePresence>
        </div>
    );
};

export default TableReservationManagement;

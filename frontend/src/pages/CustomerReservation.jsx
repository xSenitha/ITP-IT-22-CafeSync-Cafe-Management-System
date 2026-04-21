import { useEffect, useMemo, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { FaPlus, FaXmark } from 'react-icons/fa6';
import { useAuth } from '../context/AuthContext';
import Navbar from '../components/common/Navbar';
import Footer from '../components/common/Footer';
import API from '../services/api';
import toast from 'react-hot-toast';

const statusBadge = (status) => ({ confirmed: 'badge-success', cancelled: 'badge-danger', pending: 'badge-warning' }[status] || 'badge-muted');

const emptyReservationForm = {
    customerName: '',
    customerPhone: '',
    customerEmail: '',
    partySize: '',
    reservationDate: '',
    reservationTime: '',
    tableId: '',
    duration: '60',
    specialRequests: ''
};

const locationMeta = {
    indoor: {
        title: 'Indoor Hall',
        icon: 'fa-mug-hot',
        accent: '#00e5ff',
        glow: 'rgba(0,229,255,0.16)',
        border: 'rgba(0,229,255,0.2)',
        note: 'Cozy central seating close to service and live kitchen energy.'
    },
    outdoor: {
        title: 'Garden Terrace',
        icon: 'fa-tree',
        accent: '#22c55e',
        glow: 'rgba(34,197,94,0.18)',
        border: 'rgba(34,197,94,0.2)',
        note: 'Fresh-air dining with a calm garden-side atmosphere.'
    },
    vip: {
        title: 'VIP Lounge',
        icon: 'fa-crown',
        accent: '#f59e0b',
        glow: 'rgba(245,158,11,0.18)',
        border: 'rgba(245,158,11,0.2)',
        note: 'Premium space for special guests, meetings, and private dining.'
    },
    balcony: {
        title: 'Balcony View',
        icon: 'fa-mountain-city',
        accent: '#a855f7',
        glow: 'rgba(168,85,247,0.2)',
        border: 'rgba(168,85,247,0.2)',
        note: 'Quiet elevated seating with a more relaxed visual backdrop.'
    },
    default: {
        title: 'Table Area',
        icon: 'fa-chair',
        accent: '#94a3b8',
        glow: 'rgba(148,163,184,0.16)',
        border: 'rgba(148,163,184,0.2)',
        note: 'Available reservation seating.'
    }
};

const tableStatusMeta = {
    available: { color: '#10b981', border: 'rgba(16,185,129,0.3)', glow: 'rgba(16,185,129,0.16)', badge: 'badge-success', label: 'Available' },
    reserved: { color: '#f59e0b', border: 'rgba(245,158,11,0.3)', glow: 'rgba(245,158,11,0.14)', badge: 'badge-warning', label: 'Reserved' },
    occupied: { color: '#ef4444', border: 'rgba(239,68,68,0.3)', glow: 'rgba(239,68,68,0.14)', badge: 'badge-danger', label: 'Occupied' },
    maintenance: { color: '#64748b', border: 'rgba(100,116,139,0.3)', glow: 'rgba(100,116,139,0.14)', badge: 'badge-muted', label: 'Maintenance' }
};

const reservationLocations = ['outdoor', 'indoor', 'vip', 'balcony'];

const getTodayString = () => {
    const today = new Date();
    const year = today.getFullYear();
    const month = String(today.getMonth() + 1).padStart(2, '0');
    const day = String(today.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
};

const getLocationMeta = (location) => locationMeta[location] || locationMeta.default;
const getTableStatusMeta = (status) => tableStatusMeta[status] || tableStatusMeta.available;

const formatDisplayDate = (dateValue) => {
    const effectiveDate = dateValue || getTodayString();
    return new Date(`${effectiveDate}T00:00:00`).toLocaleDateString('en-LK', {
        weekday: 'short',
        month: 'short',
        day: 'numeric',
        year: 'numeric'
    });
};

const formatTime = (timeValue) => String(timeValue || '').slice(0, 5);

const CustomerReservation = () => {
    const { user } = useAuth();
    const [tables, setTables] = useState([]);
    const [reservations, setReservations] = useState([]);
    const [loading, setLoading] = useState(true);
    const [tablesLoading, setTablesLoading] = useState(true);
    const [showModal, setShowModal] = useState(false);
    const [selectedDate, setSelectedDate] = useState(getTodayString());
    const [search, setSearch] = useState('');
    const [locationFilter, setLocationFilter] = useState('all');
    const [selectedTableId, setSelectedTableId] = useState('');
    const [form, setForm] = useState(emptyReservationForm);

    useEffect(() => {
        fetchReservations();
        if (user) {
            setForm((current) => ({
                ...current,
                customerName: `${user.firstName} ${user.lastName}`,
                customerPhone: user.phone || '',
                customerEmail: user.email || ''
            }));
        }
    }, [user]);

    useEffect(() => {
        fetchTablesForDate(selectedDate);
    }, [selectedDate]);

    const fetchReservations = async () => {
        try {
            const response = user?.email
                ? await API.get(`/tables/reservations?email=${encodeURIComponent(user.email)}`).catch(() => ({ data: [] }))
                : await API.get('/tables/reservations').catch(() => ({ data: [] }));

            const allReservations = response.data;
            const filteredReservations = user?.email
                ? allReservations
                : allReservations.filter((reservation) => reservation.customerName === `${user?.firstName} ${user?.lastName}`);

            setReservations(filteredReservations);
        } catch {
            setReservations([]);
        } finally {
            setLoading(false);
        }
    };

    const fetchTablesForDate = async (dateValue) => {
        setTablesLoading(true);
        try {
            const response = await API.get(`/tables/tables?date=${dateValue}`);
            setTables(response.data);
        } catch {
            setTables([]);
        } finally {
            setTablesLoading(false);
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

    const validateReservationForm = () => {
        if (!form.customerName.trim()) return 'Customer name is required';
        if (!/^\+?\d{9,15}$/.test(form.customerPhone.replace(/\s/g, ''))) return 'Phone number must contain 9 to 15 digits';
        if (form.customerEmail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.customerEmail.trim())) return 'Email address is invalid';
        if (!form.partySize || parseInt(form.partySize, 10) < 1) return 'Party size must be at least 1';
        if (!form.reservationDate) return 'Reservation date is required';
        if (new Date(`${form.reservationDate}T00:00:00`) < new Date(`${getTodayString()}T00:00:00`)) return 'Reservation date cannot be in the past';
        if (!form.reservationTime) return 'Reservation time is required';
        if (!form.tableId) return 'Please select a table';

        const selectedTable = tables.find((table) => String(table.id) === String(form.tableId));
        if (!selectedTable || selectedTable.displayStatus !== 'available') return 'Selected table is no longer available';
        if (parseInt(form.partySize, 10) > selectedTable.seatingCapacity) return 'Party size exceeds selected table capacity';
        if (!form.duration || parseInt(form.duration, 10) < 15) return 'Reservation duration must be at least 15 minutes';
        if (form.specialRequests.length > 500) return 'Special requests are too long';

        return '';
    };

    const resetForm = () => {
        setForm({
            ...emptyReservationForm,
            customerName: user ? `${user.firstName} ${user.lastName}` : '',
            customerPhone: user?.phone || '',
            customerEmail: user?.email || ''
        });
    };

    const openBookingModal = (table = null) => {
        if (table && table.displayStatus !== 'available') return;

        setForm((current) => ({
            ...current,
            reservationDate: selectedDate,
            tableId: table ? String(table.id) : current.tableId
        }));
        setShowModal(true);
    };

    const handleSubmit = async (event) => {
        event.preventDefault();
        const errorMessage = validateReservationForm();
        if (errorMessage) {
            toast.error(errorMessage);
            return;
        }

        try {
            await API.post('/tables/reservations', {
                customerName: form.customerName.trim(),
                customerPhone: form.customerPhone.replace(/\s/g, ''),
                customerEmail: form.customerEmail.trim(),
                partySize: parseInt(form.partySize, 10),
                reservationDate: form.reservationDate,
                reservationTime: form.reservationTime,
                tableId: parseInt(form.tableId, 10),
                duration: parseInt(form.duration, 10),
                specialRequests: form.specialRequests.trim(),
                status: 'confirmed'
            });

            toast.success('Reservation booked!');
            fetchReservations();
            fetchTablesForDate(form.reservationDate || selectedDate);
            setShowModal(false);
            resetForm();
        } catch (error) {
            toast.error(error.response?.data?.message || 'Failed to book reservation');
        }
    };

    const pageLoading = loading || tablesLoading;
    const availableTables = tables.filter((table) => table.displayStatus === 'available');
    const partySizeValue = parseInt(form.partySize, 10) || 0;
    const selectedTable = tables.find((table) => String(table.id) === String(form.tableId)) || null;
    const reservedTables = tables.filter((table) => table.displayStatus === 'reserved');
    const blockedTables = tables.filter((table) => ['occupied', 'maintenance'].includes(table.displayStatus));

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

    const focusedTable = filteredTables.find((table) => String(table.id) === String(selectedTableId)) || filteredTables[0] || null;

    const tableSummary = useMemo(() => ([
        { label: 'Tables in View', value: filteredTables.length, icon: 'fa-table-cells-large', color: '#00e5ff' },
        { label: 'Reserved on Day', value: filteredTables.filter((table) => table.displayStatus === 'reserved').length, icon: 'fa-calendar-check', color: '#f59e0b' },
        { label: 'Free on Day', value: filteredTables.filter((table) => table.displayStatus === 'available').length, icon: 'fa-circle-check', color: '#10b981' },
        { label: 'Blocked', value: filteredTables.filter((table) => ['occupied', 'maintenance'].includes(table.displayStatus)).length, icon: 'fa-ban', color: '#ef4444' }
    ]), [filteredTables]);

    const floorSections = useMemo(() => {
        return reservationLocations.map((locationKey) => ({
            key: locationKey,
            ...getLocationMeta(locationKey),
            tables: filteredTables.filter((table) => table.location === locationKey)
        }));
    }, [filteredTables]);

    const reservationHighlights = [
        {
            label: 'Open Tables',
            value: availableTables.length,
            icon: 'fa-table-cells-large',
            accent: '#10b981',
            note: `Live for ${formatDisplayDate(selectedDate)}`
        },
        {
            label: 'Reserved Today',
            value: reservedTables.length,
            icon: 'fa-calendar-check',
            accent: '#f59e0b',
            note: 'Shown but not clickable'
        },
        {
            label: 'Blocked Tables',
            value: blockedTables.length,
            icon: 'fa-ban',
            accent: '#ef4444',
            note: 'Occupied or in maintenance'
        },
        {
            label: 'Largest Setup',
            value: tables.length ? `${Math.max(...tables.map((table) => table.seatingCapacity))} seats` : '0 seats',
            icon: 'fa-users',
            accent: '#00e5ff',
            note: 'Best fit for bigger groups'
        }
    ];

    const inputCls = 'input-dark';

    const FieldLabel = ({ icon, children }) => (
        <label style={{ display: 'block', fontSize: '0.7rem', fontWeight: 700, color: '#6b84b0', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 5 }}>
            {icon && <i className={`fa-solid ${icon}`} style={{ color: 'rgba(0,229,255,0.6)', fontSize: 10, marginRight: 5 }} />}
            {children}
        </label>
    );

    return (
        <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', background: '#070b14', fontFamily: "'Inter', sans-serif" }}>
            <Navbar />

            <section style={{ position: 'relative', padding: '4rem 1.25rem 2.75rem', overflow: 'hidden', borderBottom: '1px solid rgba(168,85,247,0.08)', minHeight: 240, display: 'flex', alignItems: 'center' }}>
                <img src="/assets/cafe_reservation.jpg" alt="" style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover', objectPosition: 'center', pointerEvents: 'none' }} />
                <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(180deg, rgba(7,11,20,0.62) 0%, rgba(7,11,20,0.95) 100%)', pointerEvents: 'none' }} />
                <div className="hud-grid" style={{ position: 'absolute', inset: 0, opacity: 0.28, pointerEvents: 'none' }} />
                <div style={{ position: 'absolute', top: '-50px', right: '-80px', width: 420, height: 420, borderRadius: '50%', background: 'radial-gradient(circle, rgba(34,197,94,0.12) 0%, transparent 68%)', pointerEvents: 'none' }} />
                <div style={{ position: 'absolute', bottom: '-110px', left: '-40px', width: 420, height: 420, borderRadius: '50%', background: 'radial-gradient(circle, rgba(168,85,247,0.14) 0%, transparent 72%)', pointerEvents: 'none' }} />

                <div style={{ maxWidth: 1160, margin: '0 auto', position: 'relative', zIndex: 1, width: '100%' }}>
                    <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }} style={{ textAlign: 'center', marginBottom: '1.5rem' }}>
                        <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, padding: '0.32rem 0.9rem', borderRadius: 999, background: 'rgba(168,85,247,0.08)', border: '1px solid rgba(168,85,247,0.22)', marginBottom: '1rem' }}>
                            <i className="fa-solid fa-calendar-check" style={{ color: '#a855f7', fontSize: 11 }} />
                            <span style={{ fontSize: '0.68rem', fontWeight: 700, color: '#a855f7', letterSpacing: '0.12em', textTransform: 'uppercase' }}>Dining Spaces</span>
                        </div>
                        <h1 style={{ fontFamily: "'Rajdhani', sans-serif", fontSize: 'clamp(2rem, 4vw, 2.8rem)', fontWeight: 700, color: '#e2eaf7', marginBottom: '0.6rem' }}>
                            Reserve by <span style={{ background: 'linear-gradient(90deg, #22c55e, #00e5ff, #a855f7)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>Zone and Mood</span>
                        </h1>
                        <p style={{ color: 'rgba(194,211,240,0.78)', fontSize: '0.92rem', maxWidth: 720, margin: '0 auto' }}>
                            Explore the Garden Terrace, Indoor Hall, VIP Lounge, and Balcony View in a modern visual layout, then book the table that fits your party best.
                        </p>
                    </motion.div>

                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '0.9rem' }}>
                        {reservationHighlights.map((highlight) => (
                            <motion.div key={highlight.label} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
                                style={{ background: 'rgba(9,15,28,0.72)', border: `1px solid ${highlight.accent}22`, borderRadius: '1rem', padding: '1rem 1.05rem', boxShadow: `0 0 40px ${highlight.accent}12` }}>
                                <div style={{ width: 42, height: 42, borderRadius: 12, background: `${highlight.accent}16`, border: `1px solid ${highlight.accent}28`, display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '0.8rem' }}>
                                    <i className={`fa-solid ${highlight.icon}`} style={{ color: highlight.accent, fontSize: 15 }} />
                                </div>
                                <p style={{ fontSize: '0.64rem', fontWeight: 700, color: '#3d5278', letterSpacing: '0.1em', textTransform: 'uppercase' }}>{highlight.label}</p>
                                <p style={{ fontFamily: "'Rajdhani', sans-serif", fontSize: '1.45rem', fontWeight: 700, color: '#e2eaf7', marginTop: 4 }}>{highlight.value}</p>
                                <p style={{ fontSize: '0.74rem', color: '#6b84b0', marginTop: 4, lineHeight: 1.45 }}>{highlight.note}</p>
                            </motion.div>
                        ))}
                    </div>
                </div>
            </section>

            <div style={{ maxWidth: 1160, margin: '0 auto', width: '100%', padding: '2rem 1.25rem 4rem', flex: 1 }}>
                <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} style={{ marginBottom: '1.25rem' }}>
                    <div style={{ background: 'linear-gradient(135deg, rgba(12,20,36,0.96) 0%, rgba(15,23,42,0.92) 100%)', border: '1px solid rgba(0,229,255,0.1)', borderRadius: '1.25rem', padding: '1.35rem 1.4rem', position: 'relative', overflow: 'hidden' }}>
                        <div style={{ position: 'absolute', top: -80, right: -50, width: 260, height: 260, background: 'radial-gradient(circle, rgba(168,85,247,0.14) 0%, transparent 65%)', borderRadius: '50%' }} />
                        <div style={{ position: 'absolute', bottom: -90, left: -60, width: 280, height: 280, background: 'radial-gradient(circle, rgba(0,229,255,0.10) 0%, transparent 70%)', borderRadius: '50%' }} />
                        <div style={{ position: 'relative', zIndex: 1, display: 'flex', justifyContent: 'space-between', gap: '1rem', flexWrap: 'wrap' }}>
                            <div style={{ maxWidth: 620 }}>
                                <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, padding: '0.3rem 0.85rem', borderRadius: 99, background: 'rgba(168,85,247,0.08)', border: '1px solid rgba(168,85,247,0.18)', marginBottom: '0.9rem' }}>
                                    <i className="fa-solid fa-hotel" style={{ color: '#a855f7', fontSize: 11 }}></i>
                                    <span style={{ fontSize: '0.68rem', fontWeight: 700, color: '#a855f7', letterSpacing: '0.11em', textTransform: 'uppercase' }}>Dining Floor View</span>
                                </div>
                                <h2 style={{ fontFamily: "'Rajdhani', sans-serif", fontSize: '1.7rem', fontWeight: 700, color: '#e2eaf7', marginBottom: 6 }}>
                                    Table View for <span style={{ color: '#00e5ff' }}>{formatDisplayDate(selectedDate)}</span>
                                </h2>
                                <p style={{ color: '#6b84b0', fontSize: '0.84rem', lineHeight: 1.7 }}>
                                    This page now mirrors the `/tables` viewing format. All tables are visible by day, reserved tables stay disabled, and available tables can be booked directly.
                                </p>
                            </div>

                            <div style={{ display: 'flex', gap: 8, alignItems: 'flex-start', flexWrap: 'wrap' }}>
                                <button onClick={() => openBookingModal()} className="btn-solid-cyan">
                                    <FaPlus style={{ fontSize: 12 }} /> Book a Table
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
                    <div style={{ padding: '0.95rem 1.2rem', display: 'grid', gridTemplateColumns: '1fr 1fr 1.2fr auto', gap: '0.85rem', alignItems: 'end' }} className="grid-cols-1 md:grid-cols-2 xl:grid-cols-[1fr_1fr_1.2fr_auto]">
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
                            <input type="text" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search table number, area, status..." className="input-dark" />
                        </div>

                        <button onClick={() => openBookingModal()} className="btn-solid-cyan" style={{ justifyContent: 'center', minHeight: 44 }}>
                            <FaPlus style={{ fontSize: 12 }} /> New Booking
                        </button>
                    </div>
                </div>

                {pageLoading ? (
                    <div style={{ display: 'flex', justifyContent: 'center', padding: '4rem 0', marginBottom: '2rem' }}>
                        <div style={{ width: 36, height: 36, borderRadius: '50%', border: '2px solid rgba(168,85,247,0.2)', borderTopColor: '#a855f7', animation: 'spin 0.8s linear infinite' }} />
                    </div>
                ) : (
                    <div style={{ display: 'grid', gridTemplateColumns: 'minmax(330px, 0.95fr) minmax(420px, 1.25fr)', gap: '1.25rem', marginBottom: '2.25rem' }} className="grid-cols-1 xl:grid-cols-[minmax(330px,0.95fr)_minmax(420px,1.25fr)]">
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
                                        const status = getTableStatusMeta(table.displayStatus);
                                        const isSelected = String(selectedTableId) === String(table.id);
                                        const canReserve = table.displayStatus === 'available';
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
                                                            </div>
                                                            <p style={{ fontSize: '0.75rem', color: '#6b84b0', marginTop: 4 }}>
                                                                {table.seatingCapacity} seats • {getLocationMeta(table.location).title}
                                                            </p>
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

                                                    {canReserve && (
                                                        <button
                                                            type="button"
                                                            onClick={(event) => {
                                                                event.stopPropagation();
                                                                openBookingModal(table);
                                                            }}
                                                            className="btn-neon-cyan"
                                                            style={{ padding: '0.3rem 0.65rem', fontSize: '0.72rem' }}
                                                        >
                                                            Book
                                                        </button>
                                                    )}
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>

                            <div className="section-card">
                                <div className="section-card-header">
                                    <h3><i className="fa-solid fa-circle-info" style={{ color: '#a855f7', marginRight: 8 }}></i> Selected Table Details</h3>
                                    {focusedTable && focusedTable.displayStatus === 'available' && (
                                        <button onClick={() => openBookingModal(focusedTable)} className="btn-neon-cyan" style={{ padding: '0.35rem 0.75rem', fontSize: '0.75rem' }}>
                                            <FaPlus style={{ fontSize: 10 }} /> Book This Table
                                        </button>
                                    )}
                                </div>
                                <div className="section-card-body">
                                    {!focusedTable ? (
                                        <div style={{ padding: '2rem 1rem', textAlign: 'center', color: '#6b84b0' }}>
                                            Select a table to see its details.
                                        </div>
                                    ) : (
                                        <>
                                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '0.75rem', marginBottom: '1rem' }} className="grid-cols-1 md:grid-cols-3">
                                                {[
                                                    { label: 'Status', value: getTableStatusMeta(focusedTable.displayStatus).label, icon: 'fa-signal', color: getTableStatusMeta(focusedTable.displayStatus).color },
                                                    { label: 'Seats', value: `${focusedTable.seatingCapacity}`, icon: 'fa-users', color: '#00e5ff' },
                                                    { label: 'Bookings', value: `${focusedTable.reservationCountForDate || 0}`, icon: 'fa-calendar-check', color: '#f59e0b' }
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
                                                    {focusedTable.description || 'No description added yet for this table.'}
                                                </p>
                                            </div>

                                            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.7rem' }}>
                                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12 }}>
                                                    <h4 style={{ fontSize: '0.84rem', fontWeight: 700, color: '#e2eaf7' }}>Reservation Schedule</h4>
                                                    <span style={{ fontSize: '0.72rem', color: '#6b84b0' }}>{formatDisplayDate(selectedDate)}</span>
                                                </div>

                                                {focusedTable.reservationsForDate?.length ? focusedTable.reservationsForDate.map((reservation) => (
                                                    <div key={reservation.id} style={{ background: 'rgba(245,158,11,0.06)', border: '1px solid rgba(245,158,11,0.14)', borderRadius: 12, padding: '0.85rem' }}>
                                                        <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, alignItems: 'center', marginBottom: 6 }}>
                                                            <div>
                                                                <p style={{ fontSize: '0.82rem', fontWeight: 700, color: '#e2eaf7' }}>{reservation.customerName}</p>
                                                                <p style={{ fontSize: '0.72rem', color: '#6b84b0', marginTop: 3 }}>
                                                                    {formatTime(reservation.reservationTime)} • {reservation.partySize} guests • {reservation.duration || 60} mins
                                                                </p>
                                                            </div>
                                                            <span className={`badge ${statusBadge(reservation.status)}`}>{reservation.status}</span>
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
                                                            const status = getTableStatusMeta(table.displayStatus);
                                                            const isSelected = String(selectedTableId) === String(table.id);
                                                            const canReserve = table.displayStatus === 'available';
                                                            return (
                                                                <button
                                                                    key={table.id}
                                                                    type="button"
                                                                    onClick={() => {
                                                                        setSelectedTableId(String(table.id));
                                                                        if (canReserve) openBookingModal(table);
                                                                    }}
                                                                    disabled={!canReserve}
                                                                    style={{ background: isSelected ? 'rgba(255,255,255,0.05)' : 'rgba(255,255,255,0.02)', border: `1px solid ${isSelected ? section.accent : status.border}`, borderRadius: 16, padding: '0.8rem 0.65rem', cursor: canReserve ? 'pointer' : 'not-allowed', opacity: canReserve ? 1 : 0.55, transition: 'all 0.2s' }}
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
                )}

                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.25rem', gap: 12, flexWrap: 'wrap' }}>
                    <div>
                        <h2 style={{ fontFamily: "'Rajdhani', sans-serif", fontSize: '1.2rem', fontWeight: 700, color: '#e2eaf7' }}>My Reservations</h2>
                        {!loading && <p style={{ fontSize: '0.72rem', color: '#3d5278', marginTop: 2 }}>{reservations.length} reservation{reservations.length !== 1 ? 's' : ''} found</p>}
                    </div>
                    <button onClick={() => openBookingModal()} className="btn-solid-cyan">
                        <FaPlus style={{ fontSize: 12 }} /> Book a Table
                    </button>
                </div>

                {loading ? (
                    <div style={{ display: 'flex', justifyContent: 'center', padding: '4rem 0' }}>
                        <div style={{ width: 36, height: 36, borderRadius: '50%', border: '2px solid rgba(168,85,247,0.2)', borderTopColor: '#a855f7', animation: 'spin 0.8s linear infinite' }} />
                    </div>
                ) : reservations.length === 0 ? (
                    <div style={{ textAlign: 'center', padding: '4rem 1rem', background: 'rgba(13,21,38,0.56)', border: '1px solid rgba(168,85,247,0.08)', borderRadius: '1rem' }}>
                        <div style={{ width: 68, height: 68, borderRadius: 18, background: 'rgba(168,85,247,0.06)', border: '1px solid rgba(168,85,247,0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1.25rem' }}>
                            <i className="fa-solid fa-calendar-xmark" style={{ color: '#3d5278', fontSize: 28 }} />
                        </div>
                        <h3 style={{ color: '#c2d3f0', fontWeight: 700, marginBottom: 6 }}>No Reservations Yet</h3>
                        <p style={{ color: '#3d5278', fontSize: '0.82rem', marginBottom: '1.25rem' }}>Pick a dining zone and secure your table in a few clicks.</p>
                        <button onClick={() => openBookingModal()} className="btn-solid-cyan">
                            <FaPlus style={{ fontSize: 12 }} /> Book a Table
                        </button>
                    </div>
                ) : (
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(290px, 1fr))', gap: '1rem' }}>
                        {reservations.map((reservation, index) => {
                            const meta = getLocationMeta(reservation.table?.location);

                            return (
                                <motion.div key={reservation.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: index * 0.05 }}
                                    style={{ background: 'linear-gradient(180deg, rgba(13,21,38,0.82) 0%, rgba(8,12,22,0.94) 100%)', border: `1px solid ${meta.border}`, borderRadius: '1rem', padding: '1rem', boxShadow: `0 0 26px ${meta.glow}` }}>
                                    <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12, marginBottom: '0.95rem' }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                                            <div style={{ width: 46, height: 46, borderRadius: 14, background: `${meta.accent}16`, border: `1px solid ${meta.accent}26`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                                                <i className={`fa-solid ${meta.icon}`} style={{ color: meta.accent, fontSize: 16 }} />
                                            </div>
                                            <div>
                                                <p style={{ fontSize: '0.88rem', fontWeight: 700, color: '#c2d3f0' }}>{reservation.reservationNumber || `Reservation #${reservation.id}`}</p>
                                                <p style={{ fontSize: '0.72rem', color: meta.accent, fontWeight: 700, marginTop: 3 }}>{meta.title}</p>
                                            </div>
                                        </div>
                                        <span className={`badge ${statusBadge(reservation.status)}`} style={{ textTransform: 'capitalize' }}>{reservation.status}</span>
                                    </div>

                                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                                        {[
                                            { label: 'Table', value: `Table ${reservation.table?.tableNumber || reservation.tableId}` },
                                            { label: 'Guests', value: `${reservation.partySize} guests` },
                                            { label: 'Date', value: formatDisplayDate(reservation.reservationDate) },
                                            { label: 'Time', value: formatTime(reservation.reservationTime) }
                                        ].map((item) => (
                                            <div key={item.label} style={{ background: 'rgba(255,255,255,0.03)', borderRadius: 8, padding: '0.55rem 0.65rem' }}>
                                                <p style={{ fontSize: '0.6rem', color: '#3d5278', textTransform: 'uppercase', letterSpacing: '0.08em', fontWeight: 700 }}>{item.label}</p>
                                                <p style={{ fontSize: '0.78rem', color: '#c2d3f0', fontWeight: 600, marginTop: 4 }}>{item.value}</p>
                                            </div>
                                        ))}
                                    </div>

                                    <div style={{ marginTop: '0.85rem', padding: '0.7rem 0.8rem', borderRadius: 8, background: 'rgba(255,255,255,0.03)' }}>
                                        <p style={{ fontSize: '0.64rem', color: '#3d5278', textTransform: 'uppercase', letterSpacing: '0.08em', fontWeight: 700 }}>Duration</p>
                                        <p style={{ fontSize: '0.8rem', color: '#c2d3f0', fontWeight: 600, marginTop: 4 }}>{reservation.duration || 60} minutes</p>
                                        {reservation.specialRequests && (
                                            <p style={{ fontSize: '0.74rem', color: '#6b84b0', marginTop: 8, lineHeight: 1.5 }}>
                                                <i className="fa-solid fa-note-sticky" style={{ marginRight: 5 }} />
                                                {reservation.specialRequests}
                                            </p>
                                        )}
                                    </div>
                                </motion.div>
                            );
                        })}
                    </div>
                )}
            </div>

            <AnimatePresence>
                {showModal && (
                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                        style={{ position: 'fixed', inset: 0, background: 'rgba(7,11,20,0.85)', backdropFilter: 'blur(8px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 50, padding: '1rem' }}>
                        <motion.div initial={{ scale: 0.92, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.92, opacity: 0 }}
                            style={{ background: '#0d1526', border: '1px solid rgba(168,85,247,0.2)', borderRadius: '1.25rem', width: '100%', maxWidth: 820, maxHeight: '92vh', overflowY: 'auto', boxShadow: '0 0 60px rgba(168,85,247,0.1)' }}>
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '1.25rem 1.5rem', borderBottom: '1px solid rgba(168,85,247,0.08)', background: 'rgba(168,85,247,0.03)' }}>
                                <div>
                                    <h2 style={{ fontFamily: "'Rajdhani', sans-serif", fontSize: '1.15rem', fontWeight: 700, color: '#e2eaf7', display: 'flex', alignItems: 'center', gap: 8 }}>
                                        <i className="fa-solid fa-calendar-plus" style={{ color: '#a855f7', fontSize: 14 }} /> Book a Table
                                    </h2>
                                    <p style={{ color: '#6b84b0', fontSize: '0.75rem', marginTop: 4 }}>Select a date, check the area, and confirm the table visually.</p>
                                </div>
                                <button onClick={() => setShowModal(false)} style={{ color: '#3d5278', background: 'none', border: 'none', cursor: 'pointer', padding: 4 }}>
                                    <FaXmark size={18} />
                                </button>
                            </div>

                            <form onSubmit={handleSubmit} style={{ padding: '1.25rem 1.5rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                                <div style={{ display: 'grid', gridTemplateColumns: '1.1fr 0.9fr', gap: '1rem' }}>
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                                            <div>
                                                <FieldLabel icon="fa-user">Your Name</FieldLabel>
                                                <input type="text" value={form.customerName} onChange={(event) => setForm({ ...form, customerName: event.target.value })} required className={inputCls} placeholder="Full name" />
                                            </div>
                                            <div>
                                                <FieldLabel icon="fa-phone">Phone</FieldLabel>
                                                <input type="text" value={form.customerPhone} onChange={(event) => setForm({ ...form, customerPhone: event.target.value })} required className={inputCls} placeholder="+94 71 234 5678" />
                                            </div>
                                        </div>

                                        <div>
                                            <FieldLabel icon="fa-envelope">Email {user ? <span style={{ color: '#3d5278', fontWeight: 400, textTransform: 'none', marginLeft: 4 }}>(auto-filled)</span> : ''}</FieldLabel>
                                            <input
                                                type="email"
                                                value={form.customerEmail}
                                                onChange={(event) => setForm({ ...form, customerEmail: event.target.value })}
                                                className={inputCls}
                                                placeholder="your@email.com"
                                                readOnly={!!user}
                                                style={user ? { opacity: 0.7, cursor: 'not-allowed' } : {}}
                                            />
                                        </div>

                                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                                            <div>
                                                <FieldLabel icon="fa-calendar">Date</FieldLabel>
                                                <input type="date" value={form.reservationDate} onChange={(event) => { setSelectedDate(event.target.value); setForm({ ...form, reservationDate: event.target.value, tableId: '' }); }} required className={inputCls} min={getTodayString()} />
                                            </div>
                                            <div>
                                                <FieldLabel icon="fa-clock">Time</FieldLabel>
                                                <input type="time" value={form.reservationTime} onChange={(event) => setForm({ ...form, reservationTime: event.target.value })} required className={inputCls} />
                                            </div>
                                        </div>

                                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                                            <div>
                                                <FieldLabel icon="fa-users">Party Size</FieldLabel>
                                                <input type="number" min="1" max="20" value={form.partySize} onChange={(event) => setForm({ ...form, partySize: event.target.value })} required className={inputCls} placeholder="e.g. 4" />
                                            </div>
                                            <div>
                                                <FieldLabel icon="fa-hourglass-half">Duration</FieldLabel>
                                                <select value={form.duration} onChange={(event) => setForm({ ...form, duration: event.target.value })} className={inputCls}>
                                                    <option value="60">60 minutes</option>
                                                    <option value="90">90 minutes</option>
                                                    <option value="120">120 minutes</option>
                                                </select>
                                            </div>
                                        </div>

                                        <div>
                                            <FieldLabel icon="fa-note-sticky">Special Requests</FieldLabel>
                                            <textarea
                                                value={form.specialRequests}
                                                onChange={(event) => setForm({ ...form, specialRequests: event.target.value })}
                                                className={inputCls}
                                                rows={3}
                                                placeholder="Dietary preferences, birthdays, accessibility needs, or any other request..."
                                                style={{ resize: 'vertical', minHeight: 84 }}
                                            />
                                        </div>
                                    </div>

                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.9rem' }}>
                                        <div style={{ background: 'rgba(10,16,32,0.9)', border: '1px solid rgba(168,85,247,0.12)', borderRadius: '1rem', padding: '0.95rem' }}>
                                            <p style={{ fontSize: '0.68rem', color: '#a855f7', textTransform: 'uppercase', letterSpacing: '0.1em', fontWeight: 700, marginBottom: 8 }}>Booking Snapshot</p>
                                            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                                                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.78rem' }}>
                                                    <span style={{ color: '#6b84b0' }}>Date</span>
                                                    <span style={{ color: '#e2eaf7', fontWeight: 600 }}>{formatDisplayDate(form.reservationDate || getTodayString())}</span>
                                                </div>
                                                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.78rem' }}>
                                                    <span style={{ color: '#6b84b0' }}>Available tables</span>
                                                    <span style={{ color: '#10b981', fontWeight: 600 }}>{availableTables.length}</span>
                                                </div>
                                                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.78rem' }}>
                                                    <span style={{ color: '#6b84b0' }}>Selected table</span>
                                                    <span style={{ color: '#e2eaf7', fontWeight: 600 }}>{selectedTable ? `Table ${selectedTable.tableNumber}` : 'None'}</span>
                                                </div>
                                            </div>
                                        </div>

                                        {selectedTable ? (
                                            <div style={{ background: 'rgba(10,16,32,0.9)', border: `1px solid ${getLocationMeta(selectedTable.location).border}`, borderRadius: '1rem', padding: '0.95rem', boxShadow: `0 0 24px ${getLocationMeta(selectedTable.location).glow}` }}>
                                                <p style={{ fontSize: '0.68rem', color: getLocationMeta(selectedTable.location).accent, textTransform: 'uppercase', letterSpacing: '0.1em', fontWeight: 700, marginBottom: 8 }}>Selected Experience</p>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
                                                    <div style={{ width: 42, height: 42, borderRadius: 12, background: `${getLocationMeta(selectedTable.location).accent}16`, border: `1px solid ${getLocationMeta(selectedTable.location).accent}26`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                                        <i className={`fa-solid ${getLocationMeta(selectedTable.location).icon}`} style={{ color: getLocationMeta(selectedTable.location).accent, fontSize: 15 }} />
                                                    </div>
                                                    <div>
                                                        <p style={{ color: '#e2eaf7', fontWeight: 700 }}>Table {selectedTable.tableNumber}</p>
                                                        <p style={{ color: '#6b84b0', fontSize: '0.74rem', marginTop: 2 }}>{getLocationMeta(selectedTable.location).title}</p>
                                                    </div>
                                                </div>
                                                <p style={{ color: '#c2d3f0', fontSize: '0.78rem', fontWeight: 600 }}>{selectedTable.seatingCapacity} seats</p>
                                                <p style={{ color: '#6b84b0', fontSize: '0.74rem', lineHeight: 1.5, marginTop: 8 }}>{selectedTable.description || getLocationMeta(selectedTable.location).note}</p>
                                            </div>
                                        ) : (
                                            <div style={{ background: 'rgba(10,16,32,0.9)', border: '1px dashed rgba(168,85,247,0.18)', borderRadius: '1rem', padding: '1rem', textAlign: 'center', color: '#6b84b0', fontSize: '0.78rem' }}>
                                                Pick a table card below to see the area preview here.
                                            </div>
                                        )}
                                    </div>
                                </div>

                                <div style={{ background: 'rgba(8,12,24,0.92)', border: '1px solid rgba(168,85,247,0.12)', borderRadius: '1rem', padding: '1rem' }}>
                                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, marginBottom: '0.9rem', flexWrap: 'wrap' }}>
                                        <div>
                                            <p style={{ fontSize: '0.68rem', color: '#a855f7', textTransform: 'uppercase', letterSpacing: '0.1em', fontWeight: 700 }}>Table Picker</p>
                                            <p style={{ color: '#6b84b0', fontSize: '0.78rem', marginTop: 4 }}>Reserved, occupied, maintenance, or too-small tables are dimmed and cannot be selected.</p>
                                        </div>
                                        <span style={{ fontSize: '0.72rem', color: '#c2d3f0', fontWeight: 600 }}>
                                            {partySizeValue ? `Party size: ${partySizeValue}` : 'Set party size to filter'}
                                        </span>
                                    </div>

                                    {tables.length === 0 ? (
                                        <div style={{ borderRadius: 10, border: '1px dashed rgba(239,68,68,0.18)', padding: '1rem', textAlign: 'center', color: '#ef4444', fontSize: '0.8rem' }}>
                                            No tables are configured for the selected day.
                                        </div>
                                    ) : (
                                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(170px, 1fr))', gap: '0.75rem' }}>
                                            {tables.map((table) => {
                                                const meta = getLocationMeta(table.location);
                                                const status = getTableStatusMeta(table.displayStatus);
                                                const isAvailable = table.displayStatus === 'available';
                                                const fitsParty = !partySizeValue || table.seatingCapacity >= partySizeValue;
                                                const canSelect = isAvailable && fitsParty;
                                                const isSelected = String(form.tableId) === String(table.id);

                                                return (
                                                    <button
                                                        key={table.id}
                                                        type="button"
                                                        disabled={!canSelect}
                                                        onClick={() => canSelect && setForm({ ...form, tableId: String(table.id) })}
                                                        style={{
                                                            textAlign: 'left',
                                                            padding: '0.9rem',
                                                            borderRadius: 14,
                                                            cursor: canSelect ? 'pointer' : 'not-allowed',
                                                            background: isSelected ? `${meta.accent}14` : 'rgba(255,255,255,0.03)',
                                                            border: isSelected ? `1px solid ${meta.accent}` : `1px solid ${status.border}`,
                                                            opacity: canSelect ? 1 : 0.45,
                                                            boxShadow: isSelected ? `0 0 24px ${meta.glow}` : 'none',
                                                            transition: 'all 0.2s'
                                                        }}
                                                    >
                                                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                                                            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                                                <div style={{ width: 36, height: 36, borderRadius: 10, background: status.glow, border: `1px solid ${status.border}`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                                                    <i className={`fa-solid ${meta.icon}`} style={{ color: status.color, fontSize: 13 }} />
                                                                </div>
                                                                <div>
                                                                    <p style={{ color: '#e2eaf7', fontWeight: 700, fontSize: '0.85rem' }}>Table {table.tableNumber}</p>
                                                                    <p style={{ color: meta.accent, fontSize: '0.68rem', fontWeight: 700, marginTop: 2 }}>{meta.title}</p>
                                                                </div>
                                                            </div>
                                                            {isSelected && <i className="fa-solid fa-circle-check" style={{ color: meta.accent, fontSize: 15 }} />}
                                                        </div>

                                                        <p style={{ color: '#c2d3f0', fontSize: '0.74rem', fontWeight: 600 }}>{table.seatingCapacity} seats</p>
                                                        <p style={{ color: status.color, fontSize: '0.68rem', fontWeight: 700, marginTop: 6 }}>{status.label}</p>
                                                        <p style={{ color: '#6b84b0', fontSize: '0.7rem', lineHeight: 1.45, marginTop: 6 }}>{table.description || meta.note}</p>
                                                        {!isAvailable && table.activeReservation && (
                                                            <p style={{ color: '#9fb2d6', fontSize: '0.68rem', lineHeight: 1.45, marginTop: 6 }}>
                                                                Reserved at {formatTime(table.activeReservation.reservationTime)}
                                                            </p>
                                                        )}
                                                    </button>
                                                );
                                            })}
                                        </div>
                                    )}
                                </div>

                                <div style={{ display: 'flex', gap: 10, paddingTop: 4 }}>
                                    <button type="button" onClick={() => setShowModal(false)} className="btn-neon-cyan" style={{ flex: 1, justifyContent: 'center' }}>Cancel</button>
                                    <button type="submit" style={{ flex: 1, justifyContent: 'center', display: 'inline-flex', alignItems: 'center', gap: 8, padding: '0.72rem 1.25rem', borderRadius: 10, fontWeight: 700, fontSize: '0.88rem', cursor: 'pointer', background: 'linear-gradient(135deg, #22c55e, #0ea5e9, #7c3aed)', border: 'none', color: '#fff', boxShadow: '0 0 20px rgba(14,165,233,0.22)' }}>
                                        <i className="fa-solid fa-calendar-check" style={{ fontSize: 13 }} /> Confirm Booking
                                    </button>
                                </div>
                            </form>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>

            <Footer />
        </div>
    );
};

export default CustomerReservation;

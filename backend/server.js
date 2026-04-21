// main server entry point - cafe management system
const express = require('express');
const cors = require('cors');
const path = require('path');
require('dotenv').config();
const { connectDB } = require('./config/db');

// import all route modules
const userRoutes = require('./common/user_management/routes/userRoutes');
const orderRoutes = require('./order_management/routes/orderRoutes');
const paymentRoutes = require('./billing_payment_management/routes/paymentRoutes');
const menuRoutes = require('./menu_inventory_management/routes/menuRoutes');
const tableRoutes = require('./table_reservation_management/routes/tableRoutes');

// initialize express app
const app = express();

// middleware setup
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// api routes
app.use('/api/users', userRoutes);
app.use('/api/orders', orderRoutes);
app.use('/api/payments', paymentRoutes);
app.use('/api/menu', menuRoutes);
app.use('/api/tables', tableRoutes);

// health check route
app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', message: 'Cafe Management System API is running' });
});

// root route
app.get('/', (req, res) => {
    res.json({ message: 'Welcome to Cafe Management System API' });
});

// start server
const PORT = process.env.PORT || 5000;

// connect to database and start server
connectDB().then(() => {
    app.listen(PORT, () => {
        console.log(`Server running on port ${PORT}`);
        console.log(`API: http://localhost:${PORT}/api/health`);
    });
}).catch(err => {
    console.error('Failed to start server:', err.message);
});

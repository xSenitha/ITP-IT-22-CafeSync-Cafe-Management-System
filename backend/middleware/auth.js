// JWT authentication middleware
const jwt = require('jsonwebtoken');
require('dotenv').config();

// verify token middleware — blocks unauthenticated requests
const authMiddleware = (req, res, next) => {
    try {
        const token = req.header('Authorization')?.replace('Bearer ', '');
        if (!token) {
            return res.status(401).json({ message: 'Access denied. No token provided.' });
        }
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        req.user = decoded;
        next();
    } catch (error) {
        return res.status(401).json({ message: 'Invalid or expired token.' });
    }
};

// optional auth — attaches user if token present, but allows unauthenticated requests through
const optionalAuth = (req, res, next) => {
    try {
        const token = req.header('Authorization')?.replace('Bearer ', '');
        if (token) {
            const decoded = jwt.verify(token, process.env.JWT_SECRET);
            req.user = decoded;
        }
    } catch (_) { /* ignore invalid tokens */ }
    next();
};

// admin role check middleware
const adminMiddleware = (req, res, next) => {
    if (req.user && req.user.role === 'admin') {
        next();
    } else {
        return res.status(403).json({ message: 'Access denied. Admin only.' });
    }
};

// admin or staff role check middleware
const staffOrAdminMiddleware = (req, res, next) => {
    if (req.user && (req.user.role === 'admin' || req.user.role === 'staff')) {
        next();
    } else {
        return res.status(403).json({ message: 'Access denied. Staff or admin only.' });
    }
};

module.exports = { authMiddleware, optionalAuth, adminMiddleware, staffOrAdminMiddleware };

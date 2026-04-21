// User management routes - auth and profile endpoints
const express = require('express');
const router = express.Router();
const { body } = require('express-validator');
const { register, adminCreateUser, login, getProfile, updateProfile, getAllUsers, updateUser, deleteUser } = require('../controllers/userController');
const { authMiddleware, adminMiddleware } = require('../../../middleware/auth');

const baseUserValidation = [
    body('firstName').trim().notEmpty().withMessage('First name is required'),
    body('lastName').trim().notEmpty().withMessage('Last name is required'),
    body('email').isEmail().withMessage('Valid email is required'),
    body('password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters'),
    body('phone')
        .optional({ values: 'falsy' })
        .matches(/^\+?\d{9,15}$/)
        .withMessage('Phone number must contain 9 to 15 digits')
];

// register route with validation
router.post('/register', baseUserValidation, register);

// login route
router.post('/login', [
    body('email').isEmail().withMessage('Valid email is required'),
    body('password').notEmpty().withMessage('Password is required')
], login);

// get profile (authenticated)
router.get('/profile', authMiddleware, getProfile);

// update profile (authenticated)
router.put('/profile', authMiddleware, updateProfile);

// get all users (admin and staff)
router.get('/all', authMiddleware, (req, res, next) => {
    if (req.user.role === 'admin' || req.user.role === 'staff') return next();
    return res.status(403).json({ message: 'Not authorized' });
}, getAllUsers);

// delete own account (authenticated user)
router.delete('/profile', authMiddleware, async (req, res) => {
    try {
        const User = require('../models/User');
        const user = await User.findByPk(req.user.id);
        if (!user) return res.status(404).json({ message: 'User not found' });
        await user.destroy();
        res.json({ message: 'Account deleted successfully' });
    } catch (error) {
        res.status(500).json({ message: 'Server error', error: error.message });
    }
});

// update user (admin only)
router.post(
    '/admin-create',
    authMiddleware,
    adminMiddleware,
    [
        ...baseUserValidation,
        body('role')
            .optional()
            .isIn(['admin', 'staff', 'customer'])
            .withMessage('Invalid role selected')
    ],
    adminCreateUser
);

router.put('/:id', authMiddleware, adminMiddleware, updateUser);

// delete user (admin only)
router.delete('/:id', authMiddleware, adminMiddleware, deleteUser);

module.exports = router;

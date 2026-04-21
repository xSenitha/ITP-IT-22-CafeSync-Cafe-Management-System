// User management controller - handles registration, login, profile
const User = require('../models/User');
const jwt = require('jsonwebtoken');
const { handleValidationErrors } = require('../../utils/validation');
require('dotenv').config();

// generate jwt token helper
const generateToken = (user) => {
    return jwt.sign(
        { id: user.id, email: user.email, role: user.role },
        process.env.JWT_SECRET,
        { expiresIn: process.env.JWT_EXPIRES_IN }
    );
};

const createUserAccount = async (req, res, { allowRoleOverride = false } = {}) => {
    try {
        const validationResponse = handleValidationErrors(req, res);
        if (validationResponse) {
            return validationResponse;
        }

        const { firstName, lastName, email, password, phone, role } = req.body;
        // check if user already exists
        const existingUser = await User.findOne({ where: { email } });
        if (existingUser) {
            return res.status(400).json({ message: 'User with this email already exists' });
        }
        // create new user
        const user = await User.create({
            firstName,
            lastName,
            email,
            password,
            phone,
            role: allowRoleOverride ? (role || 'staff') : 'customer'
        });
        // generate token
        const token = generateToken(user);
        return res.status(201).json({
            message: 'User registered successfully',
            token,
            user: { id: user.id, firstName: user.firstName, lastName: user.lastName, email: user.email, role: user.role }
        });
    } catch (error) {
        return res.status(500).json({ message: 'Server error', error: error.message });
    }
};

// register new public customer
const register = async (req, res) => {
    return createUserAccount(req, res, { allowRoleOverride: false });
};

// create staff/admin/customer from admin panel
const adminCreateUser = async (req, res) => {
    return createUserAccount(req, res, { allowRoleOverride: true });
};

// login user
const login = async (req, res) => {
    try {
        const { email, password } = req.body;
        // find user by email
        const user = await User.findOne({ where: { email } });
        if (!user) {
            return res.status(401).json({ message: 'Invalid email or password' });
        }
        // check if user is active
        if (!user.isActive) {
            return res.status(403).json({ message: 'Account is deactivated' });
        }
        // compare passwords
        const isMatch = await user.comparePassword(password);
        if (!isMatch) {
            return res.status(401).json({ message: 'Invalid email or password' });
        }
        // generate token
        const token = generateToken(user);
        res.json({
            message: 'Login successful',
            token,
            user: { id: user.id, firstName: user.firstName, lastName: user.lastName, email: user.email, role: user.role }
        });
    } catch (error) {
        res.status(500).json({ message: 'Server error', error: error.message });
    }
};

// get current user profile
const getProfile = async (req, res) => {
    try {
        const user = await User.findByPk(req.user.id, {
            attributes: { exclude: ['password'] }
        });
        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }
        res.json(user);
    } catch (error) {
        res.status(500).json({ message: 'Server error', error: error.message });
    }
};

// update user profile
const updateProfile = async (req, res) => {
    try {
        const { firstName, lastName, phone } = req.body;
        const user = await User.findByPk(req.user.id);
        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }
        // update fields
        await user.update({ firstName, lastName, phone });
        res.json({ message: 'Profile updated successfully', user: { id: user.id, firstName: user.firstName, lastName: user.lastName, email: user.email, role: user.role, phone: user.phone } });
    } catch (error) {
        res.status(500).json({ message: 'Server error', error: error.message });
    }
};

// get all users (admin only)
const getAllUsers = async (req, res) => {
    try {
        const users = await User.findAll({ attributes: { exclude: ['password'] } });
        res.json(users);
    } catch (error) {
        res.status(500).json({ message: 'Server error', error: error.message });
    }
};

// update user (admin only) - change role, active status, etc.
const updateUser = async (req, res) => {
    try {
        const user = await User.findByPk(req.params.id);
        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }
        const { firstName, lastName, phone, role, isActive } = req.body;
        await user.update({ firstName, lastName, phone, role, isActive });
        res.json({ message: 'User updated successfully', user: { id: user.id, firstName: user.firstName, lastName: user.lastName, email: user.email, role: user.role, phone: user.phone, isActive: user.isActive } });
    } catch (error) {
        res.status(500).json({ message: 'Server error', error: error.message });
    }
};

// delete user (admin only)
const deleteUser = async (req, res) => {
    try {
        const user = await User.findByPk(req.params.id);
        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }
        await user.destroy();
        res.json({ message: 'User deleted successfully' });
    } catch (error) {
        res.status(500).json({ message: 'Server error', error: error.message });
    }
};

module.exports = { register, adminCreateUser, login, getProfile, updateProfile, getAllUsers, updateUser, deleteUser };

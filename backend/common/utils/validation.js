const { validationResult } = require('express-validator');

const handleValidationErrors = (req, res) => {
    const errors = validationResult(req);
    if (errors.isEmpty()) {
        return null;
    }

    return res.status(400).json({
        message: errors.array()[0].msg,
        errors: errors.array()
    });
};

module.exports = { handleValidationErrors };

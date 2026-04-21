const nodemailer = require('nodemailer');
require('dotenv').config();

let transporter = null;

const isMailConfigured = () => {
    return Boolean(process.env.MAIL_HOST && process.env.MAIL_PORT && (process.env.MAIL_FROM || process.env.MAIL_USER));
};

const getTransporter = () => {
    if (!isMailConfigured()) {
        return null;
    }

    if (!transporter) {
        transporter = nodemailer.createTransport({
            host: process.env.MAIL_HOST,
            port: Number(process.env.MAIL_PORT),
            secure: process.env.MAIL_SECURE === 'true' || Number(process.env.MAIL_PORT) === 465,
            auth: process.env.MAIL_USER && process.env.MAIL_PASS
                ? {
                    user: process.env.MAIL_USER,
                    pass: process.env.MAIL_PASS
                }
                : undefined
        });
    }

    return transporter;
};

const sendMail = async ({ to, subject, html, text }) => {
    const activeTransporter = getTransporter();

    if (!activeTransporter) {
        return {
            sent: false,
            disabled: true,
            message: 'Mail service is not configured. Add MAIL_HOST, MAIL_PORT and MAIL_FROM in backend .env'
        };
    }

    const info = await activeTransporter.sendMail({
        from: process.env.MAIL_FROM || process.env.MAIL_USER,
        to,
        subject,
        html,
        text
    });

    if (Array.isArray(info.rejected) && info.rejected.length > 0) {
        return {
            sent: false,
            disabled: false,
            message: `Mail server rejected recipient(s): ${info.rejected.join(', ')}`
        };
    }

    return {
        sent: true,
        disabled: false,
        accepted: info.accepted || []
    };
};

module.exports = {
    sendMail,
    isMailConfigured
};

const QRCode = require('qrcode');

const generateQrDataUrl = async (value, options = {}) => {
    return QRCode.toDataURL(value, {
        width: options.width || 240,
        margin: options.margin ?? 1,
        errorCorrectionLevel: options.errorCorrectionLevel || 'M',
        color: options.color || {
            dark: '#0F172A',
            light: '#FFFFFFFF'
        }
    });
};

module.exports = { generateQrDataUrl };

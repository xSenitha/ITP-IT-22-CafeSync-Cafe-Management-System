// Invoice controller - Bandara (IT24104140) - CRUD operations for invoices
const { body } = require('express-validator');
const Invoice = require('../models/Invoice');
const Payment = require('../models/Payment');
const { handleValidationErrors } = require('../../common/utils/validation');
const { generateQrDataUrl } = require('../../common/services/qrService');
const { sendMail } = require('../../common/services/mailService');
const { sendWorkbook } = require('../../common/services/exportService');
const { createPdfDocument, addDocumentHeader, addRecordBlock, addEmptyState, finalizePdf } = require('../../common/services/pdfService');

const validateInvoice = [
    body('paymentId').notEmpty().withMessage('Payment is required').isInt({ min: 1 }).withMessage('Payment ID must be valid'),
    body('customerName').trim().notEmpty().withMessage('Customer name is required').isLength({ max: 100 }).withMessage('Customer name is too long'),
    body('customerEmail').optional({ values: 'falsy' }).isEmail().withMessage('Customer email must be valid'),
    body('subtotal').notEmpty().withMessage('Subtotal is required').isFloat({ min: 0.01 }).withMessage('Subtotal must be greater than 0'),
    body('tax').optional().isFloat({ min: 0 }).withMessage('Tax cannot be negative'),
    body('discount').optional().isFloat({ min: 0 }).withMessage('Discount cannot be negative'),
    body('status').optional().isIn(['draft', 'sent', 'paid', 'cancelled']).withMessage('Invalid invoice status')
];

// generate unique invoice number
const generateInvoiceNumber = () => {
    const timestamp = Date.now().toString(36).toUpperCase();
    const random = Math.random().toString(36).substring(2, 5).toUpperCase();
    return `INV-${timestamp}-${random}`;
};

const buildInvoiceQrValue = (invoice) => {
    return [
        `Invoice: ${invoice.invoiceNumber}`,
        `Customer: ${invoice.customerName}`,
        `Grand Total: LKR ${parseFloat(invoice.grandTotal).toFixed(2)}`
    ].join('\n');
};

const buildInvoiceEmailHtml = (invoice, qrDataUrl) => {
    return `
        <div style="font-family: Arial, sans-serif; color: #0f172a; line-height: 1.6;">
            <h2 style="margin-bottom: 6px;">CafeSync Invoice</h2>
            <p style="margin-top: 0;">Invoice Number: <strong>${invoice.invoiceNumber}</strong></p>
            <p>Hello ${invoice.customerName},</p>
            <p>Your invoice is ready. Here is a quick summary:</p>
            <table style="border-collapse: collapse; width: 100%; max-width: 420px;">
                <tr><td style="padding: 8px; border: 1px solid #cbd5e1;">Subtotal</td><td style="padding: 8px; border: 1px solid #cbd5e1;">LKR ${parseFloat(invoice.subtotal).toFixed(2)}</td></tr>
                <tr><td style="padding: 8px; border: 1px solid #cbd5e1;">Tax</td><td style="padding: 8px; border: 1px solid #cbd5e1;">LKR ${parseFloat(invoice.tax).toFixed(2)}</td></tr>
                <tr><td style="padding: 8px; border: 1px solid #cbd5e1;">Discount</td><td style="padding: 8px; border: 1px solid #cbd5e1;">LKR ${parseFloat(invoice.discount).toFixed(2)}</td></tr>
                <tr><td style="padding: 8px; border: 1px solid #cbd5e1; font-weight: bold;">Grand Total</td><td style="padding: 8px; border: 1px solid #cbd5e1; font-weight: bold;">LKR ${parseFloat(invoice.grandTotal).toFixed(2)}</td></tr>
            </table>
            <p style="margin-top: 16px;">Scan the QR code below to verify this invoice quickly:</p>
            <img src="${qrDataUrl}" alt="Invoice QR" style="width: 180px; height: 180px;" />
            <p style="margin-top: 16px;">Thank you for choosing CafeSync.</p>
        </div>
    `;
};

// create a new invoice
const createInvoice = async (req, res) => {
    const validationResponse = handleValidationErrors(req, res);
    if (validationResponse) return validationResponse;

    try {
        const { paymentId, customerName, customerEmail, subtotal, tax, discount, status } = req.body;
        // verify payment exists
        const payment = await Payment.findByPk(paymentId);
        if (!payment) {
            return res.status(404).json({ message: 'Payment not found' });
        }
        // calculate grand total
        const grandTotal = parseFloat(subtotal) + parseFloat(tax || 0) - parseFloat(discount || 0);
        if (grandTotal <= 0) {
            return res.status(400).json({ message: 'Grand total must be greater than 0' });
        }
        const invoiceNumber = generateInvoiceNumber();
        // create invoice
        const invoice = await Invoice.create({
            invoiceNumber,
            paymentId,
            customerName,
            customerEmail,
            subtotal,
            tax: tax || 0,
            discount: discount || 0,
            grandTotal,
            status: status || 'draft'
        });
        res.status(201).json({ message: 'Invoice created successfully', invoice });
    } catch (error) {
        res.status(500).json({ message: 'Failed to create invoice', error: error.message });
    }
};

// get all invoices
const getAllInvoices = async (req, res) => {
    try {
        const invoices = await Invoice.findAll({
            include: [{ model: Payment, as: 'payment' }],
            order: [['createdAt', 'DESC']]
        });
        res.json(invoices);
    } catch (error) {
        res.status(500).json({ message: 'Failed to fetch invoices', error: error.message });
    }
};

// get single invoice by id
const getInvoiceById = async (req, res) => {
    try {
        const invoice = await Invoice.findByPk(req.params.id, { include: [{ model: Payment, as: 'payment' }] });
        if (!invoice) {
            return res.status(404).json({ message: 'Invoice not found' });
        }
        res.json(invoice);
    } catch (error) {
        res.status(500).json({ message: 'Failed to fetch invoice', error: error.message });
    }
};

// get invoice qr
const getInvoiceQr = async (req, res) => {
    try {
        const invoice = await Invoice.findByPk(req.params.id);
        if (!invoice) {
            return res.status(404).json({ message: 'Invoice not found' });
        }

        const qrDataUrl = await generateQrDataUrl(buildInvoiceQrValue(invoice));
        return res.json({
            invoiceNumber: invoice.invoiceNumber,
            qrDataUrl
        });
    } catch (error) {
        return res.status(500).json({ message: 'Failed to generate invoice QR', error: error.message });
    }
};

// send invoice email
const sendInvoiceEmail = async (req, res) => {
    try {
        const invoice = await Invoice.findByPk(req.params.id);
        if (!invoice) {
            return res.status(404).json({ message: 'Invoice not found' });
        }

        if (!invoice.customerEmail) {
            return res.status(400).json({ message: 'Customer email is required before sending invoice email' });
        }

        const qrDataUrl = await generateQrDataUrl(buildInvoiceQrValue(invoice));
        const result = await sendMail({
            to: invoice.customerEmail,
            subject: `CafeSync Invoice ${invoice.invoiceNumber}`,
            html: buildInvoiceEmailHtml(invoice, qrDataUrl),
            text: `Invoice ${invoice.invoiceNumber} total: LKR ${parseFloat(invoice.grandTotal).toFixed(2)}`
        });

        if (!result.sent) {
            return res.status(400).json({ message: result.message });
        }

        await invoice.update({ status: invoice.status === 'draft' ? 'sent' : invoice.status });
        return res.json({ message: 'Invoice email sent successfully' });
    } catch (error) {
        return res.status(500).json({ message: 'Failed to send invoice email', error: error.message });
    }
};

// update invoice
const updateInvoice = async (req, res) => {
    const validationResponse = handleValidationErrors(req, res);
    if (validationResponse) return validationResponse;

    try {
        const invoice = await Invoice.findByPk(req.params.id);
        if (!invoice) {
            return res.status(404).json({ message: 'Invoice not found' });
        }
        const { customerName, customerEmail, subtotal, tax, discount, status } = req.body;
        // recalculate grand total if amounts changed
        const newSubtotal = subtotal !== undefined ? subtotal : invoice.subtotal;
        const newTax = tax !== undefined ? tax : invoice.tax;
        const newDiscount = discount !== undefined ? discount : invoice.discount;
        const grandTotal = parseFloat(newSubtotal) + parseFloat(newTax) - parseFloat(newDiscount);

        if (grandTotal <= 0) {
            return res.status(400).json({ message: 'Grand total must be greater than 0' });
        }

        // update invoice
        await invoice.update({
            customerName: customerName !== undefined ? customerName : invoice.customerName,
            customerEmail: customerEmail !== undefined ? customerEmail : invoice.customerEmail,
            subtotal: newSubtotal,
            tax: newTax,
            discount: newDiscount,
            grandTotal,
            status: status || invoice.status
        });
        res.json({ message: 'Invoice updated successfully', invoice });
    } catch (error) {
        res.status(500).json({ message: 'Failed to update invoice', error: error.message });
    }
};

// delete invoice
const deleteInvoice = async (req, res) => {
    try {
        const invoice = await Invoice.findByPk(req.params.id);
        if (!invoice) {
            return res.status(404).json({ message: 'Invoice not found' });
        }
        await invoice.destroy();
        res.json({ message: 'Invoice deleted successfully' });
    } catch (error) {
        res.status(500).json({ message: 'Failed to delete invoice', error: error.message });
    }
};

// export invoices to excel
const exportInvoices = async (req, res) => {
    try {
        const invoices = await Invoice.findAll({ order: [['createdAt', 'DESC']] });
        const rows = invoices.map((invoice) => ({
            InvoiceNumber: invoice.invoiceNumber,
            PaymentId: invoice.paymentId,
            CustomerName: invoice.customerName,
            CustomerEmail: invoice.customerEmail || '',
            Subtotal: Number(invoice.subtotal),
            Tax: Number(invoice.tax),
            Discount: Number(invoice.discount),
            GrandTotal: Number(invoice.grandTotal),
            Status: invoice.status,
            InvoiceDate: invoice.invoiceDate,
            CreatedAt: invoice.createdAt
        }));

        return sendWorkbook(res, 'invoices-report.xlsx', [
            { name: 'Invoices', rows }
        ]);
    } catch (error) {
        return res.status(500).json({ message: 'Failed to export invoices', error: error.message });
    }
};

const downloadInvoicePdf = async (req, res) => {
    try {
        const invoice = await Invoice.findByPk(req.params.id, { include: [{ model: Payment, as: 'payment' }] });
        if (!invoice) {
            return res.status(404).json({ message: 'Invoice not found' });
        }

        const doc = createPdfDocument(res, `${invoice.invoiceNumber}.pdf`);
        addDocumentHeader(doc, 'CafeSync Invoice', `Invoice Number: ${invoice.invoiceNumber}`);

        addRecordBlock(doc, 'Customer Details', [
            { label: 'Customer Name', value: invoice.customerName },
            { label: 'Customer Email', value: invoice.customerEmail || '-' },
            { label: 'Status', value: invoice.status },
            { label: 'Payment ID', value: String(invoice.paymentId) }
        ]);

        addRecordBlock(doc, 'Invoice Summary', [
            { label: 'Subtotal', value: `LKR ${Number(invoice.subtotal).toFixed(2)}` },
            { label: 'Tax', value: `LKR ${Number(invoice.tax).toFixed(2)}` },
            { label: 'Discount', value: `LKR ${Number(invoice.discount).toFixed(2)}` },
            { label: 'Grand Total', value: `LKR ${Number(invoice.grandTotal).toFixed(2)}` }
        ]);

        if (invoice.payment) {
            addRecordBlock(doc, 'Payment Details', [
                { label: 'Payment Number', value: invoice.payment.paymentNumber },
                { label: 'Payment Method', value: invoice.payment.paymentMethod },
                { label: 'Payment Status', value: invoice.payment.paymentStatus },
                { label: 'Paid By', value: invoice.payment.paidBy || '-' }
            ]);
        }

        return finalizePdf(doc);
    } catch (error) {
        return res.status(500).json({ message: 'Failed to download invoice PDF', error: error.message });
    }
};

const exportInvoicesPdf = async (req, res) => {
    try {
        const invoices = await Invoice.findAll({ order: [['createdAt', 'DESC']] });
        const doc = createPdfDocument(res, 'invoices-report.pdf');

        addDocumentHeader(doc, 'CafeSync Invoices Report', `Total invoices: ${invoices.length}`);

        if (!invoices.length) {
            addEmptyState(doc, 'No invoices are available right now.');
            return finalizePdf(doc);
        }

        invoices.forEach((invoice) => {
            addRecordBlock(doc, invoice.invoiceNumber, [
                { label: 'Customer Name', value: invoice.customerName },
                { label: 'Customer Email', value: invoice.customerEmail || '-' },
                { label: 'Status', value: invoice.status },
                { label: 'Payment ID', value: String(invoice.paymentId) },
                { label: 'Subtotal', value: `LKR ${Number(invoice.subtotal).toFixed(2)}` },
                { label: 'Tax', value: `LKR ${Number(invoice.tax).toFixed(2)}` },
                { label: 'Discount', value: `LKR ${Number(invoice.discount).toFixed(2)}` },
                { label: 'Grand Total', value: `LKR ${Number(invoice.grandTotal).toFixed(2)}` }
            ]);
        });

        return finalizePdf(doc);
    } catch (error) {
        return res.status(500).json({ message: 'Failed to export invoices PDF', error: error.message });
    }
};

module.exports = {
    validateInvoice,
    createInvoice,
    getAllInvoices,
    getInvoiceById,
    getInvoiceQr,
    sendInvoiceEmail,
    updateInvoice,
    deleteInvoice,
    exportInvoices,
    downloadInvoicePdf,
    exportInvoicesPdf
};

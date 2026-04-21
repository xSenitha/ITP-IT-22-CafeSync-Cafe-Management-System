const PDFDocument = require('pdfkit');

const createPdfDocument = (res, fileName) => {
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`);

    const doc = new PDFDocument({
        size: 'A4',
        margin: 50
    });

    doc.pipe(res);
    return doc;
};

const addDocumentHeader = (doc, title, subtitle = '') => {
    doc
        .fontSize(20)
        .fillColor('#111827')
        .text(title, { align: 'left' });

    doc
        .moveDown(0.2)
        .fontSize(10)
        .fillColor('#6b7280')
        .text(`Generated on ${new Date().toLocaleString()}`);

    if (subtitle) {
        doc
            .moveDown(0.2)
            .fontSize(10)
            .fillColor('#6b7280')
            .text(subtitle);
    }

    doc.moveDown(1);
};

const ensurePageSpace = (doc, requiredHeight = 120) => {
    if (doc.y + requiredHeight > doc.page.height - 50) {
        doc.addPage();
    }
};

const addInfoGrid = (doc, fields) => {
    const columnGap = 24;
    const columnWidth = (doc.page.width - doc.page.margins.left - doc.page.margins.right - columnGap) / 2;
    const rowHeight = 34;
    const startX = doc.page.margins.left;

    for (let index = 0; index < fields.length; index += 2) {
        ensurePageSpace(doc, rowHeight + 10);
        const rowItems = fields.slice(index, index + 2);
        const currentY = doc.y;

        rowItems.forEach((field, columnIndex) => {
            const x = startX + (columnIndex * (columnWidth + columnGap));
            doc
                .fontSize(9)
                .fillColor('#6b7280')
                .text(field.label, x, currentY, { width: columnWidth });

            doc
                .fontSize(11)
                .fillColor('#111827')
                .text(field.value ?? '-', x, currentY + 12, { width: columnWidth });
        });

        doc.y = currentY + rowHeight;
    }
};

const addRecordBlock = (doc, title, fields) => {
    ensurePageSpace(doc, 130);

    const blockTop = doc.y;
    doc
        .roundedRect(doc.page.margins.left, blockTop, doc.page.width - doc.page.margins.left - doc.page.margins.right, 20, 6)
        .fill('#f3f4f6');

    doc
        .fillColor('#111827')
        .fontSize(12)
        .text(title, doc.page.margins.left + 10, blockTop + 5);

    doc.y = blockTop + 30;
    addInfoGrid(doc, fields);
    doc.moveDown(0.3);

    doc
        .moveTo(doc.page.margins.left, doc.y)
        .lineTo(doc.page.width - doc.page.margins.right, doc.y)
        .strokeColor('#e5e7eb')
        .stroke();

    doc.moveDown(0.8);
};

const addEmptyState = (doc, message) => {
    doc
        .fontSize(11)
        .fillColor('#6b7280')
        .text(message);
};

const finalizePdf = (doc) => {
    doc.end();
};

module.exports = {
    createPdfDocument,
    addDocumentHeader,
    addRecordBlock,
    addEmptyState,
    finalizePdf
};

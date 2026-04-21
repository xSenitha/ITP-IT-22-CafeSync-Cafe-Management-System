const XLSX = require('xlsx');

const buildWorkbookBuffer = (sheets) => {
    const workbook = XLSX.utils.book_new();

    sheets.forEach(({ name, rows }) => {
        const sheet = XLSX.utils.json_to_sheet(rows);
        XLSX.utils.book_append_sheet(workbook, sheet, name);
    });

    return XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });
};

const sendWorkbook = (res, fileName, sheets) => {
    const buffer = buildWorkbookBuffer(sheets);
    res.setHeader(
        'Content-Type',
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    );
    res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`);
    res.send(buffer);
};

module.exports = {
    sendWorkbook,
    buildWorkbookBuffer
};

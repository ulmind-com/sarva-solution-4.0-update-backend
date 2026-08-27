import PDFDocument from 'pdfkit';
import moment from 'moment-timezone';

/**
 * Generate Invoice PDF Buffer (Redesigned)
 * @param {Object} data - Invoice data object
 * @returns {Promise<Buffer>} - PDF file as Buffer
 */
export const generateInvoicePDFBuffer = async (data) => {
    return new Promise((resolve, reject) => {
        try {
            console.log('Generating PDF with data:', JSON.stringify(data, null, 2));

            // Validate Data Structure
            if (!data || !data.details || !data.sender || !data.receiver || !data.items) {
                console.error('Invalid Invoice Data Structure:', data);
                // Return empty buffer instead of crashing
                return resolve(Buffer.from('Error generating PDF: Invalid Data'));
            }

            const doc = new PDFDocument({ margin: 30, size: 'A4' });
            const buffers = [];

            doc.on('data', buffers.push.bind(buffers));
            doc.on('end', () => {
                try {
                    const pdfBuffer = Buffer.concat(buffers);
                    console.log('PDF Generated Size:', pdfBuffer.length);
                    resolve(pdfBuffer);
                } catch (err) {
                    console.error('Buffer Concat Error:', err);
                    reject(err);
                }
            });
            doc.on('error', (err) => {
                console.error('PDFKit Error:', err);
                reject(err);
            });

            // --- Helper Functions ---
            const drawRect = (x, y, w, h) => doc.rect(x, y, w, h).stroke();
            const drawLine = (x1, y1, x2, y2) => doc.moveTo(x1, y1).lineTo(x2, y2).stroke();

            // --- 1. Header (Top Block) ---
            // Logo Placeholder (Using text for now, assume logo path passed if needed)
            // doc.image('path/to/logo.png', 40, 40, { width: 50 }); 

            doc.font('Helvetica-Bold').fontSize(16).text('GST INVOICE', 0, 40, { align: 'center' });
            doc.moveDown();

            // Top Border Line
            const startY = 70;
            drawLine(30, startY, 565, startY);

            // --- 2. Information Block (Left & Right) ---
            doc.font('Helvetica').fontSize(9);

            // Left Column (Sender/GST Info)
            let leftY = startY + 10;
            const senderGst = data.sender?.gstin || 'N/A';
            doc.text(`GST No. : ${senderGst}`, 40, leftY);
            leftY += 12;
            doc.text(`Tax is payable on Reverse Charge : ${data.details?.reverseCharge || 'No'}`, 40, leftY);
            leftY += 12;
            doc.text(`Invoice No. : ${data.details?.invoiceNo || '-'}`, 40, leftY);
            leftY += 12;
            const invoiceDateStr = data.details?.invoiceDate
                ? moment(data.details.invoiceDate).tz('Asia/Kolkata').format('DD/MM/YYYY')
                : moment().tz('Asia/Kolkata').format('DD/MM/YYYY');
            doc.text(`Date : ${invoiceDateStr}`, 40, leftY);

            // Right Column (Transport Info)
            let rightY = startY + 10;
            const rightX = 300;
            doc.text(`Transportation Mode: ${data.details?.transportMode || 'By Road'}`, rightX, rightY);
            rightY += 12;
            doc.text(`Transport No : ${data.details?.transportNo || '-'}`, rightX, rightY);
            rightY += 12;
            doc.text(`E-Way Bill No. : ${data.details?.ewayBillNo || '-'}`, rightX, rightY);
            rightY += 12;
            doc.text(`L.R No : ${data.details?.lrNo || '-'}`, rightX, rightY);

            // Separator Line
            drawLine(30, leftY + 20, 565, leftY + 20);

            // --- 3. Parties Block (Receiver vs Sender) ---
            const partiesY = leftY + 30;

            // Bill To (Receiver - Left)
            doc.font('Helvetica-Bold').text('Details Of Receiver(Billed To)', 40, partiesY);
            doc.font('Helvetica');
            let recY = partiesY + 15;

            const recNameHeight = doc.heightOfString(`Name : ${data.receiver?.name || 'Grand User'}`, { width: 250 });
            doc.text(`Name : ${data.receiver?.name || 'Grand User'}`, 40, recY, { width: 250 });
            recY += recNameHeight + 2; // +2 padding

            const recAddressText = `Address : ${data.receiver?.fullAddress || ''}`;
            const recAddressHeight = doc.heightOfString(recAddressText, { width: 250 });
            doc.text(recAddressText, 40, recY, { width: 250 });
            recY += recAddressHeight + 2;

            doc.text(`City : ${data.receiver?.city || ''}`, 40, recY);
            recY += 12;
            doc.text(`State : ${data.receiver?.state || ''}`, 40, recY);
            recY += 12;
            doc.text(`Pincode : ${data.receiver?.pincode || ''}`, 40, recY);
            recY += 12;
            doc.text(`Contact : ${data.receiver?.phone || ''}`, 40, recY);
            recY += 12; // Final increment to ensure spacing from table

            // Ship To (Sender/Franchise - Right)
            doc.font('Helvetica-Bold').text('Details Of Sender(Ship To)', rightX, partiesY);
            doc.font('Helvetica');
            let sendY = partiesY + 15;

            const sendNameText = `Name : ${data.sender?.name || 'Sarva Solution'}`;
            const sendNameHeight = doc.heightOfString(sendNameText, { width: 250 });
            doc.text(sendNameText, rightX, sendY, { width: 250 });
            sendY += sendNameHeight + 2;

            const senderAddrText = `Address : ${data.sender?.address || ''}, ${data.sender?.city || ''}`;
            const senderAddrHeight = doc.heightOfString(senderAddrText, { width: 250 });
            doc.text(senderAddrText, rightX, sendY, { width: 250 });
            sendY += senderAddrHeight + 2;

            doc.text(`State : ${data.sender?.state || ''}`, rightX, sendY);
            sendY += 12;
            doc.text(`Contact No : ${data.sender?.phone || ''}`, rightX, sendY);
            sendY += 12;

            // --- 4. Table Grid ---
            const tableTop = Math.max(recY, sendY) + 20;
            // Removed Batch and UOM columns as per requirement
            // Adjusted widths to fit 535px total (approx A4 usable width)
            // Sl:25, Desc:140, HSN:40, Qty:30, Rate:40, MRP:40, Gross:45, Disc:25, Taxable:45, CGST:35, SGST:35, IGST:35
            const colWidths = [25, 140, 40, 30, 40, 40, 45, 25, 45, 35, 35, 35];
            // Cols: Sl, Description, HSN, QTY, Rate, MRP, Gross, Disc, Taxable, CGST, SGST, IGST
            // X Positions Calculation
            let currentX = 30;
            const colX = colWidths.map(w => {
                const x = currentX;
                currentX += w;
                return x;
            });

            // Headers (removed Batch and UOM)
            const headers = [
                'Sl', 'Description of Goods', 'HSN', 'QTY', 'Rate', 'MRP',
                'Gross', 'Disc', 'Taxable', 'CGST', 'SGST', 'IGST'
            ];

            // Draw Table Header
            drawRect(30, tableTop, 535, 30); // 535 is total width
            // Vertical lines for columns
            colX.forEach((x, i) => {
                if (i > 0) drawLine(x, tableTop, x, tableTop + 30);
            });

            doc.font('Helvetica-Bold').fontSize(7);
            headers.forEach((h, i) => {
                doc.text(h, colX[i] + 2, tableTop + 10, { width: colWidths[i] - 4, align: 'center' });
            });

            // Table Rows
            let rowY = tableTop + 30;
            doc.font('Helvetica').fontSize(7);

            data.items.forEach((item, index) => {
                const rowHeight = 20;

                // Draw Row Box
                drawRect(30, rowY, 535, rowHeight);
                colX.forEach((x, i) => {
                    if (i > 0) drawLine(x, rowY, x, rowY + rowHeight);
                });

                // Fill Data (removed Batch and UOM)
                const values = [
                    index + 1,
                    item.productName,
                    item.hsnCode || '-',
                    item.quantity,
                    item.rate.toFixed(2),
                    item.mrp.toFixed(2),
                    (item.rate * item.quantity).toFixed(2), // Gross
                    '0', // Disc
                    item.taxableValue.toFixed(2),
                    item.cgstAmount ? item.cgstAmount.toFixed(2) : '-',
                    item.sgstAmount ? item.sgstAmount.toFixed(2) : '-',
                    item.igstAmount ? item.igstAmount.toFixed(2) : '-'
                ];

                values.forEach((v, i) => {
                    doc.text(String(v), colX[i] + 2, rowY + 6, { width: colWidths[i] - 4, align: i === 1 ? 'left' : 'center' });
                });

                rowY += rowHeight;
            });

            // --- 5. Totals Section ---
            const footerStart = rowY;

            // Total PV or BV (Conditional based on purchase type)
            // First Purchase: Show "Total P.V"
            // Repurchase: Show "Total B.V"
            drawRect(30, footerStart, 150, 20);
            if (data.isFirstPurchase) {
                doc.font('Helvetica-Bold').text(`Total P.V : ${data.totals.totalPV}`, 35, footerStart + 6);
            } else {
                doc.font('Helvetica-Bold').text(`Total B.V : ${data.totals.totalBV || 0}`, 35, footerStart + 6);
            }

            // Gross Total
            drawRect(180, footerStart, 385, 20); // Spanning right
            doc.text('Gross Total', 400, footerStart + 6);
            doc.text(data.totals.grandTotal.toFixed(2), 500, footerStart + 6, { align: 'right', width: 60 });

            // Tax Rows
            let currentFooterY = footerStart + 20;
            const addFooterRow = (label, value) => {
                drawRect(180, currentFooterY, 385, 20);
                doc.text(label, 400, currentFooterY + 6);
                doc.text(value, 500, currentFooterY + 6, { align: 'right', width: 60 });
                currentFooterY += 20;
            };

            addFooterRow('CGST', data.totals.totalCGST.toFixed(2));
            addFooterRow('SGST', data.totals.totalSGST.toFixed(2));
            addFooterRow('IGST', data.totals.totalIGST.toFixed(2));
            addFooterRow('Net Amount', data.totals.grandTotal.toFixed(2));
            addFooterRow('Discount', '0.00');
            addFooterRow('Transport Charge', '0.00');

            // Payable (Bold)
            drawRect(180, currentFooterY, 385, 25);
            doc.fontSize(9).text('Payable', 400, currentFooterY + 8);
            doc.text(Math.round(data.totals.grandTotal), 500, currentFooterY + 8, { align: 'right', width: 60 });

            // --- 6. Signature ---
            const sigY = currentFooterY + 50;
            doc.fontSize(8).text('Authorised Signature', 450, sigY);
            doc.text(`For ${data.sender?.shopName || 'Authorised Signatory'}`, 400, sigY + 15, { align: 'right', width: 150 });

            console.log('Finalizing PDF Document...');
            doc.end();
            console.log('doc.end() called.');
        } catch (error) {
            console.error('Critical PDF Generation Error:', error);
            resolve(Buffer.from('Error generating PDF: Internal Error'));
        }
    });
};

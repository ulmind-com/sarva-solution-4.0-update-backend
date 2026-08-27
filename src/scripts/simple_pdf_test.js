import PDFDocument from 'pdfkit';
import fs from 'fs';

const testSimplePdf = () => {
    console.log('Starting Simple PDF Test');
    try {
        const doc = new PDFDocument();
        const buffers = [];

        doc.on('data', buffers.push.bind(buffers));
        doc.on('end', () => {
            console.log('PDF Ended. Concatenating...');
            const pdfData = Buffer.concat(buffers);
            console.log('PDF Size:', pdfData.length);
            fs.writeFileSync('simple.pdf', pdfData);
            console.log('Saved simple.pdf');
        });

        doc.fontSize(25).text('Hello World', 100, 100);
        console.log('Text added');

        doc.end();
        console.log('Doc ended');
    } catch (err) {
        console.error('Error:', err);
    }
};

testSimplePdf();

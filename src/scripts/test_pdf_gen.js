import fs from 'fs';
import { generateInvoicePDFBuffer } from '../services/integration/pdf.service.js';

const testPdfGen = async () => {
    const mockData = {
        details: {
            invoiceNo: 'INV-TEST-001',
            invoiceDate: new Date(),
            transportMode: 'Road',
            transportNo: 'TR-123',
            ewayBillNo: 'EW-456',
            lrNo: 'LR-789'
        },
        sender: {
            name: 'Sarva Solution',
            address: '123 Test Street',
            city: 'Kolkata',
            state: 'West Bengal',
            phone: '9832775700',
            gstin: '19ABCDE1234F1Z5',
            shopName: 'Head Office'
        },
        receiver: {
            name: 'Test Franchise',
            fullAddress: '456 Franchise Road',
            city: 'Howrah',
            state: 'West Bengal',
            pincode: '711101',
            phone: '9876543210'
        },
        items: [
            {
                productName: 'Test Product 1',
                hsnCode: '3004',
                quantity: 10,
                rate: 100,
                mrp: 150,
                taxableValue: 1000,
                cgstAmount: 90,
                sgstAmount: 90,
                igstAmount: 0
            },
            {
                productName: 'Test Product 2',
                hsnCode: '3005',
                quantity: 5,
                rate: 200,
                mrp: 300,
                taxableValue: 1000,
                cgstAmount: 90,
                sgstAmount: 90,
                igstAmount: 0
            }
        ],
        totals: {
            subTotal: 2000,
            totalCGST: 180,
            totalSGST: 180,
            totalIGST: 0,
            grandTotal: 2360,
            totalBV: 50
        },
        isFirstPurchase: false
    };

    try {
        console.log('Generating PDF...');
        const buffer = await generateInvoicePDFBuffer(mockData);
        console.log('Buffer generated. Size:', buffer.length);

        if (buffer.length === 0) {
            console.error('Error: Buffer is empty!');
        } else {
            fs.writeFileSync('test_invoice.pdf', buffer);
            console.log('Saved to test_invoice.pdf');
        }
    } catch (error) {
        console.error('Error generating PDF:', error);
    }
};

testPdfGen();

import { fetch, FormData, File } from 'node-fetch'; // Standard node-fetch doesn't have FormData/File built-in the same way browsers do? 
// Node 22 has built-in fetch and FormData.
// Let's rely on built-in globals.

import fs from 'fs';
import path from 'path';

async function testCreateProduct() {
    try {
        const formData = new FormData();
        formData.append('productName', 'Test Product ' + Date.now());
        formData.append('description', 'Test Description');
        formData.append('price', '100');
        formData.append('mrp', '150');
        formData.append('category', 'agriculture');
        formData.append('stockQuantity', '10');
        formData.append('hsnCode', '123456');
        formData.append('reorderLevel', '5');
        formData.append('sku', 'SKU-' + Date.now());
        formData.append('bv', '10');
        formData.append('pv', '5');

        // Create a dummy file
        const filePath = 'dummy_image.jpg';
        if (!fs.existsSync(filePath)) {
            fs.writeFileSync(filePath, 'dummy content');
        }

        const fileBlob = new Blob(['dummy content'], { type: 'image/jpeg' });
        formData.append('productImage', fileBlob, 'dummy_image.jpg');

        // Login first to get token (Assuming admin login works)
        // For reproduction, I might need a token. 
        // Or I can temporarily disable auth in the route for testing? 
        // Better to login.

        const loginRes = await fetch('http://localhost:8000/api/v1/login/user', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                memberId: 'ADMIN_ID', // Replaced with actual if known, or skip if I can't login
                password: 'password'
            })
        });

        // Wait, I don't know correct credentials.
        // I'll assume I can inspect the DB or use a known one.
        // Actually, looking at `implementation_plan.md` or logs might reveal.

        // Option B: Mock the auth middleware? No, requires restart.

        // Let's try to hit the endpoint anyway. If it returns 401, I know server is up.
        // If it returns 400 (Missing fields), then auth passed? No.

        console.log("Sending request...");
        const res = await fetch('http://localhost:8000/api/v1/admin/product/create', {
            method: 'POST',
            headers: {
                // 'Content-Type': 'multipart/form-data' // fetch/FormData handles boundary automatically
                'Authorization': 'Bearer YOUR_TOKEN_HERE'
            },
            body: formData
        });

        const text = await res.text();
        console.log('Status:', res.status);
        console.log('Body:', text);

    } catch (e) {
        console.error(e);
    }
}

testCreateProduct();

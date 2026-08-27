import dotenv from 'dotenv';
import path from 'path';

console.log('CWD:', process.cwd());
const result = dotenv.config();
console.log('Dotenv Result:', result);
console.log('MONGODB_URI:', process.env.MONGODB_URI ? 'Loaded' : 'Undefined');

if (!process.env.MONGODB_URI) {
    console.log('Trying absolute path...');
    dotenv.config({ path: path.resolve(process.cwd(), '.env') });
    console.log('MONGODB_URI (Retry):', process.env.MONGODB_URI ? 'Loaded' : 'Undefined');
}

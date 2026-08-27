import moment from 'moment-timezone';

console.log('--- Timezone Verification ---');
console.log('System Time (UTC/Local):', new Date().toString());
console.log('System Time (ISO):', new Date().toISOString());
console.log('process.env.TZ:', process.env.TZ);
console.log('--- Application Logic ---');
console.log('Current IST Time (moment):', moment().tz("Asia/Kolkata").format('YYYY-MM-DD HH:mm:ss'));
console.log('IST Start of Today:', moment().tz("Asia/Kolkata").startOf('day').format('YYYY-MM-DD HH:mm:ss'));
console.log('-------------------------');

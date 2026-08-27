import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const logFile = path.join(__dirname, 'simple_log.txt');

fs.writeFileSync(logFile, "Node execution worked!\n");
console.log("Written to file");

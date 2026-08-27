
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { execSync } from 'child_process';
import chalk from 'chalk';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, '../src');

function getFiles(dir, files = []) {
    const fileList = fs.readdirSync(dir);
    for (const file of fileList) {
        const name = `${dir}/${file}`;
        if (fs.statSync(name).isDirectory()) {
            getFiles(name, files);
        } else {
            if (name.endsWith('.js')) {
                files.push(name);
            }
        }
    }
    return files;
}

const files = getFiles(rootDir);
let errorCount = 0;

console.log(chalk.blue(`Running syntax check on ${files.length} files...`));

files.forEach(file => {
    try {
        execSync(`node --check "${file}"`, { stdio: 'pipe' });
    } catch (error) {
        console.error(chalk.red(`❌ Syntax Error in ${file}`));
        // console.error(error.stderr.toString()); // Optional: show full error
        errorCount++;
    }
});

if (errorCount > 0) {
    console.log(chalk.red(`\nFound ${errorCount} files with syntax errors.`));
    process.exit(1);
} else {
    console.log(chalk.green('\n✅ All files passed syntax check.'));
}

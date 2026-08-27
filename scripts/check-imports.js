
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, '../'); // src directory

// Helper to recurse directories
function getFiles(dir, files = []) {
    const fileList = fs.readdirSync(dir);
    for (const file of fileList) {
        const name = `${dir}/${file}`;
        if (fs.statSync(name).isDirectory()) {
            if (file !== 'node_modules' && file !== 'tests' && file !== 'scripts' && file !== 'docs') {
                getFiles(name, files);
            }
        } else {
            if (name.endsWith('.js')) {
                files.push(name);
            }
        }
    }
    return files;
}

// Check if file exists (case sensitive)
function assertFileExists(filePath) {
    if (!fs.existsSync(filePath)) return false;
    const dir = path.dirname(filePath);
    const file = path.basename(filePath);
    const files = fs.readdirSync(dir);
    return files.includes(file);
}

// Main
const files = getFiles(rootDir);
let errorCount = 0;

console.log(`Scanning ${files.length} files for broken imports...`);

files.forEach(file => {
    const content = fs.readFileSync(file, 'utf-8');
    const importRegex = /from ['"](.*?)['"]/g;
    let match;

    while ((match = importRegex.exec(content)) !== null) {
        let importPath = match[1];

        // Skip npm modules (non-relative imports) - simplistic check
        if (!importPath.startsWith('.') && !importPath.startsWith('/')) {
            // Check if it's a known failing npm package
            // (We could verify package.json but let's assume npm pkgs are handled by npm install)
            // But we can check if it looks like a file path
            continue;
        }

        const resolveDir = path.dirname(file);
        let absolutePath = path.resolve(resolveDir, importPath);

        // Try extensions
        const extensions = ['', '.js', '.json'];
        let found = false;

        // Handling directory imports (index.js)
        if (fs.existsSync(absolutePath) && fs.statSync(absolutePath).isDirectory()) {
            absolutePath = path.join(absolutePath, 'index.js');
        }

        for (const ext of extensions) {
            const testPath = absolutePath + ext;
            if (assertFileExists(testPath)) {
                found = true;
                break;
            }
        }

        if (!found) {
            console.error(`❌ Missing Import: '${importPath}' in ${file}`);
            errorCount++;
        }
    }
});

if (errorCount > 0) {
    console.log(`\nFound ${errorCount} broken imports.`);
    process.exit(1);
} else {
    console.log('\n✅ All local imports verified successfully.');
}

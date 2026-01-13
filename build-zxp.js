// Build ZXP Package for Premiere Pro Extension
const fs = require('fs');
const path = require('path');
const archiver = require('archiver');

const ExtensionName = 'Antigravity-Subs-Generator';
const Version = '1.0.0';

const rootDir = __dirname;
const distDir = path.join(rootDir, 'dist');
const outputZXP = path.join(distDir, `${ExtensionName}-v${Version}.zxp`);

// Create dist directory if it doesn't exist
if (!fs.existsSync(distDir)) {
    fs.mkdirSync(distDir, { recursive: true });
    console.log('✓ Created dist directory');
}

// Read .zxpignore patterns
const ignorePatterns = [];
const ignorePath = path.join(rootDir, '.zxpignore');
if (fs.existsSync(ignorePath)) {
    const ignoreContent = fs.readFileSync(ignorePath, 'utf-8');
    ignoreContent.split('\n').forEach(line => {
        line = line.trim();
        if (line && !line.startsWith('#')) {
            ignorePatterns.push(line);
        }
    });
}

// Function to check if a file should be ignored
function shouldIgnore(filePath) {
    const relativePath = path.relative(rootDir, filePath).replace(/\\/g, '/');

    for (const pattern of ignorePatterns) {
        // Simple pattern matching
        if (relativePath === pattern ||
            relativePath.startsWith(pattern + '/') ||
            relativePath.includes('/' + pattern + '/') ||
            relativePath.endsWith('/' + pattern)) {
            return true;
        }

        // Wildcard matching
        const regexPattern = pattern
            .replace(/\./g, '\\.')
            .replace(/\*/g, '.*');
        const regex = new RegExp('^' + regexPattern + '$');
        if (regex.test(relativePath)) {
            return true;
        }
    }

    return false;
}

console.log('========================================');
console.log(`Building ZXP Package for ${ExtensionName}`);
console.log('========================================\n');

// Create output stream
const output = fs.createWriteStream(outputZXP);
const archive = archiver('zip', {
    zlib: { level: 9 } // Maximum compression
});

output.on('close', function () {
    const fileSize = (archive.pointer() / 1024).toFixed(2);
    console.log('\n========================================');
    console.log('✓ BUILD SUCCESSFUL!');
    console.log('========================================\n');
    console.log(`Package: ${outputZXP}`);
    console.log(`Size: ${fileSize} KB\n`);
    console.log('Next steps:');
    console.log('1. Install ZXP Installer from: https://aescripts.com/learn/zxp-installer/');
    console.log('2. Drag and drop the ZXP file to ZXP Installer');
    console.log('3. Open Adobe Premiere Pro and find extension under Window > Extensions\n');
});

archive.on('error', function (err) {
    throw err;
});

archive.on('warning', function (err) {
    if (err.code === 'ENOENT') {
        console.warn('Warning:', err);
    } else {
        throw err;
    }
});

// Pipe archive data to the file
archive.pipe(output);

console.log('Copying extension files...');

// Add files to archive
const filesToAdd = [];

function walkDir(dir) {
    const files = fs.readdirSync(dir);

    files.forEach(file => {
        const filePath = path.join(dir, file);
        const stat = fs.statSync(filePath);

        // Skip if should be ignored
        if (shouldIgnore(filePath)) {
            return;
        }

        if (stat.isDirectory()) {
            // Skip dist and temp directories
            if (file === 'dist' || file === 'temp_zxp' || file === 'node_modules') {
                return;
            }
            walkDir(filePath);
        } else {
            const relativePath = path.relative(rootDir, filePath);
            filesToAdd.push({ path: filePath, name: relativePath });
        }
    });
}

walkDir(rootDir);

// Add all files
filesToAdd.forEach(({ path: filePath, name }) => {
    archive.file(filePath, { name: name.replace(/\\/g, '/') });
});

console.log(`✓ Added ${filesToAdd.length} files to package`);

// Finalize the archive
archive.finalize();

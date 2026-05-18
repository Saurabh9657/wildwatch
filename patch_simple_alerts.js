const fs = require('fs');
const path = require('path');

const targetPath = path.join(__dirname, 'client', 'js', 'citizen.js');
const newAlertsCode = fs.readFileSync(path.join(__dirname, 'client', 'js', 'simple_alerts.js'), 'utf8');
const START_MARKER = '// === ALERTS_PAGE_START ===';
const END_MARKER = '// === ALERTS_PAGE_END ===';

function makeMarkerBlock(code) {
    return `${START_MARKER}\n${code.trim()}\n${END_MARKER}`;
}

function findFunctionRange(source) {
    const signatureRegex = /async\s+function\s+loadAlertsPage\s*\(\s*\)\s*\{/m;
    const signatureMatch = signatureRegex.exec(source);
    if (!signatureMatch) return null;

    const start = signatureMatch.index;
    const openingBraceIndex = source.indexOf('{', start);
    if (openingBraceIndex === -1) return null;

    let depth = 0;
    for (let i = openingBraceIndex; i < source.length; i++) {
        const ch = source[i];
        if (ch === '{') depth += 1;
        if (ch === '}') {
            depth -= 1;
            if (depth === 0) {
                return { start, end: i + 1 };
            }
        }
    }
    return null;
}

function replaceAlertsPage(content, replacementBlock) {
    const markerRegex = /\/\/\s*===\s*ALERTS_PAGE_START\s*===\s*[\s\S]*?\/\/\s*===\s*ALERTS_PAGE_END\s*===/m;
    if (markerRegex.test(content)) {
        return {
            content: content.replace(markerRegex, replacementBlock),
            mode: 'markers'
        };
    }

    const range = findFunctionRange(content);
    if (range) {
        const replaced = content.slice(0, range.start) + replacementBlock + content.slice(range.end);
        return {
            content: replaced,
            mode: 'function-fallback'
        };
    }

    return null;
}

const originalContent = fs.readFileSync(targetPath, 'utf8');
const backupPath = `${targetPath}.bak`;
fs.writeFileSync(backupPath, originalContent, 'utf8');

const replacement = replaceAlertsPage(originalContent, makeMarkerBlock(newAlertsCode));
if (!replacement) {
    console.error('Could not safely locate loadAlertsPage in citizen.js. Restore from backup:', backupPath);
    process.exit(1);
}

fs.writeFileSync(targetPath, replacement.content, 'utf8');
console.log(`Successfully replaced alerts logic using ${replacement.mode}. Backup created at ${backupPath}`);

const fs = require('fs');
const path = require('path');

try {
    // 1. Get the bundled standalone HTML
    let bundle = fs.readFileSync('dist/index.html', 'utf8');

    // POST-PROCESS FOR TRUE OFFLINE (file:// support)
    // Remove type="module" to allow opening as a local file in browsers that block local modules
    bundle = bundle.replace(/<script type="module" crossorigin/g, '<script');
    bundle = bundle.replace(/<script type="module"/g, '<script');
    
    // Remove the Vite modulepreload polyfill which uses fetch() and might fail offline
    bundle = bundle.replace(/\(function\(\)\{const e=document\.createElement\("link"\)\.relList;.*fetch\(i\.href,a\)\}\}\)\(\);/s, '/* modulepreload polyfill removed for offline support */');

    // 2. Collect original source records for transparency
    const filesToRecord = [
        'package.json',
        'server.ts',
        'tsconfig.json',
        'vite.config.ts',
        'metadata.json'
    ];

    let record = '\n\n<!-- ========================================= -->\n';
    record += '<!-- ORIGINAL PROJECT SOURCE CODE RECORDS -->\n';
    record += '<!-- ========================================= -->\n';
    
    for (const f of filesToRecord) {
        if (fs.existsSync(f)) {
            const content = fs.readFileSync(f, 'utf8');
            record += `\n<!-- FILE: ${f} -->\n<!--\n${content.replace(/-->/g, '-- >')}\n-->\n`;
        }
    }

    // 3. Merge and finalize
    // We insert the record before the closing body tag
    const finalized = bundle.replace('</body>', record + '\n</body>');

    fs.writeFileSync('CCGame.html', finalized);
    console.log('Final construction successful: CCGame.html (Fully Offline & No-Scroll Optimized)');

} catch (err) {
    console.error('Final assembly failed:', err);
}

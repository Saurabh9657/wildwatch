const fs = require('fs');
const path = require('path');

const targetPath = path.join(__dirname, 'client', 'js', 'citizen.js');
let content = fs.readFileSync(targetPath, 'utf8');

const enhancedAlertsCode = fs.readFileSync(path.join(__dirname, 'client', 'js', 'enhanced_alerts.js'), 'utf8');

const startIndex = content.lastIndexOf('async function loadAlertsPage() {'); 

if (startIndex !== -1) {
    // Cut everything from loadAlertsPage onwards, and replace it with new script
    content = content.substring(0, startIndex) + "\n" + enhancedAlertsCode + "\n";
    fs.writeFileSync(targetPath, content, 'utf8');
    console.log('Successfully replaced alerts logic with enhanced version in citizen.js');
} else {
    console.error('Could not find loadAlertsPage signature in citizen.js');
}

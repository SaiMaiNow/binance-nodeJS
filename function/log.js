const fs = require('fs');
const path = require('path');

function appendLogJson(entry, name) {
    const logDir = path.join(__dirname, '../log');
    if (!fs.existsSync(logDir)) fs.mkdirSync(logDir, { recursive: true });
    const logPath = path.join(logDir, `${name}.json`);
    let logs = [];
    if (fs.existsSync(logPath)) {
        try {
            logs = JSON.parse(fs.readFileSync(logPath, 'utf8'));
        } catch (e) { logs = []; }
    }
    logs.push({ ts: new Date().toISOString(), ...entry });
    fs.writeFileSync(logPath, JSON.stringify(logs, null, 2));
}

module.exports = { appendLogJson };

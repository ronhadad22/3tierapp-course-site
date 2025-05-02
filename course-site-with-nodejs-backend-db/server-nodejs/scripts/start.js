const getSecrets = require('./get-secrets');

async function start() {
    // Load secrets before starting the application
    await getSecrets();
    
    // Import and run the main server
    require('../server.js');
}

start().catch(error => {
    console.error('Failed to start application:', error);
    process.exit(1);
});

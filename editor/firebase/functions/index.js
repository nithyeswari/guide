const functions = require('firebase-functions');

// Set the API key from Firebase config
process.env.ANTHROPIC_API_KEY = functions.config().anthropic?.key || process.env.ANTHROPIC_API_KEY;

const app = require('../../server/index');

// Export as Firebase Function
exports.api = functions.https.onRequest(app);

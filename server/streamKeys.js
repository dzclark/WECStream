const crypto = require('crypto');

const validStreamKeys = new Map();

function generateStreamKey() {
  return crypto.randomBytes(16).toString('hex');
}

function addStreamKey(key, metadata = {}) {
  validStreamKeys.set(key, {
    createdAt: new Date().toISOString(),
    active: true,
    ...metadata
  });
  return key;
}

function createStreamKey(username = 'default') {
  const key = generateStreamKey();
  return addStreamKey(key, { username });
}

function isValidStreamKey(key) {
  const keyData = validStreamKeys.get(key);
  return keyData && keyData.active;
}

function revokeStreamKey(key) {
  const keyData = validStreamKeys.get(key);
  if (keyData) {
    keyData.active = false;
    return true;
  }
  return false;
}

function getAllStreamKeys() {
  const keys = [];
  validStreamKeys.forEach((data, key) => {
    keys.push({ key, ...data });
  });
  return keys;
}

function initializeDefaultKeys() {
  addStreamKey('test-stream', { username: 'demo', description: 'Demo stream key' });
  addStreamKey('live-broadcast', { username: 'demo', description: 'Live broadcast key' });
  
  const secureKey = createStreamKey('admin');
  console.log('\n=== Stream Keys Initialized ===');
  console.log('Demo keys (for testing):');
  console.log('  - test-stream');
  console.log('  - live-broadcast');
  console.log(`\nSecure key (recommended): ${secureKey}`);
  console.log('================================\n');
  
  return secureKey;
}

module.exports = {
  generateStreamKey,
  createStreamKey,
  addStreamKey,
  isValidStreamKey,
  revokeStreamKey,
  getAllStreamKeys,
  initializeDefaultKeys
};

// Central store switcher.
// If MongoDB successfully connects, all routes/sockets use MongoStore (persistent).
// Otherwise they automatically fall back to InMemoryStore (demo/dev mode).
const mongoose = require('mongoose');

let activeStore = null;

function getStore() {
  if (activeStore) return activeStore;
  // Default to in-memory until setStore() is called by server startup
  activeStore = require('./inMemoryStore');
  return activeStore;
}

function setStore(store) {
  activeStore = store;
}

// Proxy object so existing `const store = require('../utils/store')` call sites
// always hit the *current* active store, even if it's swapped after import time.
const proxy = new Proxy({}, {
  get(target, prop) {

    // Proxy ke apne methods pehle return karo
    if (prop in target) {
      return target[prop];
    }

    const store = getStore();
    const value = store[prop];

    return typeof value === 'function'
      ? value.bind(store)
      : value;
  }
});

proxy.setStore = setStore;
proxy.getStore = getStore;

module.exports = proxy;
module.exports.__isMongo = () => mongoose.connection.readyState === 1;

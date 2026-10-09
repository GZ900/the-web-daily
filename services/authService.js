const crypto = require("crypto");

const SESSION_DURATION =
  7 * 24 * 60 * 60 * 1000;

function createSessionToken() {
  return crypto.randomBytes(32).toString("hex");
}

function hashSessionToken(token) {
  return crypto
    .createHash("sha256")
    .update(token)
    .digest("hex");
}

function getSessionExpiry() {
  return new Date(Date.now() + SESSION_DURATION);
}

module.exports = {
  SESSION_DURATION,
  createSessionToken,
  hashSessionToken,
  getSessionExpiry
};
const crypto = require("crypto");

const SESSION_DURATION =
  7 * 24 * 60 * 60 * 1000;

const SESSION_TOKEN_BYTES =
  32;

const SESSION_TOKEN_PATTERN =
  /^[0-9a-f]{64}$/i;

function createSessionToken() {
  return crypto
    .randomBytes(
      SESSION_TOKEN_BYTES
    )
    .toString("hex");
}

function isValidSessionToken(
  token
) {
  return (
    typeof token === "string" &&
    SESSION_TOKEN_PATTERN.test(
      token
    )
  );
}

function hashSessionToken(
  token
) {
  return crypto
    .createHash("sha256")
    .update(token)
    .digest("hex");
}

function getSessionExpiry() {
  return new Date(
    Date.now() +
    SESSION_DURATION
  );
}

module.exports = {
  SESSION_DURATION,
  createSessionToken,
  isValidSessionToken,
  hashSessionToken,
  getSessionExpiry
};
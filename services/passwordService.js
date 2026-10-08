const crypto = require("crypto");

function hashPassword(password) {
  const salt = crypto.randomBytes(16).toString("hex");

  const passwordHash = crypto
    .pbkdf2Sync(password, salt, 100000, 64, "sha512")
    .toString("hex");

  return {
    passwordHash,
    passwordSalt: salt
  };
}

function verifyPassword(password, passwordHash, passwordSalt) {
  const hashToCompare = crypto
    .pbkdf2Sync(password, passwordSalt, 100000, 64, "sha512")
    .toString("hex");

  return crypto.timingSafeEqual(
    Buffer.from(passwordHash, "hex"),
    Buffer.from(hashToCompare, "hex")
  );
}

module.exports = {
  hashPassword,
  verifyPassword
};
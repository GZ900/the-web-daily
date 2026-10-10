const crypto =
  require("crypto");

const PBKDF2_ITERATIONS =
  100000;

const HASH_BYTES =
  64;

const HASH_ALGORITHM =
  "sha512";

const HASH_PATTERN =
  /^[0-9a-f]{128}$/i;

const SALT_PATTERN =
  /^[0-9a-f]{32}$/i;

function hashPassword(
  password
) {
  const salt =
    crypto
      .randomBytes(16)
      .toString("hex");

  const passwordHash =
    crypto
      .pbkdf2Sync(
        String(password),
        salt,
        PBKDF2_ITERATIONS,
        HASH_BYTES,
        HASH_ALGORITHM
      )
      .toString("hex");

  return {
    passwordHash,
    passwordSalt:
      salt
  };
}

function verifyPassword(
  password,
  passwordHash,
  passwordSalt
) {
  if (
    typeof password !==
      "string" ||
    typeof passwordHash !==
      "string" ||
    typeof passwordSalt !==
      "string"
  ) {
    return false;
  }

  if (
    !HASH_PATTERN.test(
      passwordHash
    ) ||
    !SALT_PATTERN.test(
      passwordSalt
    )
  ) {
    return false;
  }

  const expectedHash =
    Buffer.from(
      passwordHash,
      "hex"
    );

  const calculatedHash =
    crypto.pbkdf2Sync(
      password,
      passwordSalt,
      PBKDF2_ITERATIONS,
      HASH_BYTES,
      HASH_ALGORITHM
    );

  if (
    expectedHash.length !==
    calculatedHash.length
  ) {
    return false;
  }

  return crypto
    .timingSafeEqual(
      expectedHash,
      calculatedHash
    );
}

module.exports = {
  hashPassword,
  verifyPassword
};
const bcrypt = require('bcrypt');

const SALT_ROUNDS = 10;

/**
 * Hash a password using bcrypt
 */
const hashPassword = async (password) => {
  return await bcrypt.hash(password, SALT_ROUNDS);
};

/**
 * Compare a password with its hash
 */
const comparePassword = async (password, hash) => {
  return await bcrypt.compare(password, hash);
};

module.exports = {
  hashPassword,
  comparePassword,
};

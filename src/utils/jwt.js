const jwt = require('jsonwebtoken');

/**
 * Sign a short-lived access token.
 * @param {string} userId
 * @returns {string}
 */
const signAccessToken = (userId) =>
  jwt.sign({ sub: userId }, process.env.JWT_ACCESS_SECRET, {
    expiresIn: process.env.JWT_ACCESS_EXPIRES || '15m',
  });

/**
 * Sign a long-lived refresh token.
 * @param {string} userId
 * @returns {string}
 */
const signRefreshToken = (userId) =>
  jwt.sign({ sub: userId }, process.env.JWT_REFRESH_SECRET, {
    expiresIn: process.env.JWT_REFRESH_EXPIRES || '30d',
  });

/**
 * Verify an access token. Returns the payload or throws.
 * @param {string} token
 */
const verifyAccessToken = (token) =>
  jwt.verify(token, process.env.JWT_ACCESS_SECRET);

/**
 * Verify a refresh token. Returns the payload or throws.
 * @param {string} token
 */
const verifyRefreshToken = (token) =>
  jwt.verify(token, process.env.JWT_REFRESH_SECRET);

module.exports = {
  signAccessToken,
  signRefreshToken,
  verifyAccessToken,
  verifyRefreshToken,
};

import crypto from 'crypto';

/**
 * Compute SHA-256 hash of a string or buffer
 * @param {string | Buffer} data
 * @returns {string} Hex-encoded SHA-256 digest
 */
export function sha256(data) {
  return crypto.createHash('sha256').update(data).digest('hex');
}

/**
 * Compute SHA-256 hash of an uploaded file buffer
 * @param {Buffer} buffer
 * @returns {string} Hex-encoded SHA-256 digest
 */
export function hashBuffer(buffer) {
  return crypto.createHash('sha256').update(buffer).digest('hex');
}

/**
 * Compute tamper-evident blockchain-style hash chain node
 * @param {string} previousHash - SHA-256 hash of the previous block/log
 * @param {object | string} payload - Payload data for this block/log
 * @param {string} [timestamp] - ISO timestamp string
 * @returns {string} Next chained SHA-256 hash
 */
export function computeChainHash(previousHash, payload, timestamp = new Date().toISOString()) {
  const serialized = typeof payload === 'string' ? payload : JSON.stringify(payload);
  const dataToHash = `${previousHash || '0'.repeat(64)}:${serialized}:${timestamp}`;
  return sha256(dataToHash);
}

export default {
  sha256,
  hashBuffer,
  computeChainHash,
};

const crypto = require('crypto');

const createSignature = (totalParams, key) => (
  crypto
    .createHmac('sha256', `${key}`)
    .update(totalParams)
    .digest('hex')
);

module.exports = createSignature;

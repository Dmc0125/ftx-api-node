/* eslint-disable no-console */
const logger = (logType, ...params) => {
  if (typeof console[logType] !== 'function') {
    console.log(...params);
    return;
  }

  console[logType](...params);
};

module.exports = logger;

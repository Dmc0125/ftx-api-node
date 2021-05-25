const getResolution = (timeframe) => {
  let resolution;

  switch (timeframe) {
    case '15s':
      resolution = 15;
      break;
    case '1m':
      resolution = 60;
      break;
    case '5m':
      resolution = 60 * 5;
      break;
    case '15m':
      resolution = 60 * 15;
      break;
    case '1h':
      resolution = 60 * 60;
      break;
    case '4h':
      resolution = 60 * 60 * 4;
      break;
    case '1d':
      resolution = 60 * 60 * 24;
      break;
    default:
      resolution = 1;
  }

  return resolution;
};

module.exports = getResolution;

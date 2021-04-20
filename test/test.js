require('dotenv').config();

const Ftx = require('../src/main');

const test = async () => {
  const ftx = new Ftx({
    SUBACCOUNT: process.env.SUBACCOUNT,
    // API_KEY: process.env.API_KEY,
    // SECRET_KEY: process.env.SECRET_KEY,
  });
  await ftx.init();

  // console.log(await ftx.spot.sendOrder('BTC/USD', 'BUY', 'MARKET', 0.0001));
  // console.log(await ftx.spot.getUserBalances());
  // console.log(await ftx.spot.singleMarket('BTC/USD'));
  // const c = await ftx.spot.candlesticks('BTC/USD', '1h', { limit: 5000 });
};

test();

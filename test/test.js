/* eslint-disable no-console */
require('dotenv').config();

const Ftx = require('../src/main');

const test = async () => {
  const ftx = new Ftx({
    SUBACCOUNT: process.env.SUBACCOUNT,
    API_KEY: process.env.API_KEY,
    SECRET_KEY: process.env.SECRET_KEY,
  });

  try {
    console.log(await ftx.spot.candlesticks('BTC/USD', '30m'));

    // console.log(await ftx.spot.sendOrder('BTC/USD', 'BUY', 'MARKET', 1));

    // console.log(await ftx.spot.singleMarket('BTC/USD'));

    // console.log(await ftx.spot.accountBalances());

    // console.log(await ftx.spot.orderbook('BTC-PERP', { depth: 40 }));

    // ftx.spotWebsockets.candlesticks({ market: 'BTC/USD', timeframe: '15s' }, (data) => {
    //   console.log(data);
    // });

    // ftx.spotWebsockets.ticker(['ETH/USD', 'BTC/USD', 'SOL/USD'], (data) => {
    //   console.log(data);
    // });

    // ftx.spotWebsockets.orderbook(['ETH/USD', 'BTC/USD', 'SOL/USD'], (data) => {
    //   console.log(data);
    // });

    console.info('✅ Working fine!');
  } catch (error) {
    console.error('❌', error);
  }
};

test();

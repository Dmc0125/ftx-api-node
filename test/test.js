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
    // const candlesticks = await ftx
    //   .spot
    //   .candlesticks('BTC/USD', '1h', { startTime: new Date('August 19, 2019 00:00:00').getTime(), endTime: new Date().getTime() });

    // const candlesticks = await ftx.spot.candlesticks('BTC/USD', '1h', { limit: 20 });

    console.log(await ftx.spot.candlesticks('BTC/USD', '1h', { limit: 20 }));

    // console.log(await ftx.spot.sendOrder('BNB/USD', 'BUY', 'MARKET', 0.05));

    console.log(await ftx.spot.singleMarket('BTC/USD'));

    console.log(await ftx.spot.accountBalances());

    console.log(await ftx.spot.orderbook('BTC-PERP', { depth: 40 }));

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

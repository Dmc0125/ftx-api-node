require('dotenv').config();

const Ftx = require('../src/main');

const test = async () => {
  // const ftx = new Ftx({
  //   SUBACCOUNT: process.env.SUBACCOUNT,
  //   API_KEY: process.env.API_KEY,
  //   SECRET_KEY: process.env.SECRET_KEY,
  // });

  // const ftx = new Ftx();

  // console.log(await ftx.spot.sendOrder('BTC/USD', 'BUY', 'MARKET', 0.0001));
  // console.log(await ftx.spot.singleMarket('BTC/USD'));
  // const c = await ftx.spot.candlesticks('BTC/USD', '1h');

  // ftx.spotWebsockets.candlesticks({ market: 'BTC/USD', timeframe: '15s' }, (data) => {
  //   console.log(new Date(data.openTime));
  // });

  // ftx.spotWebsockets.orderbook('BTC-PERP', (data) => {
  //   console.log(data);
  // });

  // console.log(await ftx.spot.orderbook('BTC-PERP', { depth: 40 }));

  // ftx.spotWebsockets.ticker('BTC-PERP', (data) => {
  //   console.log(data);
  // });

  // ftx.spotWebsockets.ticker(['ETH/USD', 'BTC/USD', 'SOL/USD'], (data) => {
  //   console.log(data);
  // });
};

test();

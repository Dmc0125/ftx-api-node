# FTX API Nodejs

- FTX API for nodejs

## Installation

```bash
npm i ftx-api-nodejs
```

## Initialize

- For public endpoints API_KEY and SECRET_KEY is not needed

```js
const Ftx = require('ftx-api-nodejs');

const ftx = new Ftx(); 
```

- For authenticated channels pass API_KEY, SECRET_KEY and SUBACCOUNT as parameters
  - SUBACCOUNT does not need to be specified for main account, if specified, does not need to be uri encoded

```js
const Ftx = require('ftx-api-nodejs');

const ftx = new Ftx({
  API_KEY: 'Api key',
  SECRET_KEY: 'Secret key',
  SUBACCOUNT: 'FTX subaccount name',
});
```

## Methods

### Spot - Authenticated

<h4>Account balances</h4>

```js
console.log(await ftx.spot.accountBalances())
```

- Response:

```js
[
  { asset: 'BNB', available: 0.00917841, inOrder: 0 },
  { asset: 'XRP', available: 0, inOrder: 0 },
  { asset: 'LINK', available: 0, inOrder: 0 },
  { asset: 'ETH', available: 0, inOrder: 0 },
  { asset: 'BTC', available: 0, inOrder: 0 },
  { asset: 'USD', available: 237.59103717, inOrder: 0 }
]
```

<h4>Send order</h4>

```js
console.log(await ftx.spot.sendOrder('Market', 'Side', 'Order type', amount));
```

- Side:
  - BUY
  - SELL
- Order type:
  - LIMIT
  - MARKET

- Example:

```js
console.log(await ftx.spot.sendOrder('BNB/USD', 'BUY', 'MARKET', 0.05));
```

- Response:

```js
{
  success: true,
  result: {
    id: 55990874165,
    clientId: null,
    market: 'BNB/USD',
    type: 'market',
    side: 'buy',
    price: null,
    size: 0.05,
    status: 'new',
    filledSize: 0,
    remainingSize: 0.05,
    reduceOnly: false,
    liquidation: null,
    avgFillPrice: null,
    postOnly: false,
    ioc: true,
    createdAt: '2021-06-09T09:37:09.993306+00:00',
    future: null
  }
}
```

### Spot - Public

<h4>Candlesticks</h4>

```js
console.log(await ftx.spot.candlesticks('Market', 'Timeframe', options));
```

- Timeframe
  - All FTX supported timeframes
  - 15s, 1m, 5m, 15m, 1h, 4h, 1d

- Options - optional
  - all parameters are optional
  - limit: number > 0 - Default is 1500
  - startTime: Date in milliseconds
  - endTime: Date in milliseconds

- Example

```js
console.log(await ftx.spot.candlesticks('BTC/USD', '1h', { limit: 1 }));
```

- Response:

```js
[
  {
    volume: 18961537.8515,
    openTime: 1623229200000,
    closeTime: 1623232799999,
    o: 34084,
    h: 34408,
    l: 34004,
    c: 34286
  }
]
```

const fetch = require('node-fetch');
const Websocket = require('ws');
const qs = require('qs');

const { createSignature, logger, getResolution } = require('./utils');

class Ftx {
  constructor(options = undefined) {
    this.API_URL = 'https://ftx.com/api';
    this.WS_URL = 'wss://ftx.com/ws/';

    this.API_KEY = undefined;
    this.SECRET_KEY = undefined;
    this.SUBACCOUNT = undefined;

    if (options) {
      const { API_KEY, SECRET_KEY, SUBACCOUNT } = options;

      this.API_KEY = API_KEY;
      this.SECRET_KEY = SECRET_KEY;
      this.SUBACCOUNT = SUBACCOUNT && decodeURI(SUBACCOUNT) === SUBACCOUNT ? encodeURI(SUBACCOUNT) : SUBACCOUNT;
    }

    this._websocket = null;
    this._websocketCallbacks = {};
    this._timeDiff = null;
  }

  async _setTimeDiff() {
    const TIME_URL = 'https://otc.ftx.com/api/time';

    const res = await fetch(TIME_URL);
    const data = await res.json();

    this._timeDiff = new Date(data.result).getTime() - new Date().getTime();
  }

  async _ftxFetch({ endpoint, method = 'GET', headers }, signed, options) {
    let url = `${this.API_URL}${endpoint}${options ? `?${qs.stringify(options)}` : ''}`;
    let _headers = {
      'Content-Type': 'application/json',
      ...headers,
    };
    const body = options && method !== 'GET' ? JSON.stringify(options) : undefined;

    if (signed) {
      if (!this.API_KEY || !this.SECRET_KEY) {
        throw Error('Invalid api key or secret key');
      }

      [url] = url.split('?');

      await this._setTimeDiff();
      const ts = new Date().getTime() + this._timeDiff;

      let signatureKey = `${ts}${method}/api${endpoint}`;
      if (options && Object.keys(options)) {
        signatureKey += JSON.stringify(options);
      }

      const signature = createSignature(signatureKey, this.SECRET_KEY);
      _headers = {
        ..._headers,
        'FTX-KEY': this.API_KEY,
        'FTX-TS': String(ts),
        'FTX-SUBACCOUNT': this.SUBACCOUNT,
        'FTX-SIGN': signature,
      };
    }

    try {
      const res = await fetch(url, {
        headers: _headers,
        method,
        body,
      });

      const data = await res.json();

      if (data.success) {
        return data;
      }

      throw data;
    } catch (error) {
      if (!error.success) {
        throw error.error;
      }

      throw error;
    }
  }

  get spot() {
    return {
      /* ---- SIGNED ---- */

      accountBalances: async () => {
        const endpoint = '/wallet/balances';

        const balances = await this._ftxFetch({ endpoint }, true);

        return balances.result.map(({ coin, availableWithoutBorrow, total }) => ({
          asset: coin,
          available: +availableWithoutBorrow,
          inOrder: total - availableWithoutBorrow,
        }));
      },

      sendOrder: async (market, side, type, size, options) => {
        const newOrderEndpoint = '/orders';

        const _options = {
          market,
          side: side.toLowerCase(),
          type: type.toLowerCase(),
          size,
        };

        if (typeof options === 'object') {
          Object.assign(_options, options);
        }

        if (_options.type === 'market') {
          _options.price = null;
        }

        const data = await this._ftxFetch({ endpoint: newOrderEndpoint, method: 'POST' }, true, _options);

        return data;
      },

      convert: async (fromCoin, toCoin, size) => {
        const quoteEndpoint = '/otc/quotes';

        const { result } = await this._ftxFetch({ endpoint: quoteEndpoint, method: 'POST' }, true, {
          fromCoin,
          toCoin,
          size,
        });

        if (result.quoteId) {
          await this._ftxFetch({ endpoint: `${quoteEndpoint}/${result.quoteId}/accept`, method: 'POST' }, true);
        }

        const { result: quoteStatus } = await this._ftxFetch({ endpoint: `${quoteEndpoint}/${result.quoteId}`, method: 'GET' }, true);

        return quoteStatus;
      },

      /* ---- UNSIGNED ---- */

      candlesticks: async (marketName, timeframe, options = undefined) => {
        const resolution = getResolution(timeframe);

        const _options = {
          resolution,
        };

        if (typeof options === 'object') {
          Object.assign(_options, options);
        }

        const candlesticksEndpoint = `/markets/${marketName}/candles`;

        const { result } = await this._ftxFetch({ endpoint: candlesticksEndpoint }, false, _options);

        return result.map(({
          time, open, high, low, close, volume,
        }) => ({
          volume,
          openTime: time,
          closeTime: time + resolution * 1000 - 1,
          o: open,
          h: high,
          l: low,
          c: close,
        }));
      },

      singleMarket: async (marketName) => {
        const singleMarketEndpoint = `/markets/${marketName}`;

        const marketData = await this._ftxFetch(({ endpoint: singleMarketEndpoint }));

        return marketData;
      },

      orderbook: async (marketName, options = undefined) => {
        const orderbookEndpoint = `/markets/${marketName}/orderbook`;

        if (options && options.depth) {
          const orderbookData = await this._ftxFetch({ endpoint: orderbookEndpoint }, false, options);
          return orderbookData;
        }

        const orderbookData = await this._ftxFetch({ endpoint: orderbookEndpoint });
        return orderbookData;
      },
    };
  }

  get spotWebsockets() {
    return {
      orderbook: (markets, callback) => {
        if (!this._websocket) {
          this._initWebsocket();
        }

        const channel = 'orderbook';

        for (let i = 0; i < markets.length; i += 1) {
          const market = markets[i];

          this._subscribe(channel, market, callback);
        }
      },

      ticker: (markets, callback) => {
        if (!this._websocket) {
          this._initWebsocket();
        }

        const channel = 'ticker';

        for (let i = 0; i < markets.length; i += 1) {
          const market = markets[i];

          this._subscribe(channel, market, callback);
        }
      },

      candlesticks: ({ market, timeframe }, callback) => {
        const getExchangeTime = async () => {
          await this._setTimeDiff();
          return new Date().getTime() + this._timeDiff;
        };

        // eslint-disable-next-line no-unused-vars
        let candlesticksStream;

        this.spot.candlesticks(market, timeframe, { limit: 2 }).then(async (data) => {
          const [prevCandle, currentCandle] = data;

          this._callCallback(callback, prevCandle);

          let currentExchangeTime = await getExchangeTime();
          const nextCandleOpen = currentCandle.closeTime + 1000 - currentExchangeTime;

          setTimeout(async () => {
            const resolution = getResolution(timeframe);

            currentExchangeTime = await getExchangeTime();

            this.spot.candlesticks(market, timeframe, { limit: 2, endTime: currentExchangeTime }).then((nextData) => {
              this._callCallback(callback, nextData[0]);
            });

            // eslint-disable-next-line no-unused-vars
            candlesticksStream = setInterval(async () => {
              currentExchangeTime = await getExchangeTime();

              this.spot.candlesticks(market, timeframe, { limit: 2, endTime: currentExchangeTime }).then((nextData) => {
                this._callCallback(callback, nextData[0]);
              });
            }, resolution * 1000);
          }, nextCandleOpen);
        }).catch((error) => {
          if (error.error) {
            throw new Error(error.error);
          }
          throw new Error(error);
        });
      },
    };
  }

  _initWebsocket() {
    this._websocket = new Websocket(this.WS_URL);

    this._websocket.on('open', () => {
      logger('info', '✅ Connected to FTX websocket');
    });

    this._websocket.on('message', (msgJSON) => {
      const msg = JSON.parse(msgJSON);

      if (msg && msg.channel && msg.market) {
        const callbackId = `${msg.channel}-${msg.market}`;

        const cb = this._websocketCallbacks[callbackId];

        if (cb) {
          this._callCallback(cb, msg);
        }
      }
    });
  }

  _subscribe(channel, market, cb) {
    if (this._websocket && this._websocket.readyState === 0) {
      setTimeout(() => {
        this._subscribe(channel, market, cb);
      }, 5000);
      return;
    }

    this._sendMessage(channel, market, cb);
  }

  _callCallback(cb, arg) {
    if (typeof cb === 'function') {
      cb(arg);
    }
  }

  _sendMessage(channel, market, cb) {
    this._websocket.send(JSON.stringify({
      channel,
      market,
      op: 'subscribe',
    }));

    this._setCallback(channel, market, cb);
  }

  _setCallback(channel, market, callback) {
    const id = `${channel}-${market}`;

    this._websocketCallbacks[id] = callback;
  }
}

module.exports = Ftx;

const fetch = require('axios-wrapper-node');
const Websocket = require('ws');
const qs = require('qs');
const crypto = require('crypto');

/**
 * @typedef {'15s' | '1m' | '5m' | '15m' | '1h' | '4h' | '1d'} Timeframe
 */

class Ftx {
  /**
   * @param {{ API_KEY: string; SECRET_KEY: string; SUBACCOUNT?: string }} options
   */
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
      this.SUBACCOUNT = decodeURI(SUBACCOUNT) === SUBACCOUNT ? encodeURI(SUBACCOUNT) : SUBACCOUNT;
    }

    /**
     *  @private
     */
    this._websocket = null;
    /**
     *  @private
     */
    this._websocketCallbacks = {};

    /**
     *  @private
     */
    this._timeDiff = null;
  }

  /**
   *  @private
   */
  _setTimeDiff() {
    const TIME_URL = 'https://otc.ftx.com/api/time';

    return new Promise((resolve) => {
      fetch({ url: TIME_URL }, (data) => {
        this._timeDiff = new Date(data.result).getTime() - new Date().getTime();
        resolve();
      });
    });
  }

  /**
   * @private
   */
  _encode(totalParams, key) {
    return crypto
      .createHmac('sha256', `${key}`)
      .update(totalParams)
      .digest('hex');
  }

  /**
   * @private
   */
  async _ftxFetch({ endpoint, method, headers }, signed, options) {
    const requestOptions = {
      headers,
      url: `${this.API_URL}${endpoint}?${qs.stringify(options)}`,
      method: method || 'GET',
      data: options,
    };

    if (signed) {
      if (!this.API_KEY || !this.SECRET_KEY) {
        throw Error('Invalid api key or secret key');
      }

      // eslint-disable-next-line prefer-destructuring
      requestOptions.url = requestOptions.url.split('?')[0];

      await this._setTimeDiff();
      const ts = new Date().getTime() + this._timeDiff;

      let signatureKey = `${ts}${requestOptions.method}/api${endpoint}`;
      if (options && Object.keys(options)) {
        signatureKey += JSON.stringify(options);
      }

      const signature = this._encode(signatureKey, this.SECRET_KEY);
      requestOptions.headers = {
        ...requestOptions.headers,
        'FTX-KEY': this.API_KEY,
        'FTX-TS': String(ts),
        'FTX-SUBACCOUNT': this.SUBACCOUNT,
        'FTX-SIGN': signature,
      };
    }

    // eslint-disable-next-line consistent-return
    return new Promise((resolve, reject) => {
      try {
        fetch(requestOptions, (data) => {
          try {
            resolve(data);
          } catch (error) {
            // eslint-disable-next-line prefer-promise-reject-errors
            reject(`Fetch error: ${error.statusCode}`);
          }
        });
      } catch (error) {
        reject(error);
      }
    });
  }

  get spot() {
    return {
      /* ---- SIGNED ---- */

      /**
       * @returns {{ asset: string; available: number; inOrder: number }[]}
       */
      accountBalances: async () => {
        const endpoint = '/wallet/balances';

        const balances = await this._ftxFetch({ endpoint }, true);

        return balances.result.map(({ coin, availableWithoutBorrow, total }) => ({
          asset: coin,
          available: +availableWithoutBorrow,
          inOrder: total - availableWithoutBorrow,
        }));
      },

      /**
     * Send order
     *
     * @param {string} market
     * @param {string} side
     * @param {string} type
     * @param {number} size
     * @param {{}} options
     */
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

      /**
       * Convert
       *
       * @param {string} fromCoin
       * @param {string} toCoin
       * @param {number} size
       */
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

      /**
     * Get spot candlesticks data
     *
     * @param {string} marketName
     * @param {Timeframe} timeframe
     * @param {{ startTime?: number; endTime?: number; limit?: number }} options
     */
      candlesticks: async (marketName, timeframe, options = undefined) => {
        const resolution = this._getResolution(timeframe);

        const _options = {
          resolution,
        };

        if (typeof options === 'object') {
          Object.assign(_options, options);
        }

        const candlesticksEndpoint = `/markets/${marketName}/candles`;

        const { result: candlesticks } = await this._ftxFetch({ endpoint: candlesticksEndpoint }, false, _options);

        return candlesticks.map(({
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

      /**
       * Single market
       *
       * @param {string} marketName
       */
      singleMarket: async (marketName) => {
        const singleMarketEndpoint = `/markets/${marketName}`;

        const marketData = await this._ftxFetch(({ endpoint: singleMarketEndpoint }));

        return marketData;
      },

      /**
       * Orderbook
       *
       * @param {string} marketName
       * @param {{ depth?: number }} options
       */
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
    const callCallback = (cb, arg) => {
      if (typeof cb === 'function') {
        cb(arg);
      }
    };

    const initWebsocket = () => {
      this._websocket = new Websocket(this.WS_URL);

      this._websocket.on('open', () => {
        this._logger('info', '💹 Connected to FTX websocket');
      });

      this._websocket.on('message', (msgJSON) => {
        const msg = JSON.parse(msgJSON);

        if (msg && msg.channel && msg.market) {
          const callbackId = `${msg.channel}-${msg.market}`;

          const cb = this._websocketCallbacks[callbackId];

          if (cb) {
            callCallback(cb, msg);
          }
        }
      });
    };

    const subscribe = (channel, market, cb) => {
      if (this._websocket && this._websocket.readyState === 0) {
        setTimeout(() => {
          subscribe(channel, market, cb);
        }, 5000);
        return;
      }

      this._sendMessage(channel, market, cb);
    };

    const getExchangeTime = async () => {
      await this._setTimeDiff();
      return new Date().getTime() + this._timeDiff;
    };

    return {
      /**
       * Orderbook stream
       *
       * @param {string[]} markets
       * @param {function} callback
       */
      orderbook: (markets, callback) => {
        if (!this._websocket) {
          initWebsocket();
        }

        const channel = 'orderbook';

        for (let i = 0; i < markets.length; i += 1) {
          const market = markets[i];

          subscribe(channel, market, callback);
        }
      },

      /**
       * Ticker stream
       *
       * @param {string[]} markets
       * @param {function} callback
       */
      ticker: (markets, callback) => {
        if (!this._websocket) {
          initWebsocket();
        }

        const channel = 'ticker';

        for (let i = 0; i < markets.length; i += 1) {
          const market = markets[i];

          subscribe(channel, market, callback);
        }
      },

      /**
       * Candlesticks stream
       *
       * @param {{ market: string; timeframe: Timeframe }} settings
       * @param {function} callback
       */
      candlesticks: ({ market, timeframe }, callback) => {
        let candlesticksStream;

        this.spot.candlesticks(market, timeframe, { limit: 2 }).then(async (data) => {
          const [prevCandle, currentCandle] = data;

          callCallback(callback, prevCandle);

          let currentExchangeTime = await getExchangeTime();
          const nextCandleOpen = currentCandle.closeTime + 1000 - currentExchangeTime;

          setTimeout(async () => {
            const resolution = this._getResolution(timeframe);

            currentExchangeTime = await getExchangeTime();

            this.spot.candlesticks(market, timeframe, { limit: 2, endTime: currentExchangeTime }).then((nextData) => {
              callCallback(callback, nextData[0]);
            });

            // eslint-disable-next-line no-unused-vars
            candlesticksStream = setInterval(async () => {
              currentExchangeTime = await getExchangeTime();

              this.spot.candlesticks(market, timeframe, { limit: 2, endTime: currentExchangeTime }).then((nextData) => {
                callCallback(callback, nextData[0]);
              });
            }, resolution * 1000);
          }, nextCandleOpen);
        });
      },
    };
  }

  /**
   * @private
   */
  _sendMessage(channel, market, cb) {
    this._websocket.send(JSON.stringify({
      channel,
      market,
      op: 'subscribe',
    }));

    this._setCallback(channel, market, cb);
  }

  /**
   * @private
   */
  _setCallback(channel, market, callback) {
    const id = `${channel}-${market}`;

    this._websocketCallbacks[id] = callback;
  }

  /**
   * @private
   */
  _logger(logType, ...params) {
    // eslint-disable-next-line no-console
    if (typeof console[logType] !== 'function') {
      // eslint-disable-next-line no-console
      console.log(...params);
      return;
    }

    // eslint-disable-next-line no-console
    console[logType](...params);
  }

  /**
   * @private
   */
  _getResolution(timeframe) {
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
  }
}

module.exports = Ftx;

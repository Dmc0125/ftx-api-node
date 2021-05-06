const fetch = require('axios-wrapper-node');
const Websocket = require('ws');
const qs = require('qs');
const crypto = require('crypto');

class Ftx {
  constructor({ API_KEY, SECRET_KEY, SUBACCOUNT }) {
    this.API_URL = 'https://ftx.com/api';
    this.WS_URL = 'wss://ftx.com/ws/';

    this.API_KEY = API_KEY;
    this.SECRET_KEY = SECRET_KEY;
    this.SUBACCOUNT = decodeURI(SUBACCOUNT) === SUBACCOUNT ? encodeURI(SUBACCOUNT) : SUBACCOUNT;

    /**
     *  @private
     */
    this._websocket = null;
    /**
     *  @private
     */
    this._onMessageFunctions = [];

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

      getUserBalances: async () => {
        const endpoint = '/wallet/balances';

        const balances = await this._ftxFetch({ endpoint }, true);

        return balances.result.map(({ coin, availableWithoutBorrow, total }) => ({
          asset: coin,
          available: availableWithoutBorrow,
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

        if (typeof option === 'object') {
          Object.assign(_options, options);
        }

        if (_options.type === 'market') {
          _options.price = null;
        }

        const data = await this._ftxFetch({ endpoint: newOrderEndpoint, method: 'POST' }, true, _options);

        return data.result;
      },

      /**
       * Convert
       *
       * @param {String} fromCoin
       * @param {String} toCoin
       * @param {Number} size
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
     * @param {'15s' | '1m' | '5m' | '15m' | '1h' | '4h' | '1d'} timeframe
     * @param {{ startTime?: number; endTime?: number; limit?: number } | undefined} options
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

      singleMarket: async (marketName) => {
        const singleMarketEndpoint = `/markets/${marketName}`;

        const marketData = await this._ftxFetch(({ endpoint: singleMarketEndpoint }));

        return marketData.result;
      },
    };
  }

  get spotWebsockets() {
    // const initWebsocket = () => {
    //   this._websocket = new Websocket(this.WS_URL);

    //   this._websocket.on('open', () => {
    //     this._logger('info', 'Connected to websocket');
    //   });

    //   this._websocket.on('message', (msgJSON) => {
    //     const msg = JSON.parse(msgJSON);

    //     this._logger('info', msg);
    //     // if (msg.data) {
    //     // }
    //   });
    // };

    // const subscribe = () => {
    //   if (this._websocket && this._websocket.readyState === 0) {
    //     setTimeout(() => {
    //       this._websocket.send(JSON.stringify({
    //         op: 'subscribe',
    //         channel: 'ticker',
    //         market: 'BTC-PERP',
    //       }));
    //     }, 5000);
    //   }
    // };

    // if (!this._websocket) {
    //   initWebsocket();
    // }

    const callCallback = (cb, arg) => {
      if (typeof cb === 'function') {
        cb(arg);
      }
    };

    const getExchangeTime = async () => {
      await this._setTimeDiff();
      return new Date().getTime() + this._timeDiff;
    };

    return {
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
      markets: () => {},
    };
  }

  /**
   * @private
   */
  _logger(logType, ...params) {
    if (typeof console[logType] !== 'function') {
      console.log(...params);
      return;
    }

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

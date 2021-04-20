const fetch = require('axios-wrapper-node');
const Websocket = require('ws');
const qs = require('qs');
const crypto = require('crypto');

function Ftx({ API_KEY, SECRET_KEY, SUBACCOUNT }) {
  this.API_URL = 'https://ftx.com/api';
  this.WS_URL = 'wss://ftx.com/ws/';

  this.API_KEY = API_KEY;
  this.SECRET_KEY = SECRET_KEY;
  this.SUBACCOUNT = decodeURI(SUBACCOUNT) === SUBACCOUNT ? encodeURI(SUBACCOUNT) : SUBACCOUNT;

  const websocket = null;
  let timeDiff = null;

  const setTimeDiff = () => {
    const TIME_URL = 'https://otc.ftx.com/api/time';

    return new Promise((resolve) => {
      fetch({ url: TIME_URL }, (data) => {
        timeDiff = new Date(data.result).getTime() - new Date().getTime();
        resolve();
      });
    });
  };

  const getTimestamp = () => {
    if (timeDiff) {
      return new Date().getTime() + timeDiff;
    }

    return new Date().getTime();
  };

  this.init = async () => {
    await setTimeDiff();
  };

  const logger = (logType, ...params) => {
    if (typeof console[logType] !== 'function') {
      console.log(...params);
      return;
    }

    console[logType](...params);
  };

  const encode = (totalParams, key) => crypto
    .createHmac('sha256', `${key}`)
    .update(totalParams)
    .digest('hex');

  const ftxFetch = async ({ endpoint, method, headers }, signed, options) => {
    if (!timeDiff) {
      logger('error', 'Time diff is not defined');
      throw Error('Time diff is not defined');
    }

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

      const ts = getTimestamp();

      let signatureKey = `${ts}${requestOptions.method}/api${endpoint}`;
      if (options && Object.keys(options)) {
        signatureKey += JSON.stringify(options);
      }

      const signature = encode(signatureKey, this.SECRET_KEY);
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
  };

  this.spot = {
    /* ---- SIGNED ---- */

    async getUserBalances() {
      const endpoint = '/wallet/balances';

      const balances = await ftxFetch({ endpoint }, true);

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
    async sendOrder(market, side, type, size, options) {
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

      const data = await ftxFetch({ endpoint: newOrderEndpoint, method: 'POST' }, true, _options);

      return data.result;
    },

    /* ---- UNSIGNED ---- */

    /**
     * Get spot candlesticks data
     *
     * @param {string} marketName
     * @param {'15s' | '1m' | '5m' | '15m' | '1h' | '4h' | '1d'} timeframe
     * @param {{ start_time?: number; end_time?: number; limit?: number } | undefined} options
     */
    async candlesticks(marketName, timeframe, options = undefined) {
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

      const _options = {
        resolution,
      };

      if (typeof options === 'object') {
        Object.assign(_options, options);
      }

      const candlesticksEndpoint = `/markets/${marketName}/candles`;

      const { result: candlesticks } = await ftxFetch({ endpoint: candlesticksEndpoint }, false, _options);

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

    async singleMarket(marketName) {
      const singleMarketEndpoint = `/markets/${marketName}`;

      const marketData = await ftxFetch(({ endpoint: singleMarketEndpoint }));

      return marketData.result;
    },
  };

  this.spotWebsockets = {
    get() {
      return {
        candlesticks() {

        },
      };
    },
  };
}

module.exports = Ftx;

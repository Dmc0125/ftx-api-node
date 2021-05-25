export = Ftx;

declare class Ftx {
  constructor(options?: FtxOptions);
  public API_URL: string;
  public WS_URL: string;
  public API_KEY: string;
  public SECRET_KEY: string;
  public SUBACCOUNT: string;

  private _websocket;
  private _websocketCallbacks;
  private _timeDiff;
  private _setTimeDiff;
  private _ftxFetch;

  get spot(): {
    accountBalances: () => Promise<AccountBalancesResponse[]>;

    sendOrder: (market: string, side: string, type: string, size: number, options?: SendOrderOptions) => Promise<SendOrderResponse>;

    convert: (fromCoin: string, toCoin: string, size: number) => Promise<any>;
    
    candlesticks: (marketName: string, timeframe: Timeframe, options?: CandlesticksOptions) => Promise<CandlesticksResponse[]>;

    singleMarket: (marketName: string) => Promise<SingleMarketResponse>;

    orderbook: (marketName: string, options?: OrderbookOptions) => Promise<OrderbookResponse>;
  };

  get spotWebsockets(): {
    orderbook: (markets: string[], callback: (message: SubscribeMessage | OrderbookInitMessage | OrderbookUpdateMessage) => void) => void;

    ticker: (markets: string[], callback: (message: SubscribeMessage | TickerMessage) => void) => void;

    candlesticks: ({ market, timeframe }: CandlesticksStreamSettings, callback: (message: CandlesticksResponse) => void) => void;
  };

  private _callCallback
  private _subscribe
  private _initWebsocket
  private _sendMessage;
  private _setCallback;
}

interface FtxOptions {
  API_KEY: string;
  SECRET_KEY: string;
  SUBACCOUNT?: string;
}

type Timeframe = '15s' | '1m' | '5m' | '15m' | '1h' | '4h' | '1d';

// METHOD OPTIONS

interface SendOrderOptions {
  price?: number;
  size?: number;
  reduceOnly?: boolean;
  ioc?: boolean;
  postOnly?: boolean;
  clientId?: any;
}

interface CandlesticksOptions {
  startTime?: number;
  endTime?: number;
  limit?: number;
}

interface OrderbookOptions {
  depth: number;
}

interface CandlesticksStreamSettings {
  market: string;
  timeframe: Timeframe;
}

// METHOD RESPONSES

interface AccountBalancesResponse {
  asset: string;
  available: number;
  inOrder: number;
}

interface SendOrderResponse {
  createdAt: string;
  filledSize: number;
  future: string;
  id: number;
  market: string;
  price: number;
  remainingSize: number;
  side: string;
  size: number;
  status: string;
  type: string;
  reduceOnly: boolean;
  ioc: boolean;
  postOnly: boolean;
  clientId: any;
}

interface CandlesticksResponse {
  volume: number;
  openTime: number;
  closeTime: number;
  o: number;
  h: number;
  l: number;
  c: number;
}

interface SingleMarketResponse {
  name: string;
  enabled: boolean;
  postOnly: boolean;
  priceIncrement: number;
  sizeIncrement: number;
  minProvideSize: number;
  last: number;
  bid: number;
  ask: number;
  price: number;
  type: string;
  baseCurrency: string;
  quoteCurrency: string;
  underlying: any;
  restricted: boolean;
  highLeverageFeeExempt: boolean;
  change1h: number;
  change24h: number;
  changeBod: number;
  quoteVolume24h: number;
  volumeUsd24h: number;
}

type Order = [Number, Number];

interface OrderbookResponse {
  bids: Order[];
  asks: Order[];
}

// WEBSOCKETS PAYLOAD

interface StreamMessage {
  channel: string;
  market: string;
}

interface SubscribeMessage extends StreamMessage {
  type: 'subscribed';
}

interface OrderbookData {
  time: number;
  checksum: number;
  bids: Order[];
  asks: Order[];
  action: string;
}

interface OrderbookInitMessage extends StreamMessage {
  type: 'partial';
  data: OrderbookData;
}

interface OrderbookUpdateMessage extends StreamMessage {
  type: 'update';
  data: OrderbookData;
}

interface TickerData {
  bid: number;
  ask: number;
  bidSize: number;
  askSize: number;
  last: number;
  time: number;
}

interface TickerMessage extends StreamMessage {
  type: 'update';
  data: TickerData;
}

export = Ftx;

declare namespace Ftx {
  export interface FtxOptions {
    API_KEY: string;
    SECRET_KEY: string;
    SUBACCOUNT?: string;
  }

  export type Timeframe = '15s' | '1m' | '5m' | '15m' | '1h' | '4h' | '1d';

  // METHOD OPTIONS

  export interface SendOrderOptions {
    price?: number;
    reduceOnly?: boolean;
    ioc?: boolean;
    postOnly?: boolean;
    clientId?: any;
  }

  export interface CandlesticksOptions {
    startTime?: number;
    endTime?: number;
    limit?: number;
  }

  export interface OrderbookOptions {
    depth: number;
  }

  // METHOD RESPONSES

  export interface AccountBalancesResponse {
    asset: string;
    available: number;
    inOrder: number;
  }

  export interface SendOrderResponse {
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

  export interface CandlesticksResponse {
    volume: number;
    openTime: number;
    closeTime: number;
    o: number;
    h: number;
    l: number;
    c: number;
  }

  export interface SingleMarketResponse {
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

  export type Order = [Number, Number];

  export interface OrderbookResponse {
    bids: Order[];
    asks: Order[];
  }

  // STREAMS OPTIONS

  export interface CandlesticksStreamSettings {
    market: string;
    timeframe: Timeframe;
  }

  // STREAM MESSAGES

  export interface StreamMessage {
    channel: string;
    market: string;
  }
  
  export interface SubscribeMessage extends StreamMessage {
    type: 'subscribed';
  }


  export interface OrderbookData {
    time: number;
    checksum: number;
    bids: Order[];
    asks: Order[];
    action: string;
  }

  export interface OrderbookInitMessage extends StreamMessage {
    type: 'partial';
    data: OrderbookData;
  }
  
  export interface OrderbookUpdateMessage extends StreamMessage {
    type: 'update';
    data: OrderbookData;
  }


  export interface TickerData {
    bid: number;
    ask: number;
    bidSize: number;
    askSize: number;
    last: number;
    time: number;
  }

  export interface TickerMessage extends StreamMessage {
    type: 'update';
    data: TickerData;
  }
}

declare class Ftx {
  constructor(options?: Ftx.FtxOptions);
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
    accountBalances: () => Promise<Ftx.AccountBalancesResponse[]>;

    sendOrder: (market: string, side: string, type: string, size: number, options?: Ftx.SendOrderOptions) => Promise<Ftx.SendOrderResponse>;

    convert: (fromCoin: string, toCoin: string, size: number) => Promise<any>;
    
    candlesticks: (marketName: string, timeframe: Ftx.Timeframe, options?: Ftx.CandlesticksOptions) => Promise<Ftx.CandlesticksResponse[]>;

    singleMarket: (marketName: string) => Promise<Ftx.SingleMarketResponse>;

    orderbook: (marketName: string, options?: Ftx.OrderbookOptions) => Promise<Ftx.OrderbookResponse>;
  };

  get spotWebsockets(): {
    orderbook: (markets: string[], callback: (message: Ftx.SubscribeMessage | Ftx.OrderbookInitMessage | Ftx.OrderbookUpdateMessage) => void) => void;

    ticker: (markets: string[], callback: (message: Ftx.SubscribeMessage | Ftx.TickerMessage) => void) => void;

    candlesticks: ({ market, timeframe }: Ftx.CandlesticksStreamSettings, callback: (message: Ftx.CandlesticksResponse) => void) => void;
  };

  private _callCallback
  private _subscribe
  private _initWebsocket
  private _sendMessage;
  private _setCallback;
}

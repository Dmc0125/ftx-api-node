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

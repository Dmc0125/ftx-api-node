module.exports = {
  env: {
    commonjs: true,
    es2021: true,
    node: true,
  },
  extends: [
    'airbnb-base',
  ],
  parserOptions: {
    ecmaVersion: 12,
  },
  rules: {
    'no-underscore-dangle': 0,
    'max-len': ['error', { code: 150 }],
    camelcase: 0,
    'class-methods-use-this': 0,
  },
};

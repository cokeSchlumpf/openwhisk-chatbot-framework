const lodash = require('lodash');
const openwhisk = require('openwhisk');

const db = require('./modules/db');
const config = require('./modules/config');

module.exports = (params) => {
  const ow = openwhisk();

  return {
    db: db(params, ow),
    config: config(params, ow)
  }
}
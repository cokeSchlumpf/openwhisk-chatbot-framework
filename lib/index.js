const lodash = require('lodash');
const openwhisk = require('openwhisk');

const db = require('./modules/db');
const config = require('./modules/config');
const logger = require('./modules/logger');
const util = require('./modules/util');

module.exports = (params) => {
  const ow = openwhisk();

  return {
    db: db(params, ow),
    config: config(params, ow),
    log: logger(params, ow),
    util: util(params, ow)
  }
}
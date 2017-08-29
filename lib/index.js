const lodash = require('lodash');
const openwhisk = require('openwhisk');

module.exports = (params) => {
  const ow = openwhisk();

  return {
    db: require('./modules/db')(params, ow),
    config: require('./modules/config')(params, ow)
  }
}
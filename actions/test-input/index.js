const _ = require('lodash');

exports.main = (params) => {
  console.log('TEST-INPUT');
  return {
    statusCode: 200,
    params
  }
};
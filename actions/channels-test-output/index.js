const _ = require('lodash');
const botpack = require('serverless-botpack-lib');

exports.main = (params) => {
  const bot = botpack(params);
  const message = _.get(params, 'message', _.get(params, 'payload.output.message'));

  bot.log.info(message);

  return Promise.resolve({
    statusCode: 200
  });
}
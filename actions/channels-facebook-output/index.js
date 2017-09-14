const _ = require('lodash');
const botpack = require('serverless-botpack-lib');

exports.main = (params) => {
  const bot = botpack(params);

  bot.log.info(_.get(params, 'payload.output.message', 'No message found.'));

  return Promise.resolve({
    statusCode: 200
  });
}
const lodash = require('lodash');
const botpack = require('serverless-botpack-lib');

exports.main = (params) => {
  const bot = botpack(params);

  const message = _.get(params, 'payload.context.message');
  let sendPromise;
  if (message) {
    sendPromise = bot.send(message)
  } else {
    sendPromise = Promise.resolve();
  }

  return sendPromise.then(() => ({
    statusCode: 200,
    payload: payload
  }));
}
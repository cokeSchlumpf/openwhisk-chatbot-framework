const _ = require('lodash');
const botpack = require('serverless-botpack-lib');

exports.main = (params) => {
  const bot = botpack(params);

  const message = _.get(params, 'payload.context.message');
  let sendPromise;

  if (message) {
    if (_.isArray(message)) {
      sendPromise = Promise.all(_.map(message, msg => bot.send(msg)));
    } else {
      sendPromise = bot.send(message)
    }
  } else {
    sendPromise = Promise.resolve();
  }

  return sendPromise.then(() => ({
    statusCode: 200,
    payload: payload
  }));
}
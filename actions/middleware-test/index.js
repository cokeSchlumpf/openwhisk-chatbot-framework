const botpack = require('serverless-botpack-lib');

exports.main = (params) => {
  const bot = botpack(params);

  bot.log.info(params.payload);

  return new Promise((resolve, reject) => {
    bot.send('#hello')
      .then(payload => {
        bot.send('#howdy').then(payload => {
          resolve({
            statusCode: 200,
            payload: payload
          });
        });
      });
  });
}
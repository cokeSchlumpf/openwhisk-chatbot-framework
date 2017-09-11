const botpack = require('serverless-botpack-lib');

exports.main = (params) => {
  const bot = botpack(params);

  return new Promise((resolve, reject) => {
    setTimeout(() => {
      bot.send('#hello')
        .then(payload => {
          bot.send('#howdy').then(payload => {
            resolve({
              statusCode: 200,
              payload: payload
            });
          });
        });
    }, 15000);
  });
}
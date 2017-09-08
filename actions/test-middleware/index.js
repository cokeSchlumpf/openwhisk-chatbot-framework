const botpack = require('serverless-botpack-lib');

exports.main = (params) => {
  const bot = botpack(params);

  return new Promise((resolve, reject) => {
    setTimeout(() => {
      resolve({
        statusCode: 200,
        payload: params.payload
      });
    }, 15000);
  });
}
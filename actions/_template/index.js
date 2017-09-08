const botpack = require('serverless-botpack-lib');

exports.main = (params) => {
  const bot = botpack(params);

  return Promise.resolve({
    statusCode: 200
  });
}
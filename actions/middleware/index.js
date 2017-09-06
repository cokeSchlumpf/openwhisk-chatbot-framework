const _ = require('lodash');
const openwhisk = require('openwhisk');
const Validator = require('better-validator');
const wskbotfwk = require('serverless-botpack-lib');

exports.main = (params) => {
  const ow = openwhisk();
  const bot = wskbotfwk(params);

  const middlewares = _.get(params, 'config.middleware', []);
  const payload = _.get(params, 'payload');

  const checkPayload = (payload, origin) => {
    return bot.util
      .validatePayload(payload, 'INPUT')
      .catch(error => Promise.reject({
        statusCode: 400,
        error: {
          message: origin ? `The payload returned by '${origin}' is not valid.` : 'The payload is not valid.',
          parameters: {
            payload,
            validationErrors: error
          }
        }
      }));
  }

  const processMiddleware = (ow, middlewares, payload) => {
    const middleware = _.first(middlewares);
    const remaining = _.tail(middlewares);

    if (middleware) {
      const invokeParams = {
        name: middleware.action,
        blocking: true,
        result: true,
        params: _.assign({}, { payload }, middleware.parameters || {})
      };

      return ow.actions.invoke(invokeParams)
        .then(result => {
          const payload = _.get(result, 'payload');
          
          return checkPayload(payload, middleware.action)
            .then(() => {
              if (result.statusCode !== 200) {
                return Promise.resolve([middleware.action]);
              } else {
                return processMiddleware(ow, remaining, payload)
                  .then(result => _.concat([middleware.action], result));
              }
            })
        });
    } else {
      return Promise.resolve([]);
    }
  }

  return checkPayload(payload)
    .then(() => processMiddleware(ow, middlewares, payload))
    .catch(bot.util.defaultErrorHandler);
};
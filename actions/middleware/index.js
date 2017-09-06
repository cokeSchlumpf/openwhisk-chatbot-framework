const _ = require('lodash');
const openwhisk = require('openwhisk');
const Validator = require('better-validator');
const wskbotfwk = require('openwhisk-chatbot-framework');

exports.main = (params) => {
  const ow = openwhisk();
  const bot = wskbotfwk(params);

  const middlewares = _.get(params, 'config.middleware', []);
  const payload = _.get(params, 'payload');

  const checkPayload = (origin) => (payload) => {
    return bot.util
      .validatePayload(payload, 'INPUT')
      .catch(error => Promise.reject({
        statusCode: 400,
        error: {
          message: origin ? `The payload returned by '${origin}' is not valid.` : 'The payload is not valid.',
          parameters: {
            payload,
            validationErrors: errors
          }
        }
      }));
  }

  const processMiddleware = (ow, middlewares) => (payload) => {
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
        .then(checkPayload(middleware.action))
        .then(payload => {
          if (payload.statusCode !== 200) {
            return Promise.resolve([middleware.action]);
          } else {
            return processMiddleware(ow, remaining)(payload)
              .then(result => _.concat([middleware.action], result));
          }
        });
    } else {
      return Promise.resolve([]);
    }
  }

  return checkPayload()(payload)
    .then(processMiddleware(ow, middlewares))
    .catch(bot.util.defaultErrorHandler);
};
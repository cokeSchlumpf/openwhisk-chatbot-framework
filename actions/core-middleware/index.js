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

  const enrichPayload = (payload) => {
    return bot.context
      .load(payload, { [`${payload.input.channel}_id`]: payload.input.user });
  }

  const processMiddleware = (middlewares, payload) => {
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
          const statusCode = _.get(result, 'statusCode');

          switch (statusCode) {
            case 204: // No content, done
              return Promise.resolve({
                processed: [middleware.action],
                payload: payload
              });
            case 200:
              return checkPayload(payload, middleware.action)
                .then(payload => processMiddleware(remaining, payload))
                .then(result => {
                  return {
                    processed: _.concat([middleware.action], result.processed),
                    payload: result.payload
                  };
                });
            default:
              return Promise.reject({
                statusCode: 400,
                error: {
                  message: `The middleare action '${middleware.action}' returned no valid status code.`,
                  parameters: {
                    payload
                  }
                }
              });
          }
        });
    } else {
      return Promise.resolve({
        processed: [],
        payload: payload
      });
    }
  }

  return checkPayload(payload)
    .then(payload => enrichPayload(payload))
    .then(payload => processMiddleware(middlewares, payload))
    .then(result => bot.context.persist(result.payload).then(() => result.processed))
    .then(result => ({
      statusCode: 200,
      result
    }))
    .then(bot.util.defaultAsyncResultHandler)
    .catch(bot.util.defaultAsyncResultHandler);
};
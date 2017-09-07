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
    return bot.db
      .read({ type: 'user', [`${payload.input.channel}_id`]: payload.input.user })
      .then(results => {
        if (_.size(results) > 0) { // we've found an existing user
          return _.head(results);
        } else { // no user found
          const user = _.assign({}, {
            type: 'user',
            [`${payload.input.channel}_id`]: payload.input.user
          }, _.pick(payload.input, 'profile'));
          
          return bot.db.create(user);
        }
      })
      .then(user => {
        return _.assign({}, payload, { conversationcontext: { user } });
      });
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
          
          return checkPayload(payload, middleware.action)
            .then(() => {
              if (result.statusCode !== 200) {
                return Promise.resolve([middleware.action]);
              } else {
                return processMiddleware(remaining, payload)
                  .then(result => _.concat([middleware.action], result));
              }
            })
        });
    } else {
      return Promise.resolve([]);
    }
  }

  return checkPayload(payload)
    .then(payload => enrichPayload(payload))
    .then(payload => processMiddleware(middlewares, payload))
    .then(result => ({
      statusCode: 200,
      result
    }))
    .then(bot.util.defaultAsyncResultHandler)
    .catch(bot.util.defaultAsyncResultHandler);
};
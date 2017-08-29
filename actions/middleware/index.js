const _ = require('lodash');
const openwhisk = require('openwhisk');
const Validator = require('better-validator');

const checkPayload = (origin) => (payload) => {
  const validator = new Validator();
  validator(payload).required().isObject(obj => {
    obj('input').required().isObject(obj => {
      obj('channel').required().isString();
    });
  });

  const errors = validator.run();
  if (_.size(errors) === 0) {
    return Promise.resolve(payload);
  } else {
    return Promise.reject({
      statusCode: 400,
      error: {
        message: origin ? `The payload returned by '${origin}' is not valid.` : 'The payload is not valid.',
        parameters: {
          payload,
          validationErrors: errors
        }
      }
    });
  }
}

const processError = (error) => {
  // TODO log
  return Promise.resolve(error);
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
          return Promise.resolve([ middleware.action ]);
        } else {
          return processMiddleware(ow, remaining)(payload)
            .then(result => _.concat([ middleware.action ], result));
        }
      });
  } else {
    return Promise.resolve([]);
  }
}

exports.main = (params) => {
  const middlewares = _.get(params, 'config.middleware', []);
  const ow = openwhisk();
  const payload = params.payload;

  return checkPayload()(payload)
    .then(processMiddleware(ow, middlewares))
    .catch(processError);
};
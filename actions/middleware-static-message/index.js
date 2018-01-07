const _ = require('lodash');

const error = (params) => (error = {}) => {
  if (error instanceof Error && process.env.NODEENV !== 'test') {
    console.error(error);
  }

  _.set(error, 'statusCode', _.get(error, 'statusCode', 500));
  _.set(error, 'error.message', _.get(error, 'error.message', 'internal error during action execution'));
  _.set(error, 'error.parameters.input', params);
  _.set(error, 'payload', _.get(params, 'payload', {}));

  return Promise.reject(error);
}

const process = (params = {}) => {
  const current = _.get(params, 'payload.context.output.messages', []);
  _.set(params, 'payload.context.output.messages', _.concat(current, params.message));

  return Promise.resolve({
    statusCode: 200,
    payload: params.payload
  });
}

const validate = (params = {}) => {
  if (_.isUndefined(params.message)) {
    return Promise.reject({
      statusCode: 404,
      error: {
        message: 'The required parameter `message` is not defined.'
      }
    });
  }

  return Promise.resolve(params);
}

exports.main = (params) => {
  return Promise.resolve(params)
    .then(validate)
    .then(process)
    .catch(error(params));
}
const _ = require('lodash');
const mustache = require('mustache');

const error = (params) => (error = {}) => {
  if (error instanceof Error && process.env.NODEENV !== 'test') {
    console.error(error);
  }

  _.set(error, 'statusCode', _.get(error, 'statusCode', 500));
  _.set(error, 'error.message', _.get(error, 'error.message', 'internal error during action execution'));
  _.set(error, 'error.parameters.input', params);

  return Promise.reject(error);
}

const finalize = ({ payload }) => {
  return Promise.resolve({
    statusCode: 200,
    payload: payload
  });
}

const params$messages = (params) => {
  return _.get(params, 'payload.context.output.messages');
}

const render$messages = (params) => {
  const messages = _.isArray(params$messages(params)) ? params$messages(params) : [params$messages(params)];

  const messages_transformed = _.map(messages, (message) => {
    if (_.isString(message)) {
      return mustache.render(message, _.get(params, 'payload', {}));
    } else {
      return message;
    }
  });

  if (!_.isArray(params$messages(params)) && _.size(messages_transformed) === 1) {
    _.set(params, 'payload.context.output.messages', messages_transformed[0]);
  } else {
    _.set(params, 'payload.context.output.messages', messages_transformed);
  }

  return Promise.resolve(params);
}

const validate = (params) => {
  const messages = params$messages(params);

  if (_.isUndefined(messages)) {
    return Promise.reject({
      statusCode: 404,
      error: {
        message: 'The required parameter `payload.context.output.messages` is not defined. Set the messages which should be transformed.',
      }
    });
  }

  return Promise.resolve(params);
}

exports.main = (params) => {
  return Promise.resolve(params)
    .then(validate)
    .then(render$messages)
    .then(finalize)
    .catch(error(params));
}
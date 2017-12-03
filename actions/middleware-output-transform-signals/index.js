const _ = require('lodash');
const openwhisk = require('openwhisk');

const error = (params) => (error = {}) => {
  if (error instanceof Error && process.env.NODEENV !== 'test') {
    console.error(error);
  }

  return context$append(params).then(params => {
    _.set(error, 'statusCode', _.get(error, 'statusCode', 500));
    _.set(error, 'error.message', _.get(error, 'error.message', 'internal error during action execution'));
    _.set(error, 'error.parameters.input', params);

    return Promise.reject(error);
  });
}

const finalize = ({ payload }) => {
  return Promise.resolve({
    statusCode: 200,
    payload: payload
  });
}

const validate = (params) => {
  const channel = params$channel(params);
  const messages = params$messages(params);

  if (_.isUndefined(channel)) {
    return Promise.reject({
      statusCode: 404,
      error: {
        message: 'The required parameter `channel` is not defined. Define the output channel in `payload.context.output.channel` or `payload.input.channel`.'
      }
    });
  }

  if (_.isUndefined(messages)) {
    return Promise.reject({
      statusCode: 404,
      error: {
        message: 'The required parameter `payload.context.output.messages` is not defined. Set the messages which should be sent.',
      }
    });
  }

  if (_.isUndefined(params$user_channel_id(params, channel))) {
    return Promise.reject({
      statusCode: 404,
      error: {
        message: `No channel specific user id found. The channel user id can be defined in \`payload.conversationcontext.user.${channel}_id\` or \`payload.input.user\`.`,
        parameters: {
          input: _.get(params, 'payload.input'),
          user: _.get(params, 'payload.conversationcontext.user')
        }
      }
    });
  }

  if (_.isUndefined(params$connector(params, channel))) {
    return Promise.reject({
      statusCode: 404,
      error: {
        message: `The configurtion does not include an output connector for channel '${channel}'.`,
        parameters: {
          channel: channel
        }
      }
    });
  }

  return Promise.resolve(params);
}

exports.main = (params) => {
  return Promise.resolve(params)
    .then(validate)
    .then()
    .then(finalize)
    .catch(error(params));
}
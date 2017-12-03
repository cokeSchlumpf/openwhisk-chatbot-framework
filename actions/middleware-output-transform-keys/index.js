const _ = require('lodash');

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

const params$channel = (params) => {
  return _.get(params, 'payload.context.output.channel', _.get(params, 'payload.input.channel'));
}

const params$locale = (params) => {
  return _.get(params, 'payload.context.output.locale', _.get(params, 'payload.input.locale', _.get(params, 'payload.conversationcontext.user.locale', 'NONE')));
}

const params$messages = (params) => {
  return _.get(params, 'payload.context.output.messages');
}

const params$messagetemplates = (params) => {
  return _.get(params, 'payload.transient_context.output.transform.messages', _.get(params, 'config.messages', 'NONE'));
}

const transform$replace_templates = (params) => {
  const channel = params$channel(params);
  const locale = params$locale(params);
  const messages = _.isArray(params$messages(params)) ? params$messages(params) : [params$messages(params)];
  const messagetemplates = params$messagetemplates(params);

  const messages_transformed = _.map(messages, (message) => {
    if (_.isString(message) && message.indexOf(' ') < 0 && message.indexOf('$') === 0) {
      return transform$replace_template(messagetemplates, message, channel, locale);
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

const transform$replace_template = (messagetemplates, message, channel, locale) => {
  const path = message.substring(1);

  return _.get(messagetemplates, `${path}.${locale}.${channel}.output`) ||
    _.get(messagetemplates, `${path}.${channel}.${locale}.output`) ||
    _.get(messagetemplates, `${path}.${channel}.output`) ||
    _.get(messagetemplates, `${path}.${locale}.output`) ||
    _.get(messagetemplates, `${path}.output`) ||
    _.get(messagetemplates, `${path}`) ||
    message;
}

const validate = (params) => {
  const channel = params$channel(params);
  const locale = params$locale(params);
  const messages = params$messages(params);
  const messagetemplates = params$messagetemplates(params);

  if (_.isUndefined(messages)) {
    return Promise.reject({
      statusCode: 404,
      error: {
        message: 'The required parameter `payload.context.output.messages` is not defined. Set the messages which should be transformed.',
      }
    });
  }

  if (_.isUndefined(messagetemplates)) {
    return Promise.reject({
      statusCode: 404,
      error: {
        message: 'No message teamplates found in `payload.transient_context.output.transform.messages` or `config.messages`.'
      }
    });
  }

  if (!_.isObject(messagetemplates)) {
    return Promise.reject({
      statusCode: 404,
      error: {
        message: 'Message templates must be an object for transform-keys. Please change templates or use another output-transform middleware.'
      }
    });
  }

  return Promise.resolve(params);
}

exports.main = (params) => {
  return Promise.resolve(params)
    .then(validate)
    .then(transform$replace_templates)
    .then(finalize)
    .catch(error(params));
}
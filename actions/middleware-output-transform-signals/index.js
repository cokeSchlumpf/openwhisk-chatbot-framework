const _ = require('lodash');
const openwhisk = require('openwhisk');

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
    if (_.isString(message) && _.startsWith(_.trim(message), '$')) {
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
  const signals = _
    .chain(message)
    .split(' ')
    .map(signal => _.split(signal, ':'))
    .filter(signal => _.size(signal) > 1)
    .map(signal => [_.first(signal), _.join(_.tail(signal), ':')])
    .fromPairs()
    .value();

  if (_.size(signals) === 0) {
    return message;
  }

  const ranking = _
    .chain(messagetemplates)
    .filter(template => _
      .chain(signals)
      .find((value, signal) => template[signal] && template[signal] != value)
      .isUndefined()
      .value())
    .map(template => {
      const count = _.reduce(signals, (count, value, signal) => {
        return _.isUndefined(template[signal]) ? count : count + 1;
      }, 0);

      return {
        count,
        template
      }
    })
    .sortBy(['count'])
    .reverse()
    .value();

  if (_.size(ranking) === 0 || ranking[0].count === 0) {
    return message;
  }

  const template = _
    .chain(ranking)
    .takeWhile({ count: ranking[0].count })
    .sample()
    .value()
    .template;

  if (_.isArray(template.value)) {
    return transform$replace_template(template.value, message, channel, locale);
  } else if (_.isObject(template.value)) {
    return _.get(template.value, `${locale}.${channel}.text`) ||
    _.get(template.value, `${channel}.${locale}.text`) ||
    _.get(template.value, `${channel}.text`) ||
    _.get(template.value, `${locale}.text`) ||
    _.get(template.value, `text`);
  } else {
    console.warn({
      statusCode: 404,
      error: {
        message: 'The message template is invalid and has no valid `value` field (array or object).',
        parameters: {
          template
        }
      }
    });

    return message;
  }
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

  if (!_.isArray(messagetemplates)) {
    return Promise.reject({
      statusCode: 404,
      error: {
        message: 'Message templates must be an array for transform-signals. Please change templates or use another output-transform middleware.'
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
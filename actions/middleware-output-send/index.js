const _ = require('lodash');
const ms = require('ms');
const openwhisk = require('openwhisk');

const connector$call = (params, connector, user_channel_id, message) => {
  const ow = openwhisk();
  
  let action_name = connector.action;
  if (action_name.indexOf("/") < 0) {
    const ow_package = _.get(params, 'config.openwhisk.package', _
      .chain(process)
      .get('env.__OW_ACTION_NAME', '/././.')
      .split('/')
      .nth(-2)
      .value());
    action_name = `${ow_package}/${action_name}`
  }

  const invokeParams = {
    name: action_name,
    blocking: true,
    result: true,
    params: _.assign({}, { payload: params.payload, response: _.get(params, 'payload.response', {}), message, user: user_channel_id }, connector.parameters || {})
  }

  return ow.actions.invoke(invokeParams).then((result = {}) => {
    if (_.isObject(result.response)) {
      _.set(params, 'payload.response', result.response);
    }

    return result;
  });
}

const context$append = (params) => {
  const sent = _.get(params, 'context.output.sent', []);

  if (_.size(sent) > 0) {
    const output = _.get(params, 'payload.output', []);
    _.set(params, 'payload.output', _.concat(output, _.get(params, 'context.output')));
  }

  return Promise.resolve(params);
}

const context$sent = (params, message) => {
  const sent = _.get(params, 'context.output.sent', []);
  const now = new Date();

  const sent_entry = {
    message: message,
    sent: [now.getFullYear(), now.getMonth() + 1, now.getDate(), now.getHours(), now.getMinutes(), now.getSeconds()],
    sent_timestamp: now.getTime()
  }

  _.set(params, 'context.output.sent', _.concat(sent, sent_entry));

  return Promise.resolve(params);
}

const context$initialize = (params) => {
  _.set(params, 'context.output', {
    channel: params$channel(params),
    sent: []
  });

  return params;
}

const error = (params) => (error = {}) => {
  if (error instanceof Error && process.env.NODEENV !== 'test') {
    console.error(error);
  }

  return context$append(params).then(params => {
    _.set(error, 'statusCode', _.get(error, 'statusCode', 500));
    _.set(error, 'error.message', _.get(error, 'error.message', 'internal error during action execution'));
    _.set(error, 'error.parameters.input', params);
    _.set(error, 'payload', _.get(params, 'payload', {}));

    return Promise.reject(error);
  });
}

const finalize = ({ payload }) => {
  return Promise.resolve({
    statusCode: 200,
    payload: payload
  });
}

const message$send = (params, connector, user_channel_id, message) => {
  if (_.isObject(message) && message.wait) {
    return message$wait(params, connector, user_channel_id, message);
  } else {
    return connector$call(params, connector, user_channel_id, message);
  }
}

const message$wait = (params, connector, user_channel_id, message) => {
  let time = ms(message.wait);

  if (time > ms('10s')) {
    console.warn('A wait-time, higher than 10s is not allowed. Will only wait for 10s.');
    time = 10000;
  }

  let action = Promise.resolve();
  if (_.size(_.keys(message)) > 1) {
    action = connector$call(params, connector, user_channel_id, _.omit(message, 'wait'));
  }

  return action.then(() => new Promise(resolve => {
    setTimeout(() => {
      resolve({
        statusCode: 200
      });
    }, time);
  }));
}

const messages$send = (params) => {
  const channel = params$channel(params);
  const connector = params$connector(params, channel);
  const messages = params$messages(params);
  const user_channel_id = params$user_channel_id(params, channel);

  return messages$send$recursive(params, connector, user_channel_id, _.isArray(messages) ? messages : [messages]);
}

const messages$send$recursive = (params, connector, user_channel_id, messages = []) => {
  if (_.size(messages) === 0) {
    return Promise.resolve(params);
  } else {
    const message = _.first(messages);
    const remaining = _.tail(messages);

    return message$send(params, connector, user_channel_id, message)
      .then(result => {
        if (result.statusCode !== 200) return Promise.reject(result);
        return context$sent(params, message);
      })
      .then(params => messages$send$recursive(params, connector, user_channel_id, remaining))
      .catch(error => {
        return Promise.reject({
          statusCode: 503,
          error: {
            message: `There was an error sending a message via output connector '${connector.action}'.`,
            parameters: {
              connector: connector,
              error: error,
              message: message
            }
          }
        });
      });
  }
}

const params$channel = (params) => {
  return _.get(params, 'payload.context.output.channel', _.get(params, 'payload.input.channel'));
}

const params$connector = (params, channel) => {
  const connectors = _
    .chain(params)
    .get('config.connectors', {})
    .omitBy((connector = {}) => _.isUndefined(connector.output))
    .mapValues((connector, name) => {
      return _.assign({}, _.get(connector, 'output', {}), { channel: name })
    })
    .value();

  return connectors[channel];
}

const params$user_channel_id = (params, channel) => {
  return _.get(params, `payload.conversationcontext.user.${channel}_id`, _.get(params, 'payload.input.user'));
}

const params$messages = (params) => {
  return _.get(params, 'payload.context.output.messages');
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
    .then(context$initialize)
    .then(messages$send)
    .then(context$append)
    .then(finalize)
    .catch(error(params));
}
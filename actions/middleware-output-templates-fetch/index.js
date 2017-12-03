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

const messages$fetch = (params) => {
  const invokeParams = {
    name: params$action$name(params),
    blocking: true,
    result: true,
    params: _.assign({}, params$action$parameters(params), {
      channel: params$channel,
      locale: params$locale
    })
  }

  return openwhisk().actions.invoke(invokeParams).then((result = {}) => {
    if (result.statusCode !== 200) return Promise.reject(result);

    const messages = _.get(result, 'messages', {});
    _.set(params, 'payload.transient_context.output.transform.messages', messages);
    return Promise.resolve(params);
  }).catch(error => {
    return Promise.reject({
      statusCode: 503,
      error: {
        message: `There was an error execuing the action '${params$action$name(params)}'.`,
        parameters: {
          error: error
        }
      }
    });
  });
}

const params$action$name = (params) => {
  return _.get(params, 'config.messages.action.name');
}

const params$action$parameters = (params) => {
  return _.get(params, 'config.messages.action.parameters', {});
}

const params$channel = (params) => {
  return _.get(params, 'payload.context.output.channel', _.get(params, 'payload.input.channel'));
}

const params$locale = (params) => {
  return _.get(params, 'payload.context.output.locale', _.get(params, 'payload.input.locale', _.get(params, 'payload.conversationcontext.user.locale')));
}

const validate = (params) => {
  const action = params$action$name(params);

  if (_.isUndefined(action)) {
    return Promise.reject({
      statusCode: 404,
      error: {
        message: 'The required parameter `messages.action.name` is not defined in the configuration. Please specify an action within the configuration to fetch the messages from.',
      }
    });
  }

  return Promise.resolve(params);
}

exports.main = (params) => {
  return Promise.resolve(params)
    .then(validate)
    .then(messages$fetch)
    .then(finalize)
    .catch(error(params));
}
const _ = require('lodash');
const Promise = require('bluebird');
const WatsonConversation = require('watson-developer-cloud/conversation/v1');

const DEFAULT_SERVICE_NAME = 'wcs';

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

const finalize = ({ payload }) => {
  return Promise.resolve({
    statusCode: 200,
    payload: payload
  });
}

const params$context = (params, servicename) => {
  return _.get(params, 'context') ||
    _.get(params, `payload.conversationcontext.services.${servicename || DEFAULT_SERVICE_NAME}`, {});
}

const params$message = (params, servicename) => {
  return _.get(params, 'message') ||
    _.get(params, `payload.context.services.${servicename || DEFAULT_SERVICE_NAME}.message`) ||
    _.get(params, `payload.context.services.${DEFAULT_SERVICE_NAME}.message`) ||
    _.get(params, 'payload.input.message');
}

const params$wcs$password = (params, servicename) => {
  return _.get(params, 'password') ||
    _.get(params, `config.services.${servicename || DEFAULT_SERVICE_NAME}.password`) ||
    _.get(params, `config.services.${DEFAULT_SERVICE_NAME}.password`);
}

const params$wcs$username = (params, servicename) => {
  return _.get(params, 'username') ||
    _.get(params, `config.services.${servicename || DEFAULT_SERVICE_NAME}.username`) ||
    _.get(params, `config.services.${DEFAULT_SERVICE_NAME}.username`);
}

const params$wcs$workspace = (params, servicename) => {
  return _.get(params, 'workspace') ||
    _.get(params, `config.services.${servicename || DEFAULT_SERVICE_NAME}.workspace`) ||
    _.get(params, `config.services.${DEFAULT_SERVICE_NAME}.workspace`);
}

const params$servicename = (params) => {
  return _.get(params, 'servicename');
}

const validate = (params) => {
  const servicename = params$servicename(params);
  const username = params$wcs$username(params, servicename);
  const password = params$wcs$password(params, servicename);
  const workspace = params$wcs$workspace(params, servicename);
  const message = params$message(params, servicename);

  if (_.isUndefined(username)) {
    return Promise.reject({
      statusCode: 404,
      error: {
        message: 'The required parameter `username` is not defined for accessing IBM Watson Conversation Service.'
      }
    });
  }

  if (_.isUndefined(password)) {
    return Promise.reject({
      statusCode: 404,
      error: {
        message: 'The required parameter `password` is not defined for accessing IBM Watson Conversation Service.'
      }
    });
  }

  if (_.isUndefined(workspace)) {
    return Promise.reject({
      statusCode: 404,
      error: {
        message: 'The required parameter `workspace` is not defined for accessing IBM Watson Conversation Service.'
      }
    });
  }

  if (_.isUndefined(message)) {
    return Promise.reject({
      statusCode: 404,
      error: {
        message: 'The required parameter `message` is not defined.'
      }
    });
  }

  return Promise.resolve(params);
}

const wcs$call = (params) => {
  const servicename = params$servicename(params);
  const username = params$wcs$username(params, servicename);
  const password = params$wcs$password(params, servicename);
  const workspace_id = params$wcs$workspace(params, servicename);
  const message = params$message(params, servicename);
  const context = params$context(params, servicename);

  const conversation = Promise.promisifyAll(new WatsonConversation({
    username,
    password,
    path: { workspace_id },
    version_date: WatsonConversation.VERSION_DATE_2017_04_21
  }));

  const request = {
    input: {
      text: message
    },
    context: context
  }

  return conversation.messageAsync(request)
    .then(response => {
      _.set(params, `payload.conversationcontext.services.${servicename || DEFAULT_SERVICE_NAME}`, _.get(response, 'context', {}));
      _.set(params, `payload.context.services.${servicename || DEFAULT_SERVICE_NAME}`, _.omit(response, 'context'));
      
      const wcs_messages = _.get(response, 'output.text', []);
      let current_messages = _.get(params, 'payload.context.output.messages', []);
      if (!_.isArray(current_messages)) current_messages = [ current_messages ];

      _.set(params, 'payload.context.output.messages', _.concat(current_messages, wcs_messages));

      return Promise.resolve(params);
    });
}

exports.main = (params) => {
  return Promise.resolve(params)
    .then(validate)
    .then(wcs$call)
    .then(finalize)
    .catch(error(params));
}
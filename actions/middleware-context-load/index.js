const _ = require('lodash');
const cloudantclient = require('cloudant');

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

const context$load = (params) => {
  const url = _.get(params, 'config.cloudant.url');
  const database = _.get(params, 'config.cloudant.database');

  const cloudantConfig = { url, plugin: 'promises' };
  const db = cloudantclient(cloudantConfig).db.use(database);

  return db.find({
    selector: {
      type: 'conversationcontext',
      user: _.get(params, 'payload.conversationcontext.user._id')
    },
    limit: 1
  }).catch((error = {}) => {
    return Promise.reject({
      statusCode: 503,
      error: {
        message: 'error fetching the conversationcontext from the database',
        parameters: {
          cause: error
        }
      }
    });
  }).then(result => {
    const conversationcontext = _.get(result, 'docs[0]', {
      type: 'conversationcontext'
    });

    _.set(conversationcontext, 'user', _.get(params, 'payload.conversationcontext.user'));
    _.set(params, 'payload.conversationcontext', conversationcontext);

    return Promise.resolve(params);
  });
}

const validate = (params) => {
  if (_.isUndefined(_.get(params, 'payload.conversationcontext.user._id'))) {
    return Promise.reject({
      message: 'The required parameter `payload.conversationcontext.user._id` is not set'
    });
  }

  return Promise.resolve(params);
}

exports.main = (params) => {
  if (!_.isUndefined(_.get(params, 'payload.conversationcontext.user._id'))) {
    return Promise.resolve(params)
      .then(validate)
      .then(context$load)
      .then(finalize)
      .catch(error(params));
  } else {
    return Promise.resolve(params);
  }
}
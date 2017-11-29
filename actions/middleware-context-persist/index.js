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

const finalize = ({ context, payload }) => {
  return Promise.resolve({
    statusCode: 200,
    payload: payload,
    context: context
  });
}

const context$persist = (params) => {
  const url = _.get(params, 'config.cloudant.url');
  const database = _.get(params, 'config.cloudant.database');

  const cloudantConfig = { url, plugin: 'promises' };
  const db = cloudantclient(cloudantConfig).db.use(database);

  const conversationcontext = _.get(params, 'payload.conversationcontext', {});
  const id = conversationcontext._id;
  const rev = conversationcontext._rev;
  const user_id = _.get(conversationcontext, 'user._id');
  const conversationcontext_without_user = _.assign({}, conversationcontext, { user: user_id });



  let operation = Promise.resolve();

  if (_.isUndefined(id)) {
    // Create the conversationcontext in the database
    operation = db.insert(conversationcontext_without_user)
      .then(result => {
        conversationcontext._id = result.id;
        conversationcontext._rev = result.rev;
        return result;
      });
  } else if (_.isUndefined(rev)) {
    // Get the current revision id from the database
    operation = db.get(id)
      .then(conversationcontext_from_db => {
        conversationcontext._rev = conversationcontext_from_db._rev;
        conversationcontext_without_user._rev = conversationcontext_from_db._rev;

        return db.insert(conversationcontext_without_user)
          .then(result => {
            conversationcontext._rev = result.rev;
            return result;
          })
      });
  } else {
    operation = db.insert(conversationcontext_without_user)
      .then(result => {
        conversationcontext._rev = result.rev;
        return result;
      });
  }

  return operation
    .then(result => {
      _.set(params, 'context.cloudant_result', result);
      return params;
    })
    .catch(error => {
      if (error instanceof Error && process.env.NODEENV !== 'test') {
        console.error(error);
      }

      return Promise.reject({
        statusCode: 503,
        error: {
          message: 'There was an error updating/ inserting the conversationcontext in the database.',
          parameters: {
            error: error
          }
        }
      });
    })
}

const validate = (params) => {
  if (_.isUndefined(_.get(params, 'payload.conversationcontext'))) {
    return Promise.reject({
      message: 'The required parameter `payload.conversationcontext` is not set'
    });
  }

  if (_.isUndefined(_.get(params, 'payload.conversationcontext.user._id'))) {
    return Promise.reject({
      message: 'The required parameter `payload.conversationcontext.user._id` is not set'
    });
  }

  return Promise.resolve(params);
}

exports.main = (params) => {
  return Promise.resolve(params)
    .then(validate)
    .then(context$persist)
    .then(finalize)
    .catch(error(params));
}
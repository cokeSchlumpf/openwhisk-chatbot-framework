const _ = require('lodash');
const cloudantclient = require('cloudant');
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

const finalize = ({ context, payload }) => {
  return Promise.resolve({
    statusCode: 200,
    payload: payload,
    context: context
  });
}

const user$persist = (params) => {
  const url = _.get(params, 'config.cloudant.url');
  const database = _.get(params, 'config.cloudant.database');

  const cloudantConfig = { url, plugin: 'promises' };
  const db = cloudantclient(cloudantConfig).db.use(database);

  const user = _.get(params, 'payload.conversationcontext.user', {});
  const id = _.get(user, '_id');
  const rev = _.get(user, '_rev');

  let operation = Promise.resolve();

  if (_.isUndefined(id)) {
    // Create the user in the database
    operation = db.insert(user)
      .then(result => {
        _.set(user, '_id', result.id);
        _.set(user, '_rev', result.rev);
        return result;
      });
  } else if (_.isUndefined(rev)) {
    // Get the current revision id from the database
    operation = db.get(id)
      .then(user_from_db => {
        _.set(user, '_rev', user_from_db._rev);

        return db.insert(user)
          .then(result => {
            _.set(user, '_rev', result.rev);
            return result;
          });
      });
  } else {
    operation = db.insert(user)
      .then(result => {
        _.set(user, '_rev', result.rev);
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
          message: 'There was an error updating/ inserting the user in the database.',
          parameters: {
            error: error,
            user: user
          }
        }
      });
    })
}

const validate = (params) => {
  const user = _.get(params, 'payload.conversationcontext.user', {});

  if (_.isUndefined(user)) {
    return Promise.reject({
      statusCode: 404,
      error: {
        message: 'The required parameter `payload.conversationcontext.user` is not defined.'
      }
    });
  }

  return Promise.resolve(params);
}

exports.main = (params) => {
  return Promise.resolve(params)
    .then(validate)
    .then(user$persist)
    .then(finalize)
    .catch(error(params));
}
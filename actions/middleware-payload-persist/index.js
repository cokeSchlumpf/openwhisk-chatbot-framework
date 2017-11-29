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

const payload$persist = (params) => {
  const url = _.get(params, 'config.cloudant.url');
  const database = _.get(params, 'config.cloudant.database');

  const cloudantConfig = { url, plugin: 'promises' };
  const db = cloudantclient(cloudantConfig).db.use(database);

  const payload = _.get(params, 'payload', {});
  const id = payload._id;
  const rev = payload._rev;
  const conversationcontext_id = _.get(payload, 'conversationcontext._id');
  const payload_without_conversationcontext = _.assign({}, payload, { conversationcontext: conversationcontext_id });

  let operation = Promise.resolve();

  if (_.isUndefined(id)) {
    // Create the user in the database
    operation = db.insert(payload_without_conversationcontext)
      .then(result => {
        payload._id = result.id;
        payload._rev = result.rev;
        return result;
      });
  } else if (_.isUndefined(rev)) {
    // Get the current revision id from the database
    operation = db.get(id)
      .then(payload_from_db => {
        payload._rev = payload_from_db._rev;
        payload_without_conversationcontext._rev = payload_from_db._rev;

        return db.insert(payload_without_conversationcontext)
          .then(result => {
            payload._rev = result.rev;
            return result;
          });
      });
  } else {
    operation = db.insert(payload_without_conversationcontext)
      .then(result => {
        payload._rev = result.rev;
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
          message: 'There was an error updating/ inserting the payload in the database.',
          parameters: {
            error: error
          }
        }
      });
    })
}

const validate = (params = {}) => {
  if (_.isUndefined(params.payload)) {
    return Promise.reject({
      statusCode: 404,
      error: {
        message: 'There is no payload to persist.'
      }
    });
  }

  if (_.isUndefined(_.get(params, 'payload.conversationcontext._id'))) {
    return Promise.reject({
      statusCode: 404,
      error: {
        message: 'The required field `payload.conversationcontext._id` is not defined.'
      }
    });
  }

  return Promise.resolve(params);
}

exports.main = (params) => {
  return Promise.resolve(params)
    .then(validate)
    .then(payload$persist)
    .then(finalize)
    .catch(error(params));
}
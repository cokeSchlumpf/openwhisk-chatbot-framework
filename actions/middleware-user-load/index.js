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

const finalize = ({ payload }) => {
  return Promise.resolve({
    statusCode: 200,
    payload: payload
  });
}

const user$new = (params) => {
  const url = _.get(params, 'config.cloudant.url');
  const database = _.get(params, 'config.cloudant.database');

  const channel = _.get(params, 'payload.input.channel');

  const handlers = _
    .chain(params)
    .get('config.connectors', {})
    .omitBy((connector = {}) => _.isUndefined(connector.newuser))
    .mapValues((connector, name) => {
      return _.assign({}, _.get(connector, 'newuser'), { channel: name })
    })
    .value();

  const cloudantConfig = { url, plugin: 'promises' };
  const db = cloudantclient(cloudantConfig).db.use(database);

  let promise;

  if (handlers[channel]) {
    const ow = openwhisk();
    const handler = handlers[channel];
    
    let action_name = handler.action;

    if (action_name.indexOf("/") < 0) {
      const ow_package = _.get(params, 'config.openwhisk.package', _
        .chain(process)
        .get('env.__OW_ACTION_NAME', '/././.')
        .split('/')
        .nth(-2)
        .value());
      action_name = `${ow_package}/${action_name}`
    }

    const invokeParameters = {
      name: action_name,
      blocking: true,
      result: true,
      params: _.assign(
        {
          channel: channel
        },
        handler.parameters || {},
        {
          payload: params.payload,
        })
    }

    promise = ow.actions.invoke(invokeParameters)
      .then((result = {}) => {
        if (!_.isEqual(result.statusCode, 200)) return Promise.reject(result);
        _.set(params, 'payload', _.get(result, 'payload'));
        return Promise.resolve(params);
      })
      .catch((error = {}) => {
        if (error instanceof Error && process.env.NODEENV !== 'test') {
          console.error(error);
        }

        return Promise.reject({
          statusCode: 503,
          error: {
            message: `error calling action ${action_name}`,
            params: {
              cause: error,
              handler: handler
            }
          }
        });
      });
  } else {
    promise = Promise.resolve(params);
  }

  return promise;
}

const user$load = (params) => {
  const user_id = _.get(params, 'payload.input.user');
  const channel = _.get(params, 'payload.input.channel');

  const url = _.get(params, 'config.cloudant.url');
  const database = _.get(params, 'config.cloudant.database');

  const cloudantConfig = { url, plugin: 'promises' };
  const db = cloudantclient(cloudantConfig).db.use(database);

  return db.find({
    selector: {
      [`${channel}_id`]: user_id,
      type: 'user'
    },
    limit: 1
  }).catch((error = {}) => {
    return Promise.reject({
      statusCode: 503,
      error: {
        message: 'error fetching the user from the database',
        parameters: {
          cause: error
        }
      }
    });
  }).then(result => {
    const user = _.get(result, 'docs[0]', {
      [`${channel}_id`]: user_id,
      type: 'user'
    });

    _.set(params, 'payload.conversationcontext.user', user);

    if (_.isUndefined(user._id)) {
      return user$new(params);
    } else {
      return Promise.resolve(params);
    }
  });
}

const validate = (params) => {
  const user_id = _.get(params, 'payload.input.user');
  const channel = _.get(params, 'payload.input.channel');

  if (_.isUndefined(user_id)) {
    return Promise.reject({
      statusCode: 404,
      error: {
        message: 'The required parameter `payload.input.user` is not defined.'
      }
    });
  }

  if (_.isUndefined(channel)) {
    return Promise.reject({
      statusCode: 404,
      error: {
        message: 'The required parameter `payload.input.channel` is not defined.'
      }
    });
  }

  return Promise.resolve(params);
}

exports.main = (params) => {
  return Promise.resolve(params)
    .then(validate)
    .then(user$load)
    .then(finalize)
    .catch(error(params));
}
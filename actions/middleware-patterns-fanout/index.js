const _ = require('lodash');
const openwhisk = require('openwhisk');

const DEFAULT_PATTERN_NAME = 'fanout';

const actions$call = (params) => {
  const ow = openwhisk();
  const patternname = params$patternname(params);
  const fail_on_error = params$fail_on_error(params, patternname);
  const actions = _.get(params, 'context.actions', []);

  const actions$called = _.map(actions, (action = {}) => {
    const invokeParams = {
      name: action.action,
      blocking: true,
      result: true,
      params: _.assign({}, { payload: params.payload }, action.parameters || {})
    };

    return ow.actions.invoke(invokeParams)
      .catch(error => {
        if (fail_on_error) {
          return Promise.reject({
            statusCode: 503,
            error: {
              message: `Error calling on downstream action '${action.action}'.`
            }
          });
        } else {
          return Promise.resolve({
            statusCode: 503,
            error: error
          });
        }
      });
  });

  return Promise.all(actions$called).then(results => {
    _.set(params, 'context.results', results);
    return Promise.resolve(params);
  });
}

const actions$init = (params) => {
  const patternname = params$patternname(params);
  const actions = _
    .chain(params$actions(params, patternname))
    .mapValues((action, name) => _.assign({}, action, { name }))
    .values()
    .value();

  _.set(params, 'context.actions', actions);

  return Promise.resolve(params);
}

const actions$normalize = (params) => {
  const actions = _.get(params, 'context.actions');
  const actions$normalized = _.map((action = {}) => {
    let action_name = action_name.action;

    if (action_name.indexOf("/") < 0) {
      const ow_package = _.get(params, 'config.openwhisk.package', _
        .chain(process)
        .get('env.__OW_ACTION_NAME', '/././.')
        .split('/')
        .nth(-2)
        .value());
      action_name = `${ow_package}/${action_name}`
    }

    return _.assign(action, { action: action_name });
  });


  _.set(params, 'context.actions', actions);
  return Promise.resolve(params);
}

const error = (params) => (error = {}) => {
  if (error instanceof Error && process.env.NODEENV !== 'test') {
    console.error(error);
  }

  _.set(error, 'statusCode', _.get(error, 'statusCode', 500));
  _.set(error, 'error.message', _.get(error, 'error.message', 'internal error during action execution'));
  _.set(error, 'error.parameters.params', params);
  _.set(error, 'payload', _.get(params, 'payload', {}));

  return Promise.reject(error);
}

const finalize = (params) => {
  return Promise.resolve({
    statusCode: 200,
    payload: _.get(params, 'context.result.payload')
  });
}

/**
 * The name of the pattern, used to find the configuration values.
 * 
 * @param {*} params 
 */
const params$patternname = (params) => {
  return _.get(params, 'patternname', DEFAULT_PATTERN_NAME);
}

/**
 * The actions which are called for the fanout.
 * 
 * @param {*} params 
 * @param {*} patternname 
 */
const params$actions = (params, patternname) => {
  return _.get(params, `config.patterns.${patternname}.actions`, {});
}

const params$fail_on_error = (params, patternname) => {
  return _.get(params, `config.patterns.${patternname}.fail_on_error`, true);
}

/**
 * The field which is used to compare the results, relative to 'payload'.
 * 
 * @param {*} params 
 * @param {*} patternname 
 */
const params$rating_field = (params, patternname) => {
  return _.get(params, `config.patterns.${patternname}.rating.field`);
}

/**
 * The default value which is used for comparisson if the response does not contain the 
 * filed for comparisson.
 * 
 * @param {*} params 
 * @param {*} patternname 
 */
const params$rating_defaultValue = (params, patternname) => {
  return _.get(params, `config.patterns.${patternname}.rating.default_value`);
}

/**
 * The sort type of the results to compare. Values 'asc' and 'desc' are allowed.
 * 
 * @param {*} params 
 * @param {*} patternname 
 */
const params$rating_sort = (params, patternname) => {
  return _.get(params, `config.patterns.${patternname}.rating.sort`);
}

/**
 * Sorts the result according to the configuration and writes the selected result to the context.
 * 
 * @param {*} params 
 */
const results$rate = (params) => {
  const patternname = params$patternname(params);
  const rating_field = params$rating_field(params, patternname);
  const rating_sort = params$rating_sort(params, patternname);
  const rating_defaultValue = params$rating_defaultValue(params, patternname);
  const results = _.get(params, 'context.results', []);

  const sorted = _
    .chain(results)
    .filter(result => {
      const statusCode = _.get(result, 'statusCode', 500);
      return statusCode >= 200 && statusCode < 300
    })
    .map(result => {
      return {
        rating: _.get(result, `payload.${rating_field}`, rating_defaultValue),
        payload: _.get(result, 'payload', {})
      }
    })
    .sortBy('rating')
    .value();

  if (_.size(sorted) <= 0) {
    return Promise.reject({
      statusCode: 503,
      error: {
        message: `None of the upstream collections returned a successful result.`
      }
    });
  } else if (rating_sort === 'asc') {
    _.set(params, 'context.result', _.first(sorted));
  } else {
    _.set(params, 'context.result', _.last(sorted));
  }

  return Promise.resolve(params);
}

/**
 * Validates important input and configuration parameters.
 * 
 * @param {*} params 
 */
const validate = (params) => {
  const patternname = params$patternname(params);
  const rating_field = params$rating_field(params, patternname);
  const rating_sort = params$rating_sort(params, patternname);
  const actions = params$actions(params, patternname);

  if (_.isUndefined(rating_field)) {
    return Promise.reject({
      statusCode: 503,
      error: {
        message: `The configuration parameter 'config.patterns.${patternname}.rating.field' is not set.`
      }
    });
  }

  if (_.isUndefined(rating_sort) || (rating_sort !== 'asc' && rating_sort !== 'desc')) {
    return Promise.reject({
      statusCode: 503,
      error: {
        message: `The configuration parameter 'config.patterns.${patternname}.rating.sort' is not set or not valid. Valid values are 'asc' and 'desc'.`
      }
    });
  }

  if (!_.isObject(actions) || _.size(_.keys(actions)) === 0) {
    return Promise.reject({
      statusCode: 503,
      error: {
        message: `No actions defined at 'config.patterns.${patternname}.actions' is empty.`,
        parameters: {
          states,
          initial_state
        }
      }
    });
  }

  return Promise.resolve(params);
}

exports.main = (params) => {
  return Promise.resolve(params)
    .then(validate)
    .then(actions$init)
    .then(actions$normalize)
    .then(actions$call)
    .then(results$rate)
    .then(finalize)
    .catch(error(params));
}
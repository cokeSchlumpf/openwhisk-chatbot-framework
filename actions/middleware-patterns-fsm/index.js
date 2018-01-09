const _ = require('lodash');
const openwhisk = require('openwhisk');

const DEFAULT_PATTERN_NAME = 'fsm';

const action$call = (params) => {
  const state = _.get(params, 'context.state');
  const action = _.get(params, 'context.action');

  const ow = openwhisk();
  const invokeParams = {
    name: action.action,
    blocking: true,
    result: true,
    params: _.assign({}, { payload: params.payload }, { fsm_state: state }, action.parameters || {})
  };

  return ow.actions.invoke(invokeParams).then(result => {
    _.set(params, 'context.result', result);
    return Promise.resolve(params);
  });
}

const action$normalize = (params) => {
  let action_name = _.get(params, 'context.action.action');

  if (action_name.indexOf("/") < 0) {
    const ow_package = _.get(params, 'config.openwhisk.package', _
      .chain(process)
      .get('env.__OW_ACTION_NAME', '/././.')
      .split('/')
      .nth(-2)
      .value());
    action_name = `${ow_package}/${action_name}`
  }

  _.set(params, 'context.action.action', action_name);

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

const finalize = ({ payload }) => {
  return Promise.resolve({
    statusCode: 200,
    payload: payload
  });
}

/**
 * The data of the current state.
 * 
 * @param {*} params 
 * @param {*} patternname 
 */
const params$current_data = (params, patternname) => {
  return _.get(params, `payload.conversationcontext.patterns.${patternname}.data`);
}

/**
 * The name of the current state.
 * 
 * @param {*} params 
 * @param {*} patternname 
 */
const params$current_state = (params, patternname) => {
  return _.get(params, `payload.conversationcontext.patterns.${patternname}.state`);
}

/**
 * The initial data when the FSM starts.
 * 
 * @param {*} params 
 * @param {*} patternname 
 */
const params$initial_data = (params, patternname) => {
  return _.get(params, `config.patterns.${patternname}.initial.data`, {});
}

/**
 * The name of the initial state when the FSM starts.
 * 
 * @param {*} params 
 * @param {*} patternname 
 */
const params$initial_state = (params, patternname) => {
  return _.get(params, `config.patterns.${patternname}.initial.state`)
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
 * An object containing all states and there associated actions to call.
 * 
 * @param {*} params 
 * @param {*} patternname 
 */
const params$states = (params, patternname) => {
  return _.get(params, `config.patterns.${patternname}.states`);
}

/**
 * An action to be executed if the current state didn't handle the message properly (error).
 * 
 * @param {*} params 
 * @param {*} patternname 
 */
const params$unhandled = (params, patternname) => {
  return _.get(params, `config.patterns.${patternname}.unhandled`)
}

/**
 * 
 * @param {*} params 
 */
const result$handle = (params) => {
  const patternname = params$patternname(params);
  const statusCode = _.get(params, 'context.result.statusCode');

  const current_state = _.get(params, 'context.state.name');
  const current_data = _.get(params, 'context.state.data');

  const state_goto = _.get(params, 'context.result.fsm.goto', current_state);
  const state_using = _.get(params, 'context.result.fsm.using', current_data);

  if (statusCode === 422 && _.get(params, 'context.unhandled')) { // unsuccessful unhandled action
    return Promise.reject({
      statusCode: 503,
      error: {
        message: `Didn't handle current payload in state '${current_state}' and unhandled-handler did not handle either.`
      }
    });
  } else if (statusCode === 422) { // unhandled
    const action = params$unhandled(params, patternname);

    if (action) {
      _.set(params, 'context.action', action);
      _.set(params, 'context.unhandled', true);

      return Promise.resolve(params)
        .then(action$normalize)
        .then(action$call)
        .then(result$validate)
        .then(result$handle)
    } else {
      return Promise.reject({
        statusCode: 503,
        error: {
          message: `Didn't handle current payload in state '${current_state}' and no handler defined in 'config.patterns.${patternname}.unhandled'.`
        }
      });
    }
  } else {
    _.set(params, 'payload', _.get(params, 'context.result.payload', {}));
    _.set(params, `payload.conversationcontext.patterns.${patternname}.state`, state_goto);
    _.set(params, `payload.conversationcontext.patterns.${patternname}.data`, state_using);

    return Promise.resolve(params);
  }
}

const result$validate = (params) => {
  const action = _.get(params, 'context.action.action');
  const statusCode = _.get(params, 'context.result.statusCode');
  const payload = _.get(params, 'context.result.payload');

  if (!_.isNumber(statusCode) && !((statusCode >= 200 && statusCode < 300) || statusCode === 422)) {
    return Promise.reject({
      statusCode: 503,
      error: {
        message: `The action '${action}' did not respond with a valid status code (2xx or 422).`
      }
    });
  }

  if (_.isUndefined(payload)) {
    return Promise.reject({
      statusCode: 503,
      error: {
        message: `The action '${action}' did not respond with a payload.`
      }
    });
  }

  return Promise.resolve(params);
}

const state$init = (params) => {
  const patternname = params$patternname(params);
  const current_state = params$current_state(params, patternname);

  let state;

  if (current_state) {
    state = {
      name: current_state,
      data: params$current_data(params, patternname)
    }
  } else {
    state = {
      name: params$initial_state(params, patternname),
      data: params$initial_data(params, patternname)
    }
  }

  const action = params$states(params, patternname)[state.name];

  _.set(params, 'context.state', state);
  _.set(params, 'context.action', action);

  return Promise.resolve(params);
}

const validate = (params) => {
  const patternname = params$patternname(params);

  const current_state = params$current_state(params, patternname);
  const initial_state = params$initial_state(params, patternname);
  const states = params$states(params, patternname);

  if (_.isUndefined(patternname)) {
    return Promise.reject({
      statusCode: 503,
      error: {
        message: `The configuration parameter 'config.patterns.${patternname}' is not set.`
      }
    });
  }

  if (_.isUndefined(initial_state)) {
    return Promise.reject({
      statusCode: 503,
      error: {
        message: `The configuration parameter 'config.patterns.${patternname}.initial.state' is not set.`
      }
    });
  }

  if (_.isUndefined(_.get(states, initial_state))) {
    return Promise.reject({
      statusCode: 503,
      error: {
        message: `The initial state '${initial_state}' is not defined within 'config.patterns.${patternname}.states'.`,
        parameters: {
          states,
          initial_state
        }
      }
    });
  }

  if (current_state && _.isUndefined(_.get(states, initial_state))) {
    return Promise.reject({
      statusCode: 503,
      error: {
        message: `The current state '${current_state}' is not defined within 'config.pattern.${patternname}.states'.`
      }
    });
  }

  return Promise.resolve(params);
}

exports.main = (params) => {
  return Promise.resolve(params)
    .then(validate)
    .then(state$init)
    .then(action$normalize)
    .then(action$call)
    .then(result$validate)
    .then(result$handle)
    .then(finalize)
    .catch(error(params));
}
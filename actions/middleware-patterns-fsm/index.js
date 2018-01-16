const _ = require('lodash');
const openwhisk = require('openwhisk');

const DEFAULT_PATTERN_NAME = 'fsm';

/**
 * Calls an action as defined in the context.
 * 
 * @param {*} params 
 */
const action$call = (params) => {
  const action = _.get(params, 'context.call.action');
  const parameters = _.get(params, 'context.call.parameters', {});

  const ow = openwhisk();
  const invokeParams = {
    name: action.action,
    blocking: true,
    result: true,
    params: _.assign({}, { payload: params.payload }, _.assign({}, action.parameters, parameters))
  };

  return ow.actions.invoke(invokeParams).then(result => {
    _.set(params, 'context.call.result', result);
    return Promise.resolve(params);
  }).catch(error => {
    return Promise.reject({
      statusCode: 503,
      error: {
        message: `Error calling sub-sequent action '${action.action}'.`,
        parameters: {
          error: error,
          action: action
        }
      }
    })
  });
}

/**
 * Normalizes the name of the action defined inthe context
 * @param {*} params 
 */
const action$normalize = (params) => {
  let action_name = _.get(params, 'context.call.action.action');

  if (action_name.indexOf("/") < 0) {
    const ow_package = _.get(params, 'config.openwhisk.package', _
      .chain(process)
      .get('env.__OW_ACTION_NAME', '/././.')
      .split('/')
      .nth(-2)
      .value());
    action_name = `${ow_package}/${action_name}`
  }

  _.set(params, 'context.call.action.action', action_name);

  return Promise.resolve(params);
}

/**
 * Error handler for action.
 * 
 * @param {*} params 
 */
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

/**
 * Finalizes the action and prepares the result.
 * 
 * @param {*} params
 */
const finalize = ({ payload, response = {} }) => {
  return Promise.resolve(_.assign({
    statusCode: 200,
    payload: payload
  }, response));
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
 * The data of the current state.
 * 
 * @param {*} params 
 * @param {*} patternname 
 */
const params$state$current$data = (params, patternname) => {
  return _.get(params, `fsm.data`, _.get(params, `payload.conversationcontext.patterns.${patternname}.data`));
}

/**
 * Save new value for data to context.
 * 
 * @param {*} params 
 * @param {*} patternname 
 * @param {*} value 
 */
const params$state$current$data$set = (params, patternname, value) => {
  if (_.get(params, 'fsm')) {
    _.set(params, 'response.fsm.data', value);
  } else {
    _.set(params, `payload.conversationcontext.patterns.${patternname}.data`, value);
  }
}

/**
 * The name of the current state.
 * 
 * @param {*} params 
 * @param {*} patternname 
 */
const params$state$current$name = (params, patternname) => {
  return _.get(params, `fsm.state`, _.get(params, `payload.conversationcontext.patterns.${patternname}.state`));
}

/**
 * Save a new state to the context.
 * 
 * @param {*} params 
 * @param {*} patternname 
 * @param {string} value 
 */
const params$state$current$name$set = (params, patternname, value) => {
  if (_.get(params, 'fsm')) {
    _.set(params, 'response.fsm.state', value);
  } else {
    _.set(params, `payload.conversationcontext.patterns.${patternname}.state`, value);
  }
}

/**
 * The timestamp when the current time was set.
 * 
 * @param {*} params 
 * @param {*} patternname 
 */
const params$state$current$since = (params, patternname) => {
  return _.get(params, `fsm.since.timestamp`, _.get(params, `payload.conversationcontext.patterns.${patternname}.since.timestamp`));
}

/**
 * Save a new since date to the context.
 * 
 * @param {*} params 
 * @param {*} patternname 
 * @param {date} value 
 */
const params$state$current$since$set = (params, patternname, value) => {
  const timestamp = value.getTime();
  const datetime = [value.getFullYear(), value.getMonth() + 1, value.getDate(), value.getHours(), value.getMinutes(), value.getSeconds()];
  if (_.get(params, 'fsm')) {
    _.set(params, 'response.fsm.since.timestamp', timestamp);
    _.set(params, 'response.fsm.since.datetime', datetime);
  } else {
    _.set(params, `payload.conversationcontext.patterns.${patternname}.since.timestamp`, timestamp);
    _.set(params, `payload.conversationcontext.patterns.${patternname}.since.datetime`, datetime);
  }
}

/**
 * The timeout of the current action.
 * 
 * @param {*} params 
 * @param {*} patternname 
 */
const params$state$current$timeout$ms = (params, patternname) => {
  return _.get(params, `fsm.tiemout.ms`, _.get(params, `payload.conversationcontext.patterns.${patternname}.timeout.ms`));
}

/**
 * Sets the timeout of the current action to the context.
 * 
 * @param {*} params 
 * @param {*} patternname 
 */
const params$state$current$timeout$ms$set = (params, patternname, value) => {
  if (_.get(params, 'fsm')) {
    _.set(params, 'response.fsm.timeout.ms', value);
  } else {
    _.set(params, `payload.conversationcontext.patterns.${patternname}.timeout.ms`, value);
  }
}

/**
 * The action which should be called on a timeout.
 * 
 * @param {*} params 
 * @param {*} patternname 
 */
const params$state$current$timeout$goto = (params, patternname) => {
  return _.get(params, `fsm.timeout.goto`, _.get(params, `payload.conversationcontext.patterns.${patternname}.timeout.goto`));
}

/**
 * Saves a new timeout-goto-action to the context.
 * 
 * @param {*} params 
 * @param {*} patternname 
 * @param {*} value 
 */
const params$state$current$timeout$goto$set = (params, patternname, value) => {
  if (_.get(params, 'fsm')) {
    _.set(params, 'response.fsm.timeout.goto', value);
  } else {
    _.set(params, `payload.conversationcontext.patterns.${patternname}.timeout.goto`, value);
  }
}

/**
 * The data which should be called on a timeout.
 * 
 * @param {*} params 
 * @param {*} patternname 
 */
const params$state$current$timeout$using = (params, patternname) => {
  return _.get(params, `fsm.timeout.using`, _.get(params, `payload.conversationcontext.patterns.${patternname}.timeout.using`));
}

/**
 * Saves a new timeout-using-data to the context.
 * 
 * @param {*} params 
 * @param {*} patternname 
 * @param {*} value 
 */
const params$state$current$timeout$using$set = (params, patternname, value) => {
  if (_.get(params, 'fsm')) {
    _.set(params, 'response.fsm.timeout.using', value);
  } else {
    _.set(params, `payload.conversationcontext.patterns.${patternname}.timeout.using`, value);
  }
}

/**
 * The initial data when the FSM starts.
 * 
 * @param {*} params 
 * @param {*} patternname 
 */
const params$state$initial$data = (params, patternname) => {
  return _.get(params, `config.patterns.${patternname}.initial.data`, {});
}

/**
 * The name of the initial state when the FSM starts.
 * 
 * @param {*} params 
 * @param {*} patternname 
 */
const params$state$initial$name = (params, patternname) => {
  return _.get(params, `config.patterns.${patternname}.initial.state`)
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
 * Returns the defined transitions from the configuration
 * 
 * @param {*} params 
 * @param {*} patternname 
 */
const params$transitions = (params, patternname) => {
  return _.get(params, `config.patterns.${patternname}.transitions`, []);
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
const params$validate = (params) => {
  const patternname = params$patternname(params);

  const current_state = params$state$current$name(params, patternname);
  const initial_state = params$state$initial$name(params, patternname);
  const states = params$states(params, patternname);

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

/**
 * Handles the result of the state action, if a state change is required, the transformation context will be configured.
 * 
 * @param {*} params
 */
const state$call$handle_result = (params) => {
  const patternname = params$patternname(params);

  const action = _.get(params, 'context.call.action', {});
  const statusCode = _.get(params, 'context.call.result.statusCode', 503);
  const result = _.get(params, 'context.call.result', {});
  const unhandled = _.get(params, 'context.state.unhandled', false)

  const state = _.get(params, 'context.state.state', {});
  const data = _.get(params, 'context.state.data', {});


  if (statusCode === 503) {
    return Promise.reject({
      statusCode: 503,
      error: {
        message: `The state handler '${action.action}' did not respond with a valid response.`,
        parameters: {
          action: action,
          result: result
        }
      }
    });
  } else if ((statusCode < 200 || statusCode > 299) && unhandled) {
    return Promise.reject({
      statusCode: 503,
      error: {
        message: `Didn't handle current payload in state '${state.name}' and unhandled-handler did not handle either.`,
        parameters: {
          action: action,
          result: result
        }
      }
    });
  } else if (statusCode < 200 || statusCode > 299) {
    const action = params$unhandled(params, patternname);

    if (action) {
      _.set(params, 'context.call.action', action);
      _.set(params, 'context.state.unhandled', true);

      return Promise.resolve(params)
        .then(action$normalize)
        .then(action$call)
        .then(state$call$handle_result);
    } else {
      return Promise.reject({
        statusCode: 503,
        error: {
          message: `Didn't handle current payload in state '${state.name}' and no handler defined in 'config.patterns.${patternname}.unhandled'.`
        }
      });
    }
  } else {
    const state_goto = _.get(result, 'fsm.goto');
    const state_using = _.get(result, 'fsm.using', data);
    const state_timeout_ms = _.get(result, 'fsm.timeout.ms');
    const state_timeout_goto = _.get(result, 'fsm.timeout.goto');
    const state_timeout_using = _.get(result, 'fsm.timeout.using');
    const new_payload = _.get(result, 'payload');

    if (new_payload) {
      _.set(params, 'payload', new_payload);
    }

    params$state$current$name$set(params, patternname, state_goto || state.name);
    params$state$current$since$set(params, patternname, new Date());
    params$state$current$data$set(params, patternname, state_using);
    params$state$current$timeout$ms$set(params, patternname, state_timeout_ms);
    params$state$current$timeout$goto$set(params, patternname, state_timeout_goto);
    params$state$current$timeout$using$set(params, patternname, state_timeout_using);

    if (state_goto) {
      _.set(params, 'context.transition.from.state', _.assign({ name: state.name }, params$states(params, patternname)[state.name]));
      _.set(params, 'context.transition.from.data', state_using);
      _.set(params, 'context.transition.to.state', _.assign({ name: state_goto }, params$states(params, patternname)[state_goto]));
      _.set(params, 'context.transition.to.data', state_using);
    } else {
      _.set(params, 'context.transition', undefined);
    }

    return Promise.resolve(params);
  }
}

/**
 * Will call the action handler defined for the current state.
 * 
 * @param {*} params 
 */
const state$call = (params) => {
  const state = _.get(params, 'context.state.state', {});
  const data = _.get(params, 'context.state.data', {});

  _.set(params, 'context.call.action', state.handler);
  _.set(params, 'context.call.parameters', {
    fsm: {
      state: state.name,
      data: data
    }
  });

  return Promise.resolve(params)
    .then(action$normalize)
    .then(action$call);
}

/**
 * Initializes the current state. If a transition is required (initial, timeout) the information
 * for the transition will be put into the context.
 * 
 * @param {*} params 
 */
const state$init = (params) => {
  const patternname = params$patternname(params);
  const current_data = params$state$current$data(params, patternname);
  const current_state = params$state$current$name(params, patternname);
  const current_since = params$state$current$since(params, patternname);
  const current_timeout = params$state$current$timeout$ms(params, patternname);
  const now = new Date().getTime();

  let state;

  if (!current_state) {
    const state_name = params$state$initial$name(params, patternname);
    state = {
      state: _.assign({ name: state_name }, params$states(params, patternname)[state_name]),
      data: params$state$initial$data(params, patternname)
    }

    _.set(params, 'context.transition.from', undefined);
    _.set(params, 'context.transition.to', state);
    _.set(params, 'context.state', state);
  } else if (current_timeout && now - current_since - current_timeout > 0) {
    let goto_state_name = params$state$current$timeout$goto(params, patternname);
    let goto_data = params$state$current$timeout$using(params, patternname) || params$state$current$data;

    if (!goto_state_name) {
      goto_state_name = params$state$initial$name(params, patternname);
      goto_data = params$state$initial$data(params, patternname);
    }

    state = {
      state: _.assign({ name: goto_state_name }, params$states(params, patternname)[goto_state_name]),
      data: goto_data
    }

    _.set(params, 'context.transition.from', {
      state: _.assign({ name: current_state }, params$states(params, patternname)[current_state]),
      data: current_data
    });

    _.set(params, 'context.transition.to', state);
    _.set(params, 'context.state', state);
  } else {
    state = {
      state: _.assign({ name: current_state }, params$states(params, patternname)[current_state]),
      data: current_data
    }

    _.set(params, 'context.transition', undefined);
    _.set(params, 'context.state', state)
  }

  return Promise.resolve(params);
}

/**
 * Checks the result code of a transition and updates current payload if the transition returens a payload.
 * 
 * @param {*} params 
 */
const state$transition$handle_result = (params) => {
  const action = _.get(params, 'context.call.action', {});
  const statusCode = _.get(params, 'context.call.result.statusCode', 503);
  const result = _.get(params, 'context.call.result', {});

  if (statusCode >= 200 && statusCode < 300) {
    const payload = _.get(result, 'payload');
    if (payload) {
      _.set(params, 'payload', payload);
    }
  } else {
    return Promise.reject({
      error: {
        message: `The transition action '${action.action}' did not respond with a successful status code.`,
        parameters: {
          action: action,
          result: result
        }
      }
    })
  }

  return Promise.resolve(params);
}

/**
 * Checks and executes transition actions.
 * 
 * @param {*} params 
 */
const state$transition = (params) => {
  const transition = _.get(params, 'context.transition');

  if (transition) {
    const patternname = params$patternname(params);
    const transitions = params$transitions(params, patternname);

    const transition_from = _.get(transition, 'from.state.name');
    const transition_from_exit = _.get(transition, 'from.state.exit');
    const transition_from_data = _.get(transition, 'from.data', {});

    const transition_to = _.get(transition, 'to.state.name');
    const transition_to_enter = _.get(transition, 'to.state.enter');
    const transition_to_data = _.get(transition, 'to.data');
    const transition_from_to = _.find(transitions, { from: transition_from, to: transition_to });

    let call$transition_from = (params) => Promise.resolve(params);
    let call$transition_to = (params) => Promise.resolve(params);
    let call$transition = (params) => Promise.resolve(params);

    if (transition_from && _.isObject(transition_from_exit)) {
      call$transition_from = (params) => {
        _.set(params, 'context.call.action', transition_from_exit);
        _.set(params, 'context.call.parameters', {
          fsm: {
            transition: true,
            exit: true,
            data: transition_from_data
          }
        });

        return Promise.resolve(params)
          .then(action$normalize)
          .then(action$call)
          .then(state$transition$handle_result)
      }
    }

    if (transition_to && _.isObject(transition_to_enter)) {
      call$transition_to = (params) => {
        _.set(params, 'context.call.action', transition_to_enter);
        _.set(params, 'context.call.parameters', {
          fsm: {
            transition: true,
            enter: true,
            data: transition_to_data
          }
        });

        return Promise.resolve(params)
          .then(action$normalize)
          .then(action$call)
          .then(state$transition$handle_result);
      }
    }

    if (transition_from_to && _.isObject(transition_from_to)) {
      call$transition = (params) => {
        _.set(params, 'context.call.action', transition_from_to.handler);
        _.set(params, 'context.call.parameters', {
          fsm: {
            transition: true
          }
        });

        return Promise.resolve(params)
          .then(action$normalize)
          .then(action$call)
          .then(state$transition$handle_result);
      }
    }

    return Promise.resolve(params)
      .then(call$transition_from)
      .then(call$transition)
      .then(call$transition_to);
  } else {
    return Promise.resolve(params);
  }
}

exports.main = (params) => {
  return Promise.resolve(params)
    .then(params$validate)
    .then(state$init)
    .then(state$transition)
    .then(state$call)
    .then(state$call$handle_result)
    .then(state$transition)
    .then(finalize)
    .catch(error(params));
}
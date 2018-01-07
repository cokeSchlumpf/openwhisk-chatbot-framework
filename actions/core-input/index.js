const _ = require('lodash');
const openwhisk = require('openwhisk');
const routes = require('openwhisk-routes');
const uuid = require('uuid/v4');

/**
 * Validates the result of an input-connector.
 * 
 * @param {*} result 
 */
const connectors$call$result$validate = (connector) => (result = {}) => {
  if (!_.isNumber(result.statusCode)) {
    return Promise.reject({
      statusCode: 503,
      error: {
        message: `The input connector '${connector.action}' did not respons with a valid response. The statusCode is missing or not a number.`,
        parameters: {
          connector_response: result
        }
      }
    });
  }

  if (!_.isEqual(result.statusCode, 200) && !_.isEqual(result.statusCode, 204) && !_.isEqual(result.statusCode, 422)) {
    return Promise.reject({
      statusCode: 503,
      error: {
        message: `The input connector '${connector.action}' did not respons with a valid response. The statusCode ${result.statusCode} is not valid. Only 200, 204 and 422 are allowed.`,
        parameters: {
          connector_response: result
        }
      }
    });
  }

  if (_.isEqual(result.statusCode, 200) || _.isEqual(result.statusCode, 204)) {
    if (!_.isArray(result.input) && !_.isObject(result.input) && !_.isUndefined(result.input)) {
      return Promise.reject({
        statusCode: 503,
        error: {
          message: `The input connector '${connector.action}' did not respons with a valid response. The field 'input' is no array or object.`,
          parameters: {
            connector_response: result
          }
        }
      });
    }
  }

  if (_.isEqual(result.statusCode, 200)) {
    if (_.isArray(result.input)) {
      for (let i = 0; i < _.size(result.input); i++) {
        if (!_.isObject(result.input[i])) {
          return Promise.reject({
            statusCode: 503,
            error: {
              message: `The input connector '${connector.action}' did not respons with a valid response. 'input[${i}]' is not an object.`,
              parameters: {
                connector_response: result
              }
            }
          });
        }

        if (!_.isString(result.input[i].message)) {
          return Promise.reject({
            statusCode: 503,
            error: {
              message: `The input connector '${connector.action}' did not respons with a valid response. The field 'input[${i}].message' is wrong or missing in the response.`,
              parameters: {
                connector_response: result
              }
            }
          });
        }

        if (!_.isString(result.input[i].user)) {
          return Promise.reject({
            statusCode: 503,
            error: {
              message: `The input connector '${connector.action}' did not respons with a valid response. The field 'input[${i}].user' is wrong or missing in the response.`,
              parameters: {
                connector_response: result
              }
            }
          });
        }
      }
    }

    if (_.isArray(result.input) && _.size(result.input) > 1) {
      for (let i = 0; i < _.size(result.input); i++) {
        if (result.input[i].sync) {
          return Promise.reject({
            statusCode: 503,
            error: {
              message: `The input connector '${connector.action}' did not respons with a valid response. It's not allowed to send multiple inputs synchronuous.`,
              parameters: {
                connector_response: result
              }
            }
          });
        }
      }
    }
  }

  if ((_.isEqual(result.statusCode, 200) || _.isEqual(result.statusCode, 204)) && !_.get(result, 'input.sync') && !_.get(result, 'input[0].sync')
    && !_.isObject(result.response)) {

    return Promise.reject({
      statusCode: 504,
      error: {
        message: `The input connector '${connector.action}' did not respons with a valid response. No response object found.`,
        parameters: {
          connector_response: result
        }
      }
    });
  }

  if ((_.isEqual(result.statusCode, 200) || _.isEqual(result.statusCode, 204)) && !_.get(result, 'input.sync') && !_.get(result, 'input[0].sync')
    && !_.isNumber(result.response.statusCode)) {

    return Promise.reject({
      statusCode: 504,
      error: {
        message: `The input connector '${connector.action}' did not respons with a valid response. The field 'response.statusCode' is not a number.`,
        parameters: {
          request: request,
          connector_response: result
        }
      }
    });
  }

  return Promise.resolve(result);
}

/**
 * Initiates the recursive call of input-connectors. If one was found, its results are stored
 * in the context.
 * 
 * @param {*} request 
 */
const connectors$call = (request) => (params) => {
  return Promise.resolve(params)
    .then(connectors$call$recursive(request))
    .then(result => {
      _.set(params, 'context.connector.result', result);
      return params;
    });
}

/**
 * Recursively calls the configured input-connectors. 
 * 
 * Returns the result of the matched input-connector or rejects if none was found.
 * 
 * @param {*} request 
 * @param {*} connector_index 
 */
const connectors$call$recursive = (request, connector_index = 0) => (params) => {
  const connectors = _.get(params, 'config.connectors.input', []);

  if (connector_index >= _.size(connectors)) {
    return Promise.reject({
      statusCode: 404,
      error: {
        message: 'There was no input connector found to handle this request.'
      }
    });
  } else {
    const ow = openwhisk();
    const connector = connectors[connector_index];

    let action_name = connector.action;
    if (action_name.indexOf("/") < 0) {
      const ow_package = _
        .chain(params)
        .get('config.openwhisk.package', _.get(process, 'env.__OW_ACTION_NAME', '/././.'))
        .split('/')
        .nth(-2)
        .value();
      action_name = `${ow_package}/${action_name}`
    }

    const invokeParams = {
      name: action_name,
      blocking: true,
      result: true,
      params: _.assign({}, { request }, connector.parameters || {})
    };

    _.set(params, 'context.connector', connector);

    return ow.actions.invoke(invokeParams)
      .then(connectors$call$result$validate(connector))
      .then(result => result.statusCode === 422 ? connectors$call$recursive(request, connector_index + 1)(params) : result);
  }
}

/**
 * General error handler which forwards generates necessary error information,
 * if not already present.
 * 
 * @param {*} request 
 * @param {*} response 
 */
const error = (request, response) => (error = {}) => {
  if (error instanceof Error) {
    console.error(error);
  }

  _.set(error, 'statusCode', _.get(error, 'statusCode', '500'));
  _.set(error, 'error.message', _.get(error, 'error.message', 'internal error during action execution'));
  _.set(error, 'error.params.request', request);

  response.status(error.statusCode).send(error.error);
}

/**
 * Checks whether multiple input were received, if not it creates
 * a single-element list for further processing.
 */
const input$create_list = () => (params) => {
  const input = _.get(params, 'context.connector.result.input');

  if (!_.isArray(input) && !_.isUndefined(input)) {
    _.set(params, 'context.connector.result.input', [input]);
  } else if (_.isUndefined(input)) {
    _.set(params, 'context.connector.result.input', []);
  }

  return Promise.resolve(params);
}

/**
 * Creates the initial payload and stores it in the context.
 * 
 * @param {*} params 
 */
const input$create_payload = () => (params) => {
  const inputs = _.get(params, 'context.connector.result.input', []);
  const payloads = [];
  const now = new Date();

  _.each(inputs, input => {
    const payload = {
      id: uuid(),
      input: {
        channel: _.get(params, 'context.connector.channel'),
        user: input.user,
        sync: input.sync || false,
        message: input.message,
        received: [now.getFullYear(), now.getMonth() + 1, now.getDate(), now.getHours(), now.getMinutes(), now.getSeconds()],
        received_timestamp: now.getTime()
      }
    }

    if (input.context) {
      _.set(payload, 'context.connector', input.context);
    }

    payloads.push(payload);
  });

  _.set(params, 'context.payloads', payloads);

  return Promise.resolve(params);
}

/**
 * Invokes the frameworks middleware-processing pipeline.
 */
const pipeline$invoke = (sync = false) => (params) => {
  const ow = openwhisk();
  const ow_package = _
    .chain(params)
    .get('config.openwhisk.package', _.get(process, 'env.__OW_ACTION_NAME', '/././.'))
    .split('/')
    .nth(-2)
    .value();
  const payloads = _.get(params, 'context.payloads', []);

  const activations = _.map(payloads, payload => {
    const invokeParams = {
      name: `${ow_package}/core-middleware`,
      blocking: sync,
      result: sync,
      params: { payload }
    }

    return ow.actions.invoke(invokeParams);
  });

  return Promise.all(activations)
    .then(result => {
      _.set(params, 'context.result', result);
      return Promise.resolve(params);
    })
    .catch(error => Promise.reject({
      statusCode: 503,
      error: {
        message: 'Error during initialization of core-middleware.',
        params: {
          error
        }
      }
    }));
}

const response$create = (response) => (params) => {
  const body = _.get(params, 'context.connector.result.response.body');
  const statusCode = _.get(params, 'context.connector.result.response.statusCode', 200);

  if (body) {
    response.status(statusCode).send(body);
  } else {
    response.sendStatus(statusCode);
  }

  return Promise.resolve(params);
}

const response$create$sync = (response) => (params) => {
  const http_response = _.get(params, 'context.result[0].payload.response', {});

  response.status(_.get(http_response, 'statusCode', 200)).send(_.get(http_response, 'body', {}));
  return Promise.resolve(params);
}

const request$process = (params, request, response) => {
  return Promise.resolve(params)
    .then(connectors$call(request))
    .then(input$create_list())
    .then(input$create_payload())
    .then(params => {
      const payloads = _.get(params, 'context.payloads', []);

      if (_.size(payloads) === 1 && payloads[0].input.sync) {
        // Synchronuous pipeline
        return Promise.resolve(params)
          .then(pipeline$invoke(true))
          .then(response$create$sync(response))
      } else {
        return Promise.resolve(params)
          .then(pipeline$invoke(false))
          .then(response$create(response))
      }
    })
    .catch(error(request, response));
}

exports.main = routes(action => {
  action.all('/', (req, res) => {
    const request = _.pick(req, 'body', 'url', 'headers', 'method', 'query');
    const params = _.get(req, 'wsk', {});

    request$process(params, request, res);
  });
}, {
    ignoreProperties: [
      'config'
    ]
  });
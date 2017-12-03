const _ = require('lodash');
const openwhisk = require('openwhisk');

const error = (params) => (error = {}) => {
  if (error instanceof Error) {
    console.error(error);
  }

  _.set(error, 'statusCode', _.get(error, 'statusCode', '500'));
  _.set(error, 'error.message', _.get(error, 'error.message', 'internal error during action execution'));
  _.set(error, 'error.params.input', params);

  return Promise.reject(error);
}

const finalize = ({ payload, context }) => {
  return Promise.resolve({
    statusCode: context.statusCode,
    payload: payload,
    processed: context.processed
  });
}

const middleware$callasync = (middleware = {}) => (params = {}) => {
  const ow = openwhisk();

  const invokeParams = {
    name: middleware.action,
    blocking: false,
    params: _.assign({ payload: params.payload }, _.get(middleware, 'parameters', {}))
  }

  return ow.actions.invoke(invokeParams)
    .then(() => {
      params.context.processed.push({
        action: middleware.action,
        async: true,
        skipped: false,
        statusCode: 200
      });

      return Promise.resolve(params);
    })
    .catch((error = {}) => {
      if (error instanceof Error) {
        console.error(error);
      }

      const middleware_error = {
        statusCode: 503,
        error: {
          message: `error calling asynchronuous middleware '${middleware.action}'`,
          params: {
            cause: error,
            middleware: middleware
          }
        }
      };

      params.context.processed.push({
        action: middleware.action,
        async: true,
        error: middleware_error,
        skipped: false,
        statusCode: error.statusCode || 503
      });

      return Promise.reject(middleware_error);
    });
}

const middleware$callsync = (middleware = {}) => (params = {}) => {
  const ow = openwhisk();

  const invokeParams = {
    name: middleware.action,
    blocking: true,
    result: true,
    params: _.assign({ payload: params.payload }, _.get(middleware, 'parameters', {}))
  }

  return ow.actions.invoke(invokeParams)
    .then((result = {}) => {
      if (!_.isEqual(result.statusCode, 200) && !_.isEqual(result.statusCode, 204)) return Promise.reject(result);

      params.context.processed.push({
        action: middleware.action,
        async: false,
        skipped: false,
        statusCode: result.statusCode
      });

      _.set(params, 'payload', _.get(result, 'payload', {}));

      return Promise.resolve(params);
    })
    .catch((error = {}) => {
      if (error instanceof Error) {
        console.error(error);
      }

      const middleware_error = {
        statusCode: 503,
        error: {
          message: `error calling middleware '${middleware.action}'`,
          params: {
            cause: error,
            middleware: middleware
          }
        }
      };

      params.context.processed.push({
        action: middleware.action,
        async: false,
        error: middleware_error,
        skipped: false,
        statusCode: error.statusCode || 503
      });

      if (error.payload) {
        _.set(params, 'payload', _.get(error, 'payload', {}));
      }

      return Promise.reject(middleware_error);
    });
}

const middleware$call = (params = {}, middleware = {}) => {
  const async = _.get(middleware, 'async', false);
  
  return Promise.resolve(params)
    .then(async ? middleware$callasync(middleware) : middleware$callsync(middleware));
}

const middleware$process = (params) => {
  _.set(params, 'context.processed', []);
  _.set(params, 'context.statusCode', 200);

  return middleware$process$recursive(params);
}

const middleware$process$recursive = (params, middleware_index = 0, accumulator = 'SUCCESS') => {
  const middlewares = _.get(params, 'middleware', _.get(params, 'config.middleware', []));

  if (middleware_index >= _.size(middlewares)) {
    return Promise.resolve(params);
  } else {
    const middleware = middlewares[middleware_index];
    const continue_on_error = _.get(middleware, 'properties.continue_on_error', false);
    const final = _.get(middleware, 'properties.final', false);

    let promise;

    switch (accumulator) {
      case 'SUCCESS':
      case 'FAILED_CONTINUE':
        promise = middleware$call(params, middleware);
        break;
      case 'FAILED':
        if (final) {
          promise = middleware$call(params, middleware);
        } else {
          params.context.processed.push({
            action: middleware.action,
            skipped: true
          });
          
          promise = Promise.resolve(params);
        }
        break;
    }

    return promise
      .then(params => {
        return middleware$process$recursive(params, middleware_index + 1, accumulator);
      })
      .catch(error => {     
        const next_params = error.params || params;

        _.set(next_params, 'context.statusCode', 202);

        switch (accumulator) {
          case 'SUCCESS':
          case 'FAILED_CONTINUE':
            if (continue_on_error) {
              return Promise.resolve(middleware$process$recursive(next_params, middleware_index + 1, 'FAILED_CONTINUE'));
            } else {
              return Promise.resolve(middleware$process$recursive(next_params, middleware_index + 1, 'FAILED'));
            }
          case 'FAILED':
            return Promise.resolve(middleware$process$recursive(next_params, middleware_index + 1, accumulator));
        }
      });
  }
}

exports.main = (params) => {
  return Promise.resolve(params)
    .then(middleware$process)
    .then(finalize)
    .catch(error(params));
}
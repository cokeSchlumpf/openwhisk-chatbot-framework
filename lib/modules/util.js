const _ = require('lodash');

const defaultErrorHandler = (error) => {
  if (_.get(error, 'error.message')) {
    return Promise.resolve({
      statusCode: _.get(error, 'statusCode', 500),
      error
    });
  } else {
    return Promise.resolve({
      statusCode: 500,
      error: {
        message: 'Internal Server Error',
        cause: error
      }
    })
  }
}

const validate = (validator, f) => {
  const errors = validator.run();

  if (_.size(errors) > 0) {
    return Promise.reject({
      statusCode: 400,
      error: {
        message: 'Action parameters are invalid',
        cause: errors
      }
    });
  } else if (_.isFunction(f)) {
    return Promise.resolve(f());
  } else {
    return Promise.resolve();
  }
}

module.exports = (params, ow) => {
  return {
    defaultErrorHandler,
    validate 
  }
};
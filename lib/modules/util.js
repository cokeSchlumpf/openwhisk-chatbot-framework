const _ = require('lodash');

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
  } else {
    return Promise.resolve(f());
  }
}

module.exports = (params, ow) => {
  return {
    validate 
  }
};
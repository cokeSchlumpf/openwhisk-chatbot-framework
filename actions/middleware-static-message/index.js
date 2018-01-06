const _ = require('lodash');

exports.main = (params) => {
  _.set(params, 'payload.context.output.messages', _.get(params, 'message', "No message defined."))

  return Promise.resolve({
    statusCode: 200,
    payload: params.payload
  });
}
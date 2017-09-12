const _ = require('lodash');

exports.main = (params) => {
  const body = _.get(params, 'request.body', {})
  console.log(body);

  if (body['hub.mode'] === 'subscribe') {
    return {
      statusCode: 204,
      response: {
        statusCode: 200,
        body: body['hub.challenge']
      }
    }
  } else {
    return {
      statusCode: 422
    }
  }
};
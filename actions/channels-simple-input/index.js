const _ = require('lodash');

exports.main = (params = {}) => {  
  if (!_.isUndefined(_.get(params, 'request.body.message'))) {
    return {
      statusCode: 200,
      input: {
        context: {
          message_id: 'foo'
        },
        user: _.get(params, 'request.body.user') || '42',
        message: _.get(params, 'request.body.message')
      },
      response: {
        statusCode: 200,
        body: {
          "ok": true
        }
      }
    };
  } else {
    return {
      statusCode: 422,
      body: {
        message_id: 'foo'
      }
    };
  }
};
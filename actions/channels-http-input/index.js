const _ = require('lodash');

exports.main = (params = {}) => {  
  if (!_.isUndefined(_.get(params, 'request.body.message'))) {
    return {
      statusCode: 200,
      input: {
        user: _.get(params, 'request.body.user', 'anonymous'),
        message: _.get(params, 'request.body.message'),
        context: _.get(params, 'request.body.context'),
        conversationcontext: _.get(params, 'request.body.conversationcontext'),
        sync: true
      }
    };
  } else {
    return {
      statusCode: 422
    };
  }
};
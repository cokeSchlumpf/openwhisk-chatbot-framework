const _ = require('lodash');

exports.main = ({ message, payload = {}, response = {} }) => {
  return Promise.resolve({
    statusCode: 200,
    response: {
      statusCode: 200,
      body: {
        messages: _.concat(_.get(response, 'body.messages', []), message),
        conversationcontext: payload.conversationcontext,
        context: payload.context
      }
    }
  });
}
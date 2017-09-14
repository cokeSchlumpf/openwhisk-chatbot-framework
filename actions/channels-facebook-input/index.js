const _ = require('lodash');

exports.main = (params) => {
  const body = _.get(params, 'request.body', {})

  if (body['hub.mode'] === 'subscribe' && body['hub.verify_token'] === _.get(params, 'config.facebook.verify_token')) {
    return {
      statusCode: 204,
      response: {
        statusCode: 200,
        body: body['hub.challenge']
      }
    }
  } else if (body['object'] === 'page') {
    const input = _
      .chain(body['entry'])
      .map(entry => {
        return _
          .map(entry.messaging, event => {
            if (event.message) {
              return {
                user: event.sender.id,
                message: event.message.text
              };
            }
          })
          .filter(message => !_.isUndefined(message));
      })
      .flattenDeep()
      .value();

    return {
      statusCode: 200,
      input,
      response: {
        statusCode: 200
      }
    }
  } else {
    return {
      statusCode: 422
    }
  }
};
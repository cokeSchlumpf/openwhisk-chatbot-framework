const _ = require('lodash');

exports.main = (params) => {
  const body = _.get(params, 'request.body', {})
  console.log(_.keys(body));

  if (body['hub.mode'] === 'subscribe' && body['hub.verify_token'] === _.get(params, 'config.facebook.verify_token')) {
    return {
      statusCode: 204,
      response: {
        statusCode: 200,
        body: body['hub.challenge']
      }
    }
  } else if (body['object'] === 'page') {
    const message = _
      .chain(body['entry'])
      .reduce((messages, entry) => {
        return _.reduce(entry.messaging, (messages, event) => {
          if (event.message) {
            return _.concat(messages, event.message);
          } else {
            return messages;
          }
        }, messages);
      }, [])
      .join("\n\n")
      .value();

    _.set(params, 'payload.input.message', message);

    return {
      statusCode: 200,
      payload: params.payload,
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
const _ = require('lodash');
const rp = require('request-promise');

exports.main = (params) => {
  const access_token = _.get(params, 'config.facebook.access_token');
  const message = _.get(params, 'message');
  const user = _.get(params, 'user');

  const sendCmd = (cmd) => {
    const options = {
      uri: `https://graph.facebook.com/v2.6/me/messages`,
      qs: {
        access_token: access_token
      },
      headers: {
        'User-Agent': 'Request-Promise'
      },
      method: 'POST',
      json: {
        recipient: {
          id: user
        },
        "sender_action": cmd     
      }
    };

    return rp(options).then(response => {
      return {
        statusCode: 200
      };
    }).catch(error => {
      return {
        statusCode: 400,
        error: {
          message: 'Unable to send action to Facebook.',
          parameters: {
            error,
            message,
            options
          }
        }
      };
    });
  }

  const sendTextMessage = (msg) => {
    const options = {
      uri: `https://graph.facebook.com/v2.6/me/messages`,
      qs: {
        access_token: access_token
      },
      headers: {
        'User-Agent': 'Request-Promise'
      },
      method: 'POST',
      json: {
        recipient: {
          id: user
        },
        message: {
          text: msg
        }
      }
    };

    return rp(options).then(response => {
      console.log(`Successfully sent generic message with id ${response.message_id} to recipient ${response.recipient_id}`);
      return {
        statusCode: 200
      };
    }).catch(error => {
      console.error("Unable to send message.");
      console.error(error);
      
      return {
        statusCode: 400,
        error: {
          message: 'Unable to send message to Facebook.',
          parameters: {
            error,
            message,
            options
          }
        }
      };
    });
  }

  if (_.isString(message)) {
    return sendTextMessage(message);
  } else if (_.isObject(message)) {
    return sendCmd(_.keys(message)[0]);
  } else {
    return Promise.reject({
      statusCode: 400,
      error: {
        message: 'The message is not given in a valid format.',
        parameters: {
          message
        }
      }
    });
  }
}
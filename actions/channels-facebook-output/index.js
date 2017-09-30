const _ = require('lodash');
const botpack = require('serverless-botpack-lib');
const rp = require('request-promise');

exports.main = (params) => {
  const bot = botpack(params);
  const message = _.get(params, 'message', _.get(params, 'payload.output.message'));

  const sendCmd = (cmd) => {
    const options = {
      uri: `https://graph.facebook.com/v2.6/me/messages`,
      qs: {
        access_token: _.get(params, 'config.facebook.access_token')
      },
      headers: {
        'User-Agent': 'Request-Promise'
      },
      method: 'POST',
      json: {
        recipient: {
          id: _.get(params, 'payload.output.user')
        },
        "sender_action": cmd     
      }
    };

    return rp(options).then(response => {
      return {
        statusCode: 200
      };
    }).catch(error => {
      bot.log.error("Unable to send action.");
      bot.log.error(error);
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
        access_token: _.get(params, 'config.facebook.access_token')
      },
      headers: {
        'User-Agent': 'Request-Promise'
      },
      method: 'POST',
      json: {
        recipient: {
          id: _.get(params, 'payload.output.user')
        },
        message: {
          text: msg
        }
      }
    };

    return rp(options).then(response => {
      bot.log.info(`Successfully sent generic message with id ${response.message_id} to recipient ${response.recipient_id}`);
      return {
        statusCode: 200
      };
    }).catch(error => {
      bot.log.error("Unable to send message.");
      bot.log.error(error);
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
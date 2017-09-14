const _ = require('lodash');
const botpack = require('serverless-botpack-lib');
const request = require('request');

exports.main = (params) => {
  const bot = botpack(params);

  bot.log.info(_.get(params, 'payload.output.message', 'No message found.'));

  return new Promise((resolve, reject) => {
    request({
      uri: 'https://graph.facebook.com/v2.6/me/messages',
      qs: { access_token: params.config.facebook.access_token },
      method: 'POST',
      json: {
        recipient: {
          id: _.get(params, 'payload.output.user')
        },
        message: {
          text: _.get(params, 'payload.output.message')
        }
      }

    }, function (error, response, body) {
      if (!error && response.statusCode == 200) {
        var recipientId = body.recipient_id;
        var messageId = body.message_id;
        bot.log.info(`Successfully sent generic message with id ${messageId} to recipient ${recipientId}`);
        resolve({
          statusCode: 200
        });
      } else {
        bot.log.error("Unable to send message.");
        bot.log.error(response);
        bot.log.error(error);
        resolve({
          statusCode: 400
        });
      }
    });
  });
}
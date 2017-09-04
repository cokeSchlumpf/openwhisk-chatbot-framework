const _ = require('lodash');
const wskbotfwk = require('openwhisk-chatbot-framework');
const Validator = require('better-validator');

const LEVELS = ['DEBUG', 'INFO', 'WARN', 'ERROR'];

exports.main = (params) => {
  const bot = wskbotfwk(params);

  const validator = new Validator();
  validator(params).required().isObject(obj => {
    obj('message').required.isString();
    obj('level').required.isString();
    obj('config').required().isObject(obj => {
      obj('logger').required().isObject(obj => {
        obj('level').required.isString();
      });
    });
  });

  return bot.util.validate(validator, () => {
    const message = params.message;
    const messagelevel = params.level;

    if (_.indexOf(LEVELS, params.level) >= _.indexOf(LEVELS, params.config.level)) {
      return bot.db
        .create({
          type: 'log',
          user: _.get(params, 'payload.conversationcontext.user.id'),
          payload: _.get(params, 'payload.id'),
          level: params.level,
          message: params.message
        })
        .then(result => ({
          statusCode: 200,
          message: `Message inserted into log.`
        }));
    } else {
      return Promise.resolve({
        statusCode: 200,
        message: `Message log level '${params.level}' below configured log level '${params.config.logger.level}'.`
      });
    }
  });
};
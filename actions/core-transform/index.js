const _ = require('lodash');
const botpack = require('serverless-botpack-lib');
const Mustache = require('mustache');
const openwhisk = require('openwhisk');
const Validator = require('better-validator');

exports.main = (params) => {
  const bot = botpack(params);

  const getMessages = () => {
    const validator = new Validator();
    return bot.config.get('messages', {}).then(messages => {
      if (_.get(messages, '$action')) {
        const action = messages['$action'];
        const ow = openwhisk();

        const invokeParams = {
          name: action,
          blocking: true,
          result: true,
          params: {}
        };

        return ow.actions.invoke(invokeParams)
          .then(messages => {
            validator(messages).required().isObject();

            return bot.util //
              .validate(validator, 'Messages are not valid.') //
              .then(() => messages);
          })
          .catch(error => {
            return Promise.reject({
              statusCode: 500,
              error: {
                message: `Unable to retrieve messages via action '${action}'.`,
                parameters: {
                  error,
                  action,
                  messages
                }
              }
            })
          });
      } else {
        validator(messages).required().isObject();

        return bot.util //
          .validate(validator, 'Messages are not valid.') //
          .then(() => messages);
      }
    });
  }

  const getMessage = (message) => {
    // In the future message might also be a complex object
    if (_.isArray(message)) {
      return getMessage(_.sample(message));
    } else {
      return message;
    }
  }

  const getTemplate = (messages) => {
    const channel = _.get(params, 'payload.output.channel', 'NONE');
    const intent = _.get(params, 'payload.output.intent');
    const locale = _.get(params, 'payload.conversationcontext.user.locale', 'NONE');

    return getMessage(_.get(messages, `${intent}.${locale}.${channel}.text`)
      || _.get(messages, `${intent}.${channel}.${locale}.text`)
      || _.get(messages, `${intent}.${channel}.text`)
      || _.get(messages, `${intent}.${locale}.text`)
      || _.get(messages, `${intent}.text`)
      || intent);
  }

  const renderMessage = (template) => {
    if (_.isObject(template)) {
      const seq = _.get(template, 'seq', []);
      return _.map(seq, item => {
        if (_.isString(item) || _.isArray(item)) {
          return Mustache.render(getMessage(item), _.get(params, 'payload'));
        } else {
          return item;
        }
      });
    } else {
      return Mustache.render(template, _.get(params, 'payload'));
    }
  }

  return bot.util.validatePayload(params.payload, 'OUTPUT')
    .then(getMessages)
    .then(getTemplate)
    .then(renderMessage)
    .then(message => ({
      statusCode: 200,
      result: _.assign({}, params.payload, {
        output: _.assign({}, params.payload.output, {
          message: message
        })
      })
    }))
    .catch(bot.util.defaultErrorHandler);
}
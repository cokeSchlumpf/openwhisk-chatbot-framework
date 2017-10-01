const _ = require('lodash');
const Promise = require('bluebird');
const botpack = require('serverless-botpack-lib');
const dateformat = require('dateformat');
const WatsonConversation = require('watson-developer-cloud/conversation/v1');

exports.main = (params) => {
  const bot = botpack(params);
  const contextpath = _.get(params, 'contextpath', 'wcs');

  const conversation = Promise.promisifyAll(new WatsonConversation({
    username: _.get(params, 'username', _.get(params, 'config.conversation.username')),
    password: _.get(params, 'password', _.get(params, 'config.conversation.password')),
    path: {
      workspace_id: _.get(params, 'workspace', _.get(params, 'config.conversation.workspace'))
    },
    version_date: WatsonConversation.VERSION_DATE_2017_04_21
  }));

  const now = new Date();

  return conversation.messageAsync({
    input: {
      text: _.get(params, 'message', _.get(params, 'payload.input.message'))
    },
    context: _.assign(
      {},
      _.get(params, `payload.conversationcontext.${contextpath}`, {}),
      {
        timezone: 'CET',
        botkit: {
          input: _.get(params, 'payload.input'),
          conversationcontext: _.omit(_.get(params, 'payload.conversationcontext', contextpath)),
          vars: {
            now: dateformat(now, 'yyyy-MM-dd HH:mm:ss'),
            date: dateformat(now, 'yyyy-MM-dd'),
            time: dateformat(now, 'HH:mm:ss'),
            weekday: now.getDay()
          }
        }
      })
  }).then(conversationresponse => {
    _.set(params, `payload.conversationcontext.${contextpath}`, _.omit(_.get(conversationresponse, 'context', {}), 'botkit'));
    _.set(params, `payload.context.${contextpath}`, _.omit(conversationresponse, 'context'));
    _.set(params, 'payload.context.message', _.get(conversationresponse, 'output.text[0]'));

    return {
      statusCode: 200,
      payload: params.payload
    }
  });
}
const _ = require('lodash');
const botpack = require('serverless-botpack-lib');
const WatsonConversation = require('watson-developer-cloud/conversation/v1');

exports.main = (params) => {
  const bot = botpack(params);

  const conversation = Promise.promisifyAll(new WatsonConversation({
    username: _.get(params, 'config.conversation.username', 'no username'),
    password: _.get(params, 'config.conversation.password', 'no password'),
    path: {
      workspace_id: _.get(params, 'config.conversation.workspace', 'no workspace')
    },
    version_date: WatsonConversation.VERSION_DATE_2017_04_21
  }));

  return conversation.messageAsync({
    input: { 
      text: _.get(params, 'payload.input.message') 
    },
    context: _.get(params, 'payload.user.watsoncontext', {})
  }).then(conversationresponse => {
    _.set(params, 'payload.user.watsoncontext', _.get(conversationresponse, 'context', {}));
    _.set(params, 'payload.context.watsontext', _.join(_.get(conversationresponse, 'output.text', []), ' '));

    bot.log.debug(conversationresponse);

    return {
      statusCode: 200,
      payload: params.payload
    }
  });
}
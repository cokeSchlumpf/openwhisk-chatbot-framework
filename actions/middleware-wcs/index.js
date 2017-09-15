const _ = require('lodash');
const Promise = require('bluebird');
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
    context: _.get(params, 'payload.conversationcontext.watsoncontext', {})
  }).then(conversationresponse => {
    _.set(params, 'payload.conversationcontext.wcs', _.get(conversationresponse, 'context', {}));
    _.set(params, 'payload.context.wcs', _.get(conversationresponse, 'output', {}));

    return {
      statusCode: 200,
      payload: params.payload
    }
  });
}
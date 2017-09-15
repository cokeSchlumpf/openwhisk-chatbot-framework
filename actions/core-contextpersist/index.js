const _ = require('lodash');
const botpack = require('serverless-botpack-lib');

exports.main = (params) => {
  const bot = botpack(params);

  const persistPayload = (payload) => {
    const persistedPayload = _.assign(
      _.pick(payload, 'input', 'output', 'context', 'id', '_id', '_rev'),
      {
        type: 'payload',
        user: _.get(payload, 'conversationcontext.user._id')
      });

    return bot.db.update(persistedPayload)
      .then(persistedPayload => {
        _.set(payload, '_id', persistedPayload._id);
        _.set(payload, '_rev', persistedPayload._rev);

        return Promise.resolve(payload);
      });
  }

  const persistConversationcontext = (payload) => {
    const conversationcontext = _.get(payload, 'conversationcontext');

    const user = _.get(conversationcontext, 'user');
    const persistedConversationcontext = _.assign(
      _.omit(conversationcontext, 'user'),
      {
        type: 'conversationcontext',
        user: _.get(payload, 'conversationcontext.user._id')
      });

    return bot.db.update(persistedConversationcontext)
      .then(persistedConversationcontext => {
        _.set(payload, 'conversationcontext._id', persistedConversationcontext._id);
        _.set(payload, 'conversationcontext._rev', persistedConversationcontext._rev);

        return Promise.resolve(payload);
      });
  }

  const persistUser = (payload) => {
    const user = _.assign({}, _.get(payload, 'conversationcontext.user', {}), { type: 'user' });
    return bot.db.update(user).then(persistedUser => {
      _.set(payload, 'conversationcontext.user', persistedUser);
      return Promise.resolve(payload);
    });
  }

  return bot.util.validatePayload(params.payload, 'STORE')
    .then(payload => {
      if (!payload._id || params.force) {
        return persistPayload(payload)
          .then(persistConversationcontext)
          .then(persistUser);
      } else {
        return Promise.resolve(payload);
      }
    })
    .then(payload => ({
      statusCode: 200,
      result: payload
    }))
    .catch(bot.util.defaultErrorHandler);
}
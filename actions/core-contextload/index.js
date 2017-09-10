const _ = require('lodash');
const botpack = require('serverless-botpack-lib');

exports.main = (params) => {
  const bot = botpack(params);

  const loadUser = () => {
    const user = _.assign(_.get(params, 'user', {}), { type: 'user' });
    const selector = _.pickBy(user, (value, key) => {
      return key === 'type' || key.indexOf('_id') >= 0;
    });

    return bot.db
      .read(selector)
      .then(results => results[0] || bot.db.create(user))
      .then(dbuser => {
        _.set(params, 'payload.conversationcontext.user', _.assign({}, user, dbuser));
        return params.payload;
      });
  }

  const loadContext = (payload) => {
    const selector = {
      type: 'conversationcontext',
      user: _.get(payload, 'conversationcontext.user._id')
    }

    return bot.db.read(selector)
      .then(results => results[0] || {})
      .then(conversationcontext => {
        _.set(params, 'payload.conversationcontext', _.assign(conversationcontext, {
          user: _.get(payload, 'conversationcontext.user')
        }));

        return params.payload;
      });
  }

  return loadUser()
    .then(payload => bot.util.validatePayload(payload, 'STORE'))
    .then(loadContext)
    .then(payload => ({
      statusCode: 200,
      result: payload
    }))
    .catch(bot.util.defaultErrorHandler);
}
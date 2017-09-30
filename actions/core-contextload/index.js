const _ = require('lodash');
const botpack = require('serverless-botpack-lib');
const openwhisk = require('openwhisk');

exports.main = (params) => {
  const bot = botpack(params);
  const ow = openwhisk();

  const newUserHandler = (newuser) => {
    const handler = _.find(
      _.get(params, 'config.connectors.newuser', []),
      { channel: _.get(params, 'payload.input.channel') });

    if (handler) {
      const invokeParams = {
        name: handler.action,
        blocking: true,
        result: true,
        params: _.assign({}, { user: newuser, payload: params.payload }, handler.parameters || {})
      };

      return ow.actions.invoke(invokeParams)
        .then(result => {
          const user = _.get(result, 'user');
          const statusCode = _.get(result, 'statusCode');

          if (_.isObject(user) && statusCode === 200) {
            return bot.db.update(_.assign({}, user, newuser));
          } else {
            return Promise.reject({
              statusCode: 503,
              error: {
                message: `The new-user handler '${handler.action}' returned non valid status code or a non valid user.`,
                parameters: {
                  statusCode,
                  user
                }
              }
            });
          }
        });
    } else {
      return Promise.resolve(newuser);
    }
  }

  const loadUser = () => {
    const user = _.assign(_.get(params, 'user', {}), { type: 'user' });
    const selector = _.pickBy(user, (value, key) => {
      return key === 'type' || key.indexOf('_id') >= 0;
    });

    return bot.db
      .read(selector)
      .then(results => results[0] || bot.db.create(user).then(newUserHandler))
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
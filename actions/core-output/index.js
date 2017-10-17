const _ = require('lodash');
const botpack = require('serverless-botpack-lib');
const ms = require('ms');
const openwhisk = require('openwhisk');
const uuid = require('uuid/v4');

exports.main = (params) => {
  const bot = botpack(params);
  const ow = openwhisk();

  const archiveOutput = (payload) => {
    const newPayload = _.cloneDeep(payload);

    _.set(newPayload, 'output.sent', _
      .chain(newPayload)
      .get('output.sent', [])
      .concat(_.omit(newPayload.output, 'sent'))
      .value());

    _.set(newPayload, 'output', _.pick(newPayload.output, 'sent'));

    return Promise.resolve(newPayload);
  }

  const enrichParams = () => {
    // Generate payload id if not existing
    if (!_.get(params, 'payload.id')) {
      _.set(params, 'payload.id', uuid());
    }

    // Prepare payload.output
    _.set(params, 'payload.output.timestamp', Date.now() / 1000 | 0)

    _.set(params, 'payload.output.channel',
      _.get(params, 'payload.output.channel') ||
      _.get(params, 'channel') ||
      _.get(params, 'payload.input.channel'));

    _.set(params, 'payload.output.user',
      _.get(params, 'payload.output.user') ||
      _.get(params, 'user') ||
      _.get(params, `payload.conversationcontext.user.${params.payload.output.channel}_id`));

    _.set(params, 'payload.output.intent',
      _.get(params, 'payload.output.intent') ||
      _.get(params, 'intent'));

    _.set(params, 'payload.output.locale',
      _.get(params, 'payload.output.locale') ||
      _.get(params, 'locale') ||
      _.get(params, 'payload.conversationcontext.user.locale'));

    _.set(params, 'payload.output.context',
      _.get(params, 'payload.output.context') ||
      _.get(params, 'context'));

    return Promise.resolve(params);
  }

  const generateMessage = (payload) => {
    const transformer = _.get(params, 'config.messages_transformer', `${_.get(params.config, 'openwhisk.package')}/core-transform`)
    const invokeParams = {
      name: transformer,
      blocking: true,
      result: true,
      params: { payload }
    }

    return ow.actions.invoke(invokeParams)
      .then(result => {
        if (result.statusCode !== 200) {
          return Promise.reject({
            statusCode: 503,
            error: {
              message: `The transformer '${transformer}' did not respond with a valid result.`,
              parameters: {
                result
              }
            }
          })
        } else {
          _.set(payload, 'output.message', _.get(result, 'result.output.message'));
          return payload;
        }
      });
  }

  const callOutputConnector = (payload) => {
    const connector = _
      .chain(params.config.connectors.output)
      .filter({ channel: payload.output.channel })
      .first()
      .value();

    if (connector) {
      const call = (messages) => {
        const message = _.head(messages);
        const remaining = _.tail(messages);

        if (_.isObject(message) && message.wait) {
          const milliseconds = ms(message.wait);

          if (milliseconds > 30000) {
            return Promise.reject({
              statusCode: 500,
              error: {
                message: 'The wait timeout is longer than 30s, this is not allowed',
                parameters: {
                  wait: milliseconds,
                  wait_text: message.wait
                }
              }
            })
          } else {
            if (message.typing) {
              return call(_.concat(
                [
                  { typing_on: true },
                  { wait: message.wait }
                ], remaining));
            } else {
              return new Promise((resolve, reject) => {
                setTimeout(resolve, milliseconds);
              }).then(() => {
                return call(remaining);
              });
            }
          }
        } else {
          const invokeParams = {
            name: connector.action,
            blocking: true,
            result: true,
            params: _.assign({ message }, connector.parameters, { payload })
          }

          return ow.actions.invoke(invokeParams)
            .then(result => {
              if (result.statusCode !== 200) {
                return Promise.reject({
                  statusCode: 503,
                  error: {
                    message: `The output connector '${connector.action}' did not respond with a valid result.`,
                    parameters: {
                      result
                    }
                  }
                })
              } else {
                if (_.size(remaining) > 0) {
                  return call(remaining);
                } else {
                  return Promise.resolve(payload);
                }
              }
            })
            .catch(error => {
              return Promise.reject({
                statusCode: 503,
                error: {
                  message: `There was an error calling the connector '${connector.action}'.`,
                  cause: error
                }
              })
            });
        }
      }

      const message = _.get(payload, 'output.message');

      if (_.isArray(message)) {
        return call(message);
      } else {
        return call([message]);
      }
    } else {
      return Promise.reject({
        statusCode: 400,
        error: {
          message: `No output connector found for channel '${payload.output.channel}'.`
        }
      });
    }
  }

  const persistContext = (payload) => {
    const invokeParams = {
      name: `${_.get(params.config, 'openwhisk.package')}/core-contextpersist`,
      blocking: true,
      result: true,
      params: { payload, force: true }
    }

    return ow.actions.invoke(invokeParams)
      .then(result => {
        if (result.statusCode !== 200) {
          return Promise.reject({
            statusCode: 503,
            error: {
              message: 'The persist-context action did not respond with a valid result.',
              parameters: {
                result
              }
            }
          })
        } else {
          return result.result;
        }
      });
  }

  return enrichParams()
    .then(params => bot.util.validatePayload(params.payload, 'OUTPUT'))
    .then(generateMessage)
    .then(callOutputConnector)
    .then(archiveOutput)
    .then(persistContext)
    .then(result => ({
      statusCode: 200,
      result
    }))
    .catch(bot.util.defaultErrorHandler);
}
const _ = require('lodash');
const botpack = require('serverless-botpack-lib');
const openwhisk = require('openwhisk');
const uuid = require('uuid/v4');

exports.main = (params) => {
  const bot = botpack(params);
  const ow = openwhisk();

  const enrichParams = () => {
    // Generate payload id if not existing
    if (!_.get(params, 'payload.id')) {
      _.set(params, 'payload.id', uuid());
    }

    // Prepare payload.output
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
    const invokeParams = {
      name: `${_.get(params.config, 'openwhisk.package')}/core-transform`,
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
              message: 'The core-transform action did not respond with a valid result.',
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
      const invokeParams = {
        name: connector.action,
        blocking: true,
        result: true,
        params: _.assign({}, connector.parameters, { payload })
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
            return Promise.resolve(payload);
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
    } else {
      return Promise.reject({
        statusCode: 400,
        error: {
          message: `No input connector found for channel '${payload.output.channel}'.`
        }
      });
    }
  }

  const persistContext = (payload) => {
    const invokeParams = {
      name: `${_.get(params.config, 'openwhisk.package')}/core-contextpersist`,
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
    .then(persistContext)
    .then(result => ({
      statusCode: 200,
      result
    }))
    .catch(bot.util.defaultErrorHandler);
}
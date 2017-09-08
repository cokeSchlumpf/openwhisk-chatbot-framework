const _ = require('lodash');
const openwhisk = require('openwhisk');
const routes = require('openwhisk-routes');
const Validator = require('better-validator');
const uuid = require('uuid/v4');
const wskbotfwk = require('serverless-botpack-lib');

exports.main = routes(action => {
  action.all('/', (req, res) => {
    const bot = wskbotfwk(_.get(req, 'wsk', {}));
    const request = _.pick(req, 'body', 'url', 'headers', 'method', 'query');
    const connectors = _.get(req, 'wsk.config.connectors.input', []);
    const config = _.get(req, 'wsk.config', {});

    const processError = (error) => {
      if (!_.isUndefined(error) && error.error && error.error.message) {
        res.status(error.statusCode || 500).send(error.error);
      } else {
        console.log(error);
        res.sendStatus(500);
      }
    }

    const processRequest = (ow, request, connectors, config, payloadId = uuid()) => {
      const connector = _.first(connectors);
      const remaining = _.tail(connectors);

      if (connector) {
        const payload = {
          id: payloadId,
          input: {
            channel: connector.channel
          }
        }

        const invokeParams = {
          name: connector.action,
          blocking: true,
          result: true,
          params: _.assign({}, { request, payload }, connector.parameters || {})
        };

        return ow.actions.invoke(invokeParams)
          .then(result => {
            const statusCode = _.get(result, 'statusCode');

            if (result.statusCode === 200) {
              const validator = new Validator();

              return bot.util.validatePayload(result.payload, 'INPUT')
                .then(() => {
                  const validator = new Validator();

                  validator(result).required().isObject(obj => {
                    obj('response').required().isObject(obj => {
                      obj('statusCode').required().isNumber().integer();
                      obj('body').isObject();
                    });
                  });

                  return bot.util.validate(validator);
                })
                .then(() => {
                  const invokeParams = {
                    name: `${_.get(config, 'openwhisk.package')}/middleware`,
                    params: { payload: result.payload }
                  };

                  return ow.actions.invoke(invokeParams);
                })
                .then(() => result)
                .catch(error => {
                  return Promise.reject({
                    statusCode: 503,
                    error: {
                      message: `The input connector '${connector.action}' did handle the request but did not respond with a valid response.`,
                      parameters: {
                        response: result,
                        cause: error
                      }
                    }
                  });
                });
            } else if (result.statusCode === 422) {
              // Input Connector did not recognize this input, try the next one.
              return processRequest(ow, request, remaining, config, payloadId);
            } else {
              return Promise.reject({
                statusCode: 503,
                error: {
                  message: `There was an exception executing the input connector '${connector.action}'.`,
                  parameters: {
                    response: result
                  }
                }
              });
            }
          });
      } else {
        return Promise.reject({
          statusCode: 404,
          error: {
            message: `There is no input connector which handles this request.`
          }
        });
      }
    }

    const processResponse = (connectorResponse) => {
      if (_.isPlainObject(connectorResponse.response.body)) {
        res
          .status(connectorResponse.response.statusCode)
          .send(connectorResponse.response.body);
      } else {
        res
          .sendStatus(connectorResponse.response.statusCode);
      }
    }

    processRequest(openwhisk(), request, connectors, config)
      .then(processResponse)
      .catch(processError);
  });
});
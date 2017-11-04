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

    const processRequest = (ow, request, connectors, config, received = Date.now() / 1000 | 0) => {
      const connector = _.first(connectors);
      const remaining = _.tail(connectors);

      if (connector) {
        const invokeParams = {
          name: connector.action,
          blocking: true,
          result: true,
          params: _.assign({}, { request: _.omit(request, 'config') }, connector.parameters || {})
        };

        return ow.actions.invoke(invokeParams)
          .then(result => {
            const statusCode = _.get(result, 'statusCoode');

            if (result.statusCode >= 200 && result.statusCode < 300) {
              const validator = new Validator();

              validator(result).required().isObject(obj => {
                obj('response').required().isObject(obj => {
                  obj('statusCode').required().isNumber().integer();
                });
              });

              return bot.util.validate(validator)
                .then(() => result)
                .catch(error => {
                  return Promise.reject(error);
                }).then(() => {
                  if (!_.isArray(result.input) && !_.isUndefined(result.input)) {
                    result.input = [result.input]
                  }

                  return Promise.all(_.map(_.get(result, 'input', []), input => {
                    const payload = {
                      id: uuid(),
                      input: _.assign(input, {
                        channel: connector.channel,
                        timestamp: received
                      })
                    }

                    return bot.util.validatePayload(payload, 'INPUT')
                      .then(() => {
                        const invokeParams = {
                          name: `${_.get(config, 'openwhisk.package')}/core-middleware`,
                          blocking: false,
                          result: false,
                          params: { payload }
                        };

                        return ow.actions.invoke(invokeParams);
                      })
                      .then(() => payload)
                      .catch(error => {
                        console.log(JSON.stringify(error));
                        
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
                  })).then(results => {
                    return result;
                  });
                });
            } else if (result.statusCode === 422) {
              // Input Connector did not recognize this input, try the next one.
              return processRequest(ow, request, remaining, config, received);
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
      if (connectorResponse.response.body) {
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
const _ = require('lodash');
const openwhisk = require('openwhisk');
const routes = require('openwhisk-routes');
const Validator = require('better-validator');

const processError = (res) => (error) => {
  if (!_.isUndefined(error) && error.error && error.error.message) {
    res.status(error.statusCode || 500).send(error.error);
  } else {
    res.sendStatus(500);
  }
}

const processMiddleware = (ow, payload, middlewares) => {
  const middleware = _.first(middlewares);
  const remaining = _.tail(middlewares);

  if (middleware) {
    
  } else {
    // TODO: Log Done
  }
}

const processRequest = (ow, request, connectors) => {
  const connector = _.first(connectors);
  const remaining = _.tail(connectors);

  if (connector) {
    const invokeParams = {
      name: connector.action,
      blocking: true,
      result: true,
      params: _.assign({}, { request }, connector.parameters || {})
    };

    return ow.actions.invoke(invokeParams)
      .then(result => {
        const validator = new Validator();
        let errors = 0;

        validator(result).required().isObject(obj => {
          obj('statusCode').required().isNumber().integer();
        });

        errors = validator.run();

        if (_.size(errors) === 0) {
          if (result.statusCode === 200) {
            validator(result).required().isObject(obj => {
              obj('payload').required().isObject(); // TODO, do further validation on payload
              obj('response').required().isObject(obj => {
                obj('statusCode').required().isNumber().integer();
                obj('body').isObject();
              });
            });

            errors = validator.run();

            if (_.size(errors) === 0) {
              return result;
            } else {
              return Promise.reject({
                statusCode: 503,
                error: {
                  message: `The input connector '${connector.action}' did handle the request but did not respond with a valid response.`,
                  parameters: {
                    response: result,
                    validationErrors: errors
                  }
                }
              })
            }
          } else if (result.statusCode === 422) {
            // Input Connector did not recognize this input, try the next one.
            return processRequest(ow, request, remaining);
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
        } else {
          return Promise.reject({
            statusCode: 503,
            error: {
              message: `The input connector '${connector.action}' did not return a valid response.`,
              parameters: {
                response: result,
                validationErrors: errors
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

const processResponse = (res) => (connectorResponse) => {
  if (_.isPlainObject(connectorResponse.response.body)) {
    res
      .status(connectorResponse.response.statusCode)
      .send(connectorResponse.response.body);
  } else {
    res
      .sendStatus(connectorResponse.response.statusCode);
  }
}

exports.main = routes(action => {
  action.all('/', (req, res) => {
    const request = _.pick(req, 'body', 'url', 'headers', 'method', 'query');
    const connectors = _.get(req.wsk, 'config.connectors.input', []);

    processRequest(openwhisk(), request, connectors)
      .then(processResponse(res))
      .catch(processError(res));
  });
});
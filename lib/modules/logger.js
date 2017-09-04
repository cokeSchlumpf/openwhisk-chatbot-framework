const _ = require('lodash');

const LEVELS = ['DEBUG', 'INFO', 'WARN', 'ERROR'];

module.exports = (params, ow) => {
  const log = (level) => (message) => {
    if (_.indexOf(LEVELS, level) >= _.indexOf(LEVELS, params.config.logger.level)) {
      const logmessage = _.isFunction(message) ? message() : message;

      return ow.actions.invoke({
        name: `${_.get(params, 'config.openwhisk.package')}/logger`,
        params: {
          level: level,
          message: logmessage,
          payload: _.get(params, 'payload', {})
        }
      });
    } else {
      return Promise.resolve({
        statusCode: 200,
        message: `Message log level '${level}' below configured log level '${params.config.logger.level}'.`
      });
    }
  }

  return _
    .chain(LEVELS)
    .map(level => [ level.toLowerCase(), log(level) ])
    .fromPairs()
    .value();
};
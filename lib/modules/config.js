const _ = require('lodash');
const dbModule = require('./db');

module.exports = (params, ow) => {
  const db = dbModule(params, ow);

  return {
    get: (key, defaultValue) => Promise
      .resolve(_.get(params, `config.${key}`))
      .then(value => {
        if (!value) {
          return db
            .read({ type: 'configuration', tag: `config/${key}` })
            .then(result => _.get(result[0], 'value'));
        } else {
          return value;
        }
      })
      .then(value => {
        if (value) {
          return value;
        } else if (defaultValue) {
          return defaultValue;
        } else {
          return Promise.reject({
            message: `Value ${key} not found.`
          })
        }
      }),
    set: (key, value) => db
      .read({ type: 'configuration', tag: `config/${key}` })
      .then(result => result[0])
      .then(result => {
        if (result) {
          return db.update(_.assign(result, { value }));
        } else {
          return db.create({
            type: 'configuration',
            tag: `config/${key}`,
            value
          });
        }
      })
  };
}
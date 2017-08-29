const _ = require('lodash');
const dbModule = require('./db');

module.exports = (params, ow) => {
  const db = dbModule(params, ow);

  return {
    get: (key, defaultValue) => {
      Promise
        .resolve(_.get(params, `config.${key}`))
        .then(value => {
          if (!value) {
            return db
              .read({ tag: `config/${key}` })
              .then(result => _.get(result[0], 'value'));
          } else {
            return value;
          }
        })
        .then(value => {
          if (!value) {
            return value;
          } else {
            return defaultValue;
          }
        });
    },
    set: (key, value) => db
      .read({ tag: `config/${key}` })
      .then(result => result[0])
      .then(result => {
        if (result) {
          return db.update(_.assign(result, { value }));
        } else {
          return db.create({
            tag: `config/${key}`,
            value
          });
        }
      })
      .then(result => result.value)
  };
}
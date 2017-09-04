const _ = require('lodash');

const handleActionResult = (result) => {
  if (result.statusCode === 200) {
    return Promise.resolve(result.result);
  } else {
    return Promise.reject(result.error);
  }
}

module.exports = (params, ow) => ({
  create: (doc) => ow.actions
    .invoke({
      name: `${_.get(params, 'config.openwhisk.package')}/datastore`,
      blocking: true,
      result: true,
      params: { operation: 'create', doc }
    })
    .then(handleActionResult),

  read: (selector, fields, sort, limit, skip) => ow.actions
    .invoke({
      name: `${_.get(params, 'config.openwhisk.package')}/datastore`,
      blocking: true,
      result: true,
      params: {
        operation: 'read',
        id: _.isString(selector) && _.isUndefined(fields) && selector || undefined,
        selector: _.isPlainObject(selector) && selector || undefined,
        fields, sort, limit, skip
      }
    })
    .then(handleActionResult),

  update: (doc) => ow.actions
    .invoke({
      name: `${_.get(params, 'config.openwhisk.package')}/datastore`,
      blocking: true,
      result: true,
      params: { operation: 'update', doc }
    })
    .then(handleActionResult),

  delete: (_id, _rev) => ow.actions
    .invoke({
      name: `${_.get(params, 'config.openwhisk.package')}/datastore`,
      blocking: true,
      result: true,
      params: { 
        operation: 'delete', 
        id: _.isString(_id) && _id || _id._id || undefined,
        rev: _.isString(_rev) && _rev || _.get(_id, '_rev') || undefined
      }
    })
    .then(handleActionResult),
});
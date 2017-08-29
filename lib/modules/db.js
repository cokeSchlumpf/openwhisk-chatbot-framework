const handleActionResult = (result) => {
  if (result.statusCode === 200) {
    return Promise.resolve(result.result);
  } else {
    return Promise.reject(result.error);
  }
}

exports.default = (params, ow) => ({
  create: (doc) => ow.actions
    .invoke({
      name: `${params.config.openwhisk.package}/datastore`,
      blocking: true,
      result: true,
      params: { operation: 'create', doc }
    })
    .then(handleActionResult),

  read: (selector, fields, sort, limit, skip) => ow.actions
    .invoke({
      name: `${params.config.openwhisk.package}/datastore`,
      blocking: true,
      result: true,
      params: {
        operation: 'read',
        id: _.isString(selector) && _.isUndefined(fields) && selector,
        selector: _.isPlainObject(selector) && selector,
        fields, sort, limit, skip
      }
    })
    .then(handleActionResult),

  update: (doc) => ow.actions
    .invoke({
      name: `${params.config.openwhisk.package}/datastore`,
      blocking: true,
      result: true,
      params: { operation: 'update', doc }
    })
    .then(handleActionResult),

  delete: (_id) => ow.actions
    .invoke({
      name: `${params.config.openwhisk.package}/datastore`,
      blocking: true,
      result: true,
      params: { operation: 'delete', _id: _.isString(_id) && _id || _id._id }
    })
    .then(handleActionResult),
});
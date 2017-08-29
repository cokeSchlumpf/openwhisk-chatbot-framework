const _ = require('lodash');
const cloudantclient = require('cloudant');
const Validator = require('better-validator');

function error(message, statusCode = 500) {
  return (error) => ({
    statusCode,
    error: {
      message,
      cause: error
    }
  })
};

function success(statusCode = 200) {
  return (result) => ({
    statusCode,
    result
  });
}

function validate(validator, f) {
  const errors = validator.run();

  if (_.size(errors) > 0) {
    return Promise.resolve({
      statusCode: 400,
      error: {
        message: 'Action parameters are invalid',
        cause: errors
      }
    });
  } else {
    return f();
  }
}

const create = (db, params) => {
  const validator = new Validator();

  validator(params).required().isObject(obj => {
    obj('doc').required().isObject();
  });

  return validate(validator, () => db
    .insert(params.doc)
    .then(result => db.get(result.id))
    .then(success(201))
    .catch(error('Cannot create document')));
}

const read = (db, params) => {
  if (params.selector || params.fields || params.sort || params.limit || params.skip) {
    const validator = new Validator();

    validator(params).required().isObject(obj => {
      obj('selector').isObject();
      obj('fields').isArray(item => item.isString());
      obj('sort').isArray(item => item.isObject());
      obj('limit').isNumber().integer();
      obj('skip').isNumber().integer();
    });

    return validate(validator, () => db
      .find(_.pick(params, 'selector', 'fields', 'sort', 'limit', 'skip'))
      .then(result => _.get(result, 'docs', []))
      .then(success())
      .catch(error('Cannot execute search')));
  } else if (params._id) {
    const validator = new Validator();

    validator(params).required().isObject(obj => {
      obj('_id').required().isString();
    });

    return validate(validator, () => db
      .get(params._id)
      .then(success())
      .catch(error(`Cannot find document with id '${params._id}'`, 400)));
  } else {
    return db
      .list({ include_docs: true })
      .then(docs => _.map(_.get(docs, 'rows', []), doc => _.get(doc, 'doc')))
      .then(success())
      .catch(error('Cannot get list of documents'));
  }
}

const update = (db, params) => {
  const validator = new Validator();

  validator(params).required().isObject(obj => {
    obj('doc').required().isObject(obj => {
      obj('_id').required().isString();
    });
  });

  return validate(validator, () => {
    let doc;

    if (!params.doc._rev) {
      doc = db
        .get(params.doc._id)
        .then(result => _.assign({}, params.doc, _.pick(result, '_rev')));
    } else {
      doc = Promise.resolve(params.doc);
    }

    return doc
      .then(result => db.insert(result))
      .then(result => db.get(result.id))
      .then(success())
      .catch(error('Cannot update document'));
  });
}

const remove = (db, params) => {
  const validator = new Validator();

  validator(params).required().isObject(obj => {
    obj('_id').required().isString();
  });

  let doc;

  if (!params._rev) {
    doc = db.get(params._id);
  } else {
    doc = Promise.resolve(params);
  }

  return doc
    .then(doc => db.destroy(doc._id, doc._rev))
    .then(success())
    .catch(error('Cannot delete document'));
}

exports.main = (params) => {
  const url = _.get(params, 'config.cloudant.url');
  const database = _.get(params, 'config.cloudant.database');

  const cloudantConfig = { url, plugin: 'promises' };
  const db = cloudantclient(cloudantConfig).db.use(database);

  switch (params.operation) {
    case 'create':
      return create(db, params);
    case 'read':
      return read(db, params);
    case 'update':
      return update(db, params);
    case 'delete':
      return remove(db, params);
    default:
      return error('Unkown operation');
  }
}
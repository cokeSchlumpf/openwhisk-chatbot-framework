const _ = require('lodash');
const chai = require('chai');
const requireMock = require('mock-require');
const sinon = require('sinon');

const debug = (result) => {
  console.log(JSON.stringify(result, null, 2));
  return result;
}

describe('db', () => {
  describe('db.create', () => {
    it('creates an object in the database and returns this object with its id', () => {
      // create stubs for actual functions
      const invokeStub = sinon.stub()
        .returns(Promise.resolve({
          statusCode: 200,
          result: {
            _id: '1234',
            foo: 'bar'
          }
        }));

      // mock openwhisk action calls to return successful results
      requireMock('openwhisk', () => ({
        actions: {
          invoke: invokeStub
        }
      }));

      // sample configuration used for the test
      const config = {
        openwhisk: {
          package: 'testpackage'
        }
      }

      return requireMock
        .reRequire('./index')({ __ow_method: 'get', __ow_path: '/', config })
        .db.create({ foo: 'bar' })
        .then(result => {
          chai.expect(result._id).to.equal('1234');
          chai.expect(result.foo).to.equal('bar');

          chai.expect(invokeStub.getCall(0).args[0].name).to.equal('testpackage/datastore');
          chai.expect(invokeStub.getCall(0).args[0].params.doc.foo).to.equal('bar');
          chai.expect(invokeStub.getCall(0).args[0].params.operation).to.equal('create');
        })
    });

    it('rejects the promise if an error is returned', () => {
      // create stubs for actual functions
      const invokeStub = sinon.stub()
        .returns(Promise.resolve({
          statusCode: 500,
          error: {
            message: 'sample error message',
            cause: {
              foo: 'bar'
            }
          }
        }));

      // mock openwhisk action calls to return successful results
      requireMock('openwhisk', () => ({
        actions: {
          invoke: invokeStub
        }
      }));

      // sample configuration used for the test
      const config = {
        openwhisk: {
          package: 'testpackage'
        }
      }

      return requireMock
        .reRequire('./index')({ __ow_method: 'get', __ow_path: '/', config })
        .db.create({ foo: 'bar' })
        .then(result => {
          chai.expect(true).to.be.false;
        })
        .catch(error => {
          chai.expect(error.message).to.equal('sample error message');
          chai.expect(error.cause.foo).to.equal('bar');

          chai.expect(invokeStub.getCall(0).args[0].name).to.equal('testpackage/datastore');
          chai.expect(invokeStub.getCall(0).args[0].params.doc.foo).to.equal('bar');
          chai.expect(invokeStub.getCall(0).args[0].params.operation).to.equal('create');
        });
    });
  });

  describe('db.read', () => {
    it('reads an object via the datastore openwhisk action with the given selector', () => {
      // create stubs for actual functions
      const invokeStub = sinon.stub()
        .returns(Promise.resolve({
          statusCode: 200,
          result: [{
            _id: '1234',
            foo: 'bar'
          }]
        }));

      // mock openwhisk action calls to return successful results
      requireMock('openwhisk', () => ({
        actions: {
          invoke: invokeStub
        }
      }));

      // sample configuration used for the test
      const config = {
        openwhisk: {
          package: 'testpackage'
        }
      }

      return requireMock
        .reRequire('./index')({ __ow_method: 'get', __ow_path: '/', config })
        .db.read({ foo: 'bar' })
        .then(result => {
          chai.expect(result[0]._id).to.equal('1234');
          chai.expect(result[0].foo).to.equal('bar');
          chai.expect(invokeStub.getCall(0).args[0].name).to.equal('testpackage/datastore');
          chai.expect(invokeStub.getCall(0).args[0].params.id).to.be.undefined;
          chai.expect(invokeStub.getCall(0).args[0].params.selector.foo).to.equal('bar');
          chai.expect(invokeStub.getCall(0).args[0].params.operation).to.equal('read');
        })
    });

    it('reads an object via the datastore openwhisk action with an id', () => {
      // create stubs for actual functions
      const invokeStub = sinon.stub()
        .returns(Promise.resolve({
          statusCode: 200,
          result: {
            _id: '1234',
            foo: 'bar'
          }
        }));

      // mock openwhisk action calls to return successful results
      requireMock('openwhisk', () => ({
        actions: {
          invoke: invokeStub
        }
      }));

      // sample configuration used for the test
      const config = {
        openwhisk: {
          package: 'testpackage'
        }
      }

      return requireMock
        .reRequire('./index')({ __ow_method: 'get', __ow_path: '/', config })
        .db.read('1234')
        .then(result => {
          chai.expect(result._id).to.equal('1234');
          chai.expect(result.foo).to.equal('bar');
          chai.expect(invokeStub.getCall(0).args[0].name).to.equal('testpackage/datastore');
          chai.expect(invokeStub.getCall(0).args[0].params.id).to.equal('1234');
          chai.expect(invokeStub.getCall(0).args[0].params.selector).to.be.undefined;
          chai.expect(invokeStub.getCall(0).args[0].params.operation).to.equal('read');
        })
    });
  });

  describe('db.update', () => {
    it('updates an object in the database', () => {
      // create stubs for actual functions
      const invokeStub = sinon.stub()
        .returns(Promise.resolve({
          statusCode: 200,
          result: {
            _id: '1234',
            foo: 'bar'
          }
        }));

      // mock openwhisk action calls to return successful results
      requireMock('openwhisk', () => ({
        actions: {
          invoke: invokeStub
        }
      }));

      // sample configuration used for the test
      const config = {
        openwhisk: {
          package: 'testpackage'
        }
      }

      return requireMock
        .reRequire('./index')({ __ow_method: 'get', __ow_path: '/', config })
        .db.update({ _id: '1234', foo: 'bar' })
        .then(result => {
          chai.expect(result._id).to.equal('1234');
          chai.expect(result.foo).to.equal('bar');

          chai.expect(invokeStub.getCall(0).args[0].name).to.equal('testpackage/datastore');
          chai.expect(invokeStub.getCall(0).args[0].params.doc.foo).to.equal('bar');
          chai.expect(invokeStub.getCall(0).args[0].params.operation).to.equal('update');
        })
    });
  });

  describe('db.delete', () => {
    it('deletes an object by its id', () => {
      // create stubs for actual functions
      const invokeStub = sinon.stub()
        .returns(Promise.resolve({
          statusCode: 200
        }));

      // mock openwhisk action calls to return successful results
      requireMock('openwhisk', () => ({
        actions: {
          invoke: invokeStub
        }
      }));

      // sample configuration used for the test
      const config = {
        openwhisk: {
          package: 'testpackage'
        }
      }

      return requireMock
        .reRequire('./index')({ __ow_method: 'get', __ow_path: '/', config })
        .db.delete('1234')
        .then(result => {
          chai.expect(invokeStub.getCall(0).args[0].name).to.equal('testpackage/datastore');
          chai.expect(invokeStub.getCall(0).args[0].params.id).to.equal('1234');
          chai.expect(invokeStub.getCall(0).args[0].params.rev).to.be.undefined;
          chai.expect(invokeStub.getCall(0).args[0].params.operation).to.equal('delete');
        })
    });

    it('deletes an object by its id, also when passing whole object', () => {
      // create stubs for actual functions
      const invokeStub = sinon.stub()
        .returns(Promise.resolve({
          statusCode: 200
        }));

      // mock openwhisk action calls to return successful results
      requireMock('openwhisk', () => ({
        actions: {
          invoke: invokeStub
        }
      }));

      // sample configuration used for the test
      const config = {
        openwhisk: {
          package: 'testpackage'
        }
      }

      return requireMock
        .reRequire('./index')({ __ow_method: 'get', __ow_path: '/', config })
        .db.delete({
          _id: '1234'
        })
        .then(result => {
          chai.expect(invokeStub.getCall(0).args[0].name).to.equal('testpackage/datastore');
          chai.expect(invokeStub.getCall(0).args[0].params.id).to.equal('1234');
          chai.expect(invokeStub.getCall(0).args[0].params.rev).to.be.undefined;
          chai.expect(invokeStub.getCall(0).args[0].params.operation).to.equal('delete');
        })
    });

    it('deletes an object by its id and rev', () => {
      // create stubs for actual functions
      const invokeStub = sinon.stub()
        .returns(Promise.resolve({
          statusCode: 200
        }));

      // mock openwhisk action calls to return successful results
      requireMock('openwhisk', () => ({
        actions: {
          invoke: invokeStub
        }
      }));

      // sample configuration used for the test
      const config = {
        openwhisk: {
          package: 'testpackage'
        }
      }

      return requireMock
        .reRequire('./index')({ __ow_method: 'get', __ow_path: '/', config })
        .db.delete({
          _id: '1234',
          _rev: 'abcd'
        })
        .then(result => {
          chai.expect(invokeStub.getCall(0).args[0].name).to.equal('testpackage/datastore');
          chai.expect(invokeStub.getCall(0).args[0].params.id).to.equal('1234');
          chai.expect(invokeStub.getCall(0).args[0].params.rev).to.equal('abcd');
          chai.expect(invokeStub.getCall(0).args[0].params.operation).to.equal('delete');
        })
    });

    it('deletes an object by its id and rev with arguments', () => {
      // create stubs for actual functions
      const invokeStub = sinon.stub()
        .returns(Promise.resolve({
          statusCode: 200
        }));

      // mock openwhisk action calls to return successful results
      requireMock('openwhisk', () => ({
        actions: {
          invoke: invokeStub
        }
      }));

      // sample configuration used for the test
      const config = {
        openwhisk: {
          package: 'testpackage'
        }
      }

      return requireMock
        .reRequire('./index')({ __ow_method: 'get', __ow_path: '/', config })
        .db.delete('1234', 'abcd')
        .then(result => {
          chai.expect(invokeStub.getCall(0).args[0].name).to.equal('testpackage/datastore');
          chai.expect(invokeStub.getCall(0).args[0].params.id).to.equal('1234');
          chai.expect(invokeStub.getCall(0).args[0].params.rev).to.equal('abcd');
          chai.expect(invokeStub.getCall(0).args[0].params.operation).to.equal('delete');
        })
    });
  });
});

describe('config', () => {
  describe('config.get', () => {
    it('gets a configuration value from the configuration first', () => {
      // mock openwhisk action calls to return successful results
      requireMock('openwhisk', () => ({
        actions: {}
      }));

      // sample configuration used for the test
      const config = {
        key: 'value',
        openwhisk: {
          package: 'testpackage'
        }
      }

      return requireMock
        .reRequire('./index')({ __ow_method: 'get', __ow_path: '/', config })
        .config.get('key', 'defaultValue')
        .then(result => {
          chai.expect(result).to.equal('value');
        });
    });

    it('gets a configuration value from the database if no configuration is included in the environment', () => {
      // create stubs for actual functions
      const invokeStub = sinon.stub()
        .returns(Promise.resolve({
          statusCode: 200,
          result: [{
            _id: '1234',
            type: 'configuration',
            tag: 'config/key',
            value: 'value'
          }]
        }));

      // mock openwhisk action calls to return successful results
      requireMock('openwhisk', () => ({
        actions: {
          invoke: invokeStub
        }
      }));

      // sample configuration used for the test
      const config = {
        openwhisk: {
          package: 'testpackage'
        }
      }

      return requireMock
        .reRequire('./index')({ __ow_method: 'get', __ow_path: '/', config })
        .config.get('key', 'defaultValue')
        .then(result => {
          chai.expect(invokeStub.getCall(0).args[0].name).to.equal('testpackage/datastore');
          chai.expect(invokeStub.getCall(0).args[0].params.selector.type).to.equal('configuration');
          chai.expect(invokeStub.getCall(0).args[0].params.selector.tag).to.equal('config/key');

          chai.expect(result).to.equal('value');
        });
    });

    it('returns the default value if now configuration is found', () => {
      // create stubs for actual functions
      const invokeStub = sinon.stub()
        .returns(Promise.resolve({
          statusCode: 200,
          result: []
        }));

      // mock openwhisk action calls to return successful results
      requireMock('openwhisk', () => ({
        actions: {
          invoke: invokeStub
        }
      }));

      // sample configuration used for the test
      const config = {
        openwhisk: {
          package: 'testpackage'
        }
      }

      return requireMock
        .reRequire('./index')({ __ow_method: 'get', __ow_path: '/', config })
        .config.get('key', 'defaultValue')
        .then(result => {
          chai.expect(invokeStub.getCall(0).args[0].name).to.equal('testpackage/datastore');
          chai.expect(invokeStub.getCall(0).args[0].params.selector.type).to.equal('configuration');
          chai.expect(invokeStub.getCall(0).args[0].params.selector.tag).to.equal('config/key');

          chai.expect(result).to.equal('defaultValue');
        });
    });

    it('rejects the config value request if no default is defined', () => {
      // create stubs for actual functions
      const invokeStub = sinon.stub()
        .returns(Promise.resolve({
          statusCode: 200,
          result: []
        }));

      // mock openwhisk action calls to return successful results
      requireMock('openwhisk', () => ({
        actions: {
          invoke: invokeStub
        }
      }));

      // sample configuration used for the test
      const config = {
        openwhisk: {
          package: 'testpackage'
        }
      }

      return requireMock
        .reRequire('./index')({ __ow_method: 'get', __ow_path: '/', config })
        .config.get('key', 'defaultValue')
        .then(result => {
          chai.expect(true).to.be.false;
        })
        .catch(error => {
          chai.expect(invokeStub.getCall(0).args[0].name).to.equal('testpackage/datastore');
          chai.expect(invokeStub.getCall(0).args[0].params.selector.type).to.equal('configuration');
          chai.expect(invokeStub.getCall(0).args[0].params.selector.tag).to.equal('config/key');

          chai.expect(error.message).to.exist;
        });
    });
  });

  describe('config.set', () => {
    it('saves a configuration value to the database, updates when it exists', () => {
      // create stubs for actual functions
      const invokeStub = sinon.stub()
        .onCall(0).returns(Promise.resolve({
          statusCode: 200,
          result: [
            {
              _id: '1234',
              type: 'configuration',
              tag: 'config/key',
              value: 'value'
            }
          ]
        }))
        .onCall(1).returns(Promise.resolve({
          statusCode: 200,
          result: {
            _id: '1234',
            type: 'configuration',
            tag: 'config/key',
            value: 'value_new'
          }
        }));

      // mock openwhisk action calls to return successful results
      requireMock('openwhisk', () => ({
        actions: {
          invoke: invokeStub
        }
      }));

      // sample configuration used for the test
      const config = {
        openwhisk: {
          package: 'testpackage'
        }
      }

      return requireMock
        .reRequire('./index')({ __ow_method: 'get', __ow_path: '/', config })
        .config.set('key', 'value_new')
        .then(result => {
          chai.expect(invokeStub.getCall(0).args[0].name).to.equal('testpackage/datastore');
          chai.expect(invokeStub.getCall(0).args[0].params.operation).to.equal('read');
          chai.expect(invokeStub.getCall(0).args[0].params.selector.type).to.equal('configuration');
          chai.expect(invokeStub.getCall(0).args[0].params.selector.tag).to.equal('config/key');

          chai.expect(invokeStub.getCall(1).args[0].params.operation).to.equal('update');
          chai.expect(invokeStub.getCall(1).args[0].params.doc._id).to.equal('1234');
          chai.expect(invokeStub.getCall(1).args[0].params.doc.type).to.equal('configuration');
          chai.expect(invokeStub.getCall(1).args[0].params.doc.tag).to.equal('config/key');
          chai.expect(invokeStub.getCall(1).args[0].params.doc.value).to.equal('value_new');

          chai.expect(result.value).to.equal('value_new');
        });
    });

    it('saves a configuration value to the database, creates a new if value does not exist', () => {
      // create stubs for actual functions
      const invokeStub = sinon.stub()
        .onCall(0).returns(Promise.resolve({
          statusCode: 200,
          result: []
        }))
        .onCall(1).returns(Promise.resolve({
          statusCode: 200,
          result: {
            _id: '1234',
            type: 'configuration',
            tag: 'config/key',
            value: 'value_new'
          }
        }));

      // mock openwhisk action calls to return successful results
      requireMock('openwhisk', () => ({
        actions: {
          invoke: invokeStub
        }
      }));

      // sample configuration used for the test
      const config = {
        openwhisk: {
          package: 'testpackage'
        }
      }

      return requireMock
        .reRequire('./index')({ __ow_method: 'get', __ow_path: '/', config })
        .config.set('key', 'value_new')
        .then(result => {
          chai.expect(invokeStub.getCall(0).args[0].name).to.equal('testpackage/datastore');
          chai.expect(invokeStub.getCall(0).args[0].params.operation).to.equal('read');
          chai.expect(invokeStub.getCall(0).args[0].params.selector.type).to.equal('configuration');
          chai.expect(invokeStub.getCall(0).args[0].params.selector.tag).to.equal('config/key');

          chai.expect(invokeStub.getCall(1).args[0].params.operation).to.equal('create');
          chai.expect(invokeStub.getCall(1).args[0].params.doc.type).to.equal('configuration');
          chai.expect(invokeStub.getCall(1).args[0].params.doc.tag).to.equal('config/key');
          chai.expect(invokeStub.getCall(1).args[0].params.doc.value).to.equal('value_new');

          chai.expect(result.value).to.equal('value_new');
        });
    });
  });
});

describe('logger', () => {
  it('sends a log message to the logger action if the log level is equal or lower of the messages log level', () => {
    // create stubs for actual functions
    const invokeStub = sinon.stub()
      .returns(Promise.resolve({
        statusCode: 200,
        result: []
      }));

    // mock openwhisk action calls to return successful results
    requireMock('openwhisk', () => ({
      actions: {
        invoke: invokeStub
      }
    }));

    // sample configuration used for the test
    const config = {
      logger: {
        level: 'DEBUG'
      },
      openwhisk: {
        package: 'testpackage'
      }
    };

    return requireMock
    .reRequire('./index')({ config })
    .log.debug('Hello World!')
    .then(result => {
      chai.expect(invokeStub.getCall(0).args[0].name).to.equal('testpackage/logger');
      chai.expect(invokeStub.getCall(0).args[0].params.message).to.equal('Hello World!');
      chai.expect(invokeStub.getCall(0).args[0].params.level).to.equal('DEBUG');
    });
  });

  it('does not send the message if the log level is configured to be below the messages level', () => {
    // create stubs for actual functions
    const invokeStub = sinon.stub()
      .returns(Promise.resolve({
        statusCode: 200,
        result: []
      }));

    // mock openwhisk action calls to return successful results
    requireMock('openwhisk', () => ({
      actions: {
        invoke: invokeStub
      }
    }));

    // sample configuration used for the test
    const config = {
      logger: {
        level: 'WARN'
      },
      openwhisk: {
        package: 'testpackage'
      }
    };

    return requireMock
    .reRequire('./index')({ config })
    .log.debug('Hello World!')
    .then(result => {
      chai.expect(invokeStub.callCount).to.equal(0);
    });
  });

  it('does call a function if it is passed as a message argument, for complex computations', () => {
    // create stubs for actual functions
    const invokeStub = sinon.stub()
      .returns(Promise.resolve({
        statusCode: 200,
        result: []
      }));

    // mock openwhisk action calls to return successful results
    requireMock('openwhisk', () => ({
      actions: {
        invoke: invokeStub
      }
    }));

    // sample configuration used for the test
    const config = {
      logger: {
        level: 'WARN'
      },
      openwhisk: {
        package: 'testpackage'
      }
    };

    const messageStub = sinon.stub().returns('foo');

    return requireMock
    .reRequire('./index')({ config })
    .log.error(messageStub)
    .then(result => {
      chai.expect(invokeStub.callCount).to.equal(1);
      chai.expect(messageStub.callCount).to.equal(1);
      chai.expect(invokeStub.getCall(0).args[0].params.message).to.equal('foo');
    });
  });

  it('does not execute the message function if the log level is configured to be below the messages level', () => {
    // create stubs for actual functions
    const invokeStub = sinon.stub()
      .returns(Promise.resolve({
        statusCode: 200,
        result: []
      }));

    // mock openwhisk action calls to return successful results
    requireMock('openwhisk', () => ({
      actions: {
        invoke: invokeStub
      }
    }));

    // sample configuration used for the test
    const config = {
      logger: {
        level: 'WARN'
      },
      openwhisk: {
        package: 'testpackage'
      }
    };

    const messageStub = sinon.stub().returns('foo');

    return requireMock
    .reRequire('./index')({ config })
    .log.debug(messageStub)
    .then(result => {
      chai.expect(invokeStub.callCount).to.equal(0);
      chai.expect(messageStub.callCount).to.equal(0);
    });
  });
});

describe('util', () => {
  describe('util.validate', () => {
    it('executes validate on better-validator Validator instances', () => {
      const runStub = sinon.stub().returns([]);

      const validatorMock = {
        run: runStub
      }

      // sample configuration used for the test
      const config = {}

      return requireMock
        .reRequire('./index')({ __ow_method: 'get', __ow_path: '/', config })
        .util.validate(validatorMock, () => 3)
        .then(result => {
          chai.expect(result).to.equal(3);
        });
    });

    it('executes validate on better-validator Validator instances and rejects promise in case of an error', () => {
      const runStub = sinon.stub().returns([{ error: 'foo', path: 'foo' }]);

      const validatorMock = {
        run: runStub
      }

      // sample configuration used for the test
      const config = {}

      return requireMock
        .reRequire('./index')({ __ow_method: 'get', __ow_path: '/', config })
        .util.validate(validatorMock, () => 3)
        .then(result => {
          chai.expect(true).to.be.false;
        })
        .catch(error => {
          chai.expect(error.error).to.have.property('message');
          chai.expect(error.error).to.have.property('cause');
          chai.expect(error.error.cause[0].error).to.equal('foo');
        });
    });
  });
})
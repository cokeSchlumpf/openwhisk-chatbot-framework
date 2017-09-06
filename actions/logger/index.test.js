const _ = require('lodash');
const chai = require('chai');
const requireMock = require('mock-require');
const sinon = require('sinon');

const debug = (result) => {
  console.log(JSON.stringify(result, null, 2));
  return result;
}

/* 
 * Some general notes ... 
 */
describe('logger', () => {
  it('inserts log into the database', () => {
    // create stubs for actual functions
    const invokeStub = sinon.stub()
      .returns(Promise.resolve({
        statusCode: 200,
        result: {
          hello: 'world'
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
      },
      logger: {
        level: 'INFO'
      }
    };

    const params = {
      message: 'A test message',
      level: 'ERROR',
      config
    };

    requireMock.reRequire('serverless-botpack-lib');
    requireMock.reRequire('openwhisk');

    return requireMock.reRequire('./index').main(params)
      .then(result => {
        chai.expect(result.statusCode).to.equal(200);
        chai.expect(invokeStub.getCall(0).args[0].params.operation).to.equal('create');
        chai.expect(invokeStub.getCall(0).args[0].params.doc.message).to.equal('A test message');
        chai.expect(invokeStub.getCall(0).args[0].params.doc.level).to.equal('ERROR');
        chai.expect(invokeStub.getCall(0).args[0].params.doc.user).to.be.undefined;
        chai.expect(invokeStub.getCall(0).args[0].params.doc.payload).to.be.undefined;
      });
  });

  it('does not insert if the loglevel is below the configuration.', () => {
    // create stubs for actual functions
    const invokeStub = sinon.stub()
      .returns(Promise.resolve({
        statusCode: 200,
        result: {}
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
      },
      logger: {
        level: 'INFO'
      }
    };

    const params = {
      message: 'A test message',
      level: 'DEBUG',
      config
    };

    requireMock.reRequire('serverless-botpack-lib');
    requireMock.reRequire('openwhisk');

    return requireMock.reRequire('./index').main(params)
      .then(result => {
        chai.expect(invokeStub.callCount).to.equal(0);
        chai.expect(result.statusCode).to.equal(200);
      });
  });

  it('inserts log into the database and enriches the log with context information', () => {
    // create stubs for actual functions
    const invokeStub = sinon.stub()
      .returns(Promise.resolve({
        statusCode: 200,
        result: {
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
      },
      logger: {
        level: 'INFO'
      }
    };

    const params = {
      message: 'A test message',
      level: 'ERROR',
      payload: {
        id: '1234',
        conversationcontext: {
          user: {
            id: 'ABCD'
          }
        }
      },
      config
    };

    requireMock.reRequire('serverless-botpack-lib');
    requireMock.reRequire('openwhisk');

    return requireMock.reRequire('./index').main(params)
      .then(result => {
        chai.expect(result.statusCode).to.equal(200);
        chai.expect(invokeStub.getCall(0).args[0].params.operation).to.equal('create');
        chai.expect(invokeStub.getCall(0).args[0].params.doc.message).to.equal('A test message');
        chai.expect(invokeStub.getCall(0).args[0].params.doc.level).to.equal('ERROR');
        chai.expect(invokeStub.getCall(0).args[0].params.doc.user).to.equal('ABCD');
        chai.expect(invokeStub.getCall(0).args[0].params.doc.payload).to.equal('1234');
      });
  });

  it('it validates the configuration and parameters', () => {
    // sample configuration used for the test
    const config = {
      openwhisk: {
        package: 'testpackage'
      },
      logger: {
        level_wrong: 'INFO'
      }
    };

    const params = {
      message: 'A test message',
      level_wrong: 'ERROR',
      payload: {
        id: '1234',
        conversationcontext: {
          user: {
            id: 'ABCD'
          }
        }
      },
      config
    };

    return requireMock.reRequire('./index').main(params)
      .then(result => {
        chai.expect(result.statusCode).to.equal(400);
      });
  });
});
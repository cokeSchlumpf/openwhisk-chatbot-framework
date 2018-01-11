const _ = require('lodash');
const chai = require('chai');
const requireMock = require('mock-require');
const sinon = require('sinon');

const debug = (result) => {
  console.log(JSON.stringify(result, null, 2));
  return result;
}

describe('core-middleware', () => {
  it('calls the configured middleware components in the specified order', () => {
    const invokeStub = sinon.stub()
      .onCall(0).returns(Promise.resolve({ statusCode: 200, payload: { result: 1 } }))
      .onCall(1).returns(Promise.resolve({ statusCode: 200, payload: { result: 2 } }));

    requireMock('openwhisk', () => ({
      actions: {
        invoke: invokeStub
      }
    }));

    const config = {
      middleware: [
        {
          action: 'package/action_00'
        },
        {
          action: 'package/action_01'
        },
      ]
    }

    const payload = { result: 0 }

    requireMock.reRequire('openwhisk');

    return requireMock.reRequire('./index').main({ config, payload })
      .then(result => {
        chai.expect(result.statusCode).to.equal(200);
        chai.expect(invokeStub.callCount).to.equal(2);
        chai.expect(invokeStub.getCall(0).args[0].name).to.equal('package/action_00');
        chai.expect(invokeStub.getCall(0).args[0].params.payload.result).to.equal(0);
        chai.expect(invokeStub.getCall(1).args[0].name).to.equal('package/action_01');

        chai.expect(result.payload.result).to.equal(2);
      });
  });

  it('stops processing on an error', () => {
    const invokeStub = sinon.stub()
      .onCall(0).returns(Promise.resolve({ statusCode: 200, payload: { result: 1 } }))
      .onCall(1).returns(Promise.resolve({ statusCode: 500, error: { message: 'foo' } }))
      .onCall(2).returns(Promise.resolve({ statusCode: 200, payload: { result: 3 } }));

    requireMock('openwhisk', () => ({
      actions: {
        invoke: invokeStub
      }
    }));

    const config = {
      middleware: [
        {
          action: 'package/action_00'
        },
        {
          action: 'package/action_01'
        },
        {
          action: 'package/action_02'
        }
      ]
    }

    const payload = { result: 0 }

    requireMock.reRequire('openwhisk');

    return requireMock.reRequire('./index').main({ config, payload })
      .then(result => {
        chai.expect(result.statusCode).to.equal(202);
        chai.expect(invokeStub.callCount).to.equal(2);
        chai.expect(invokeStub.getCall(0).args[0].name).to.equal('package/action_00');
        chai.expect(invokeStub.getCall(0).args[0].params.payload.result).to.equal(0);
        chai.expect(invokeStub.getCall(1).args[0].name).to.equal('package/action_01');
        chai.expect(invokeStub.getCall(1).args[0].params.payload.result).to.equal(1);

        chai.expect(result.payload.result).to.equal(1);
      });
  });

  it('stops processing on an error, but executes actions marked with final', () => {
    const invokeStub = sinon.stub()
      .onCall(0).returns(Promise.resolve({ statusCode: 200, payload: { result: 1 } }))
      .onCall(1).returns(Promise.resolve({ statusCode: 500, error: { message: 'foo' } }))
      .onCall(2).returns(Promise.resolve({ statusCode: 200, payload: { result: 4 } }));

    requireMock('openwhisk', () => ({
      actions: {
        invoke: invokeStub
      }
    }));

    const config = {
      middleware: [
        {
          action: 'package/action_00'
        },
        {
          action: 'package/action_01'
        },
        {
          action: 'package/action_02'
        },
        {
          action: 'package/action_03',
          properties: {
            final: true
          }
        }
      ]
    }

    const payload = { result: 0 }

    requireMock.reRequire('openwhisk');

    return requireMock.reRequire('./index').main({ config, payload })
      .then(result => {
        chai.expect(result.statusCode).to.equal(202);
        chai.expect(invokeStub.callCount).to.equal(3);
        chai.expect(invokeStub.getCall(0).args[0].name).to.equal('package/action_00');
        chai.expect(invokeStub.getCall(0).args[0].params.payload.result).to.equal(0);
        chai.expect(invokeStub.getCall(1).args[0].name).to.equal('package/action_01');
        chai.expect(invokeStub.getCall(1).args[0].params.payload.result).to.equal(1);
        chai.expect(invokeStub.getCall(2).args[0].name).to.equal('package/action_03');
        chai.expect(invokeStub.getCall(2).args[0].params.payload.result).to.equal(1);

        chai.expect(result.payload.result).to.equal(4);
      });
  });

  it('stops processing on an error (throws), but executes actions marked with final', () => {
    const invokeStub = sinon.stub()
      .onCall(0).returns(Promise.resolve({ statusCode: 200, payload: { result: 1 } }))
      .onCall(1).throws()
      .onCall(2).returns(Promise.resolve({ statusCode: 200, payload: { result: 4 } }));

    requireMock('openwhisk', () => ({
      actions: {
        invoke: invokeStub
      }
    }));

    const config = {
      middleware: [
        {
          action: 'package/action_00'
        },
        {
          action: 'package/action_01'
        },
        {
          action: 'package/action_02'
        },
        {
          action: 'package/action_03',
          properties: {
            final: true
          }
        }
      ]
    }

    const payload = { result: 0 }

    requireMock.reRequire('openwhisk');

    return requireMock.reRequire('./index').main({ config, payload })
      .then(result => {
        chai.expect(result.statusCode).to.equal(202);
        
        chai.expect(invokeStub.callCount).to.equal(3);
        chai.expect(invokeStub.getCall(0).args[0].name).to.equal('package/action_00');
        chai.expect(invokeStub.getCall(0).args[0].params.payload.result).to.equal(0);
        chai.expect(invokeStub.getCall(1).args[0].name).to.equal('package/action_01');
        chai.expect(invokeStub.getCall(1).args[0].params.payload.result).to.equal(1);
        chai.expect(invokeStub.getCall(2).args[0].name).to.equal('package/action_03');
        chai.expect(invokeStub.getCall(2).args[0].params.payload.result).to.equal(1);

        chai.expect(result.payload.result).to.equal(4);
      });
  });

  it('continues processing on an error if acton is set to do so', () => {
    const invokeStub = sinon.stub()
      .onCall(0).returns(Promise.resolve({ statusCode: 200, payload: { result: 1 } }))
      .onCall(1).returns(Promise.resolve({ statusCode: 500, error: { message: 'foo' } }))
      .onCall(2).returns(Promise.resolve({ statusCode: 200, payload: { result: 3 } }));

    requireMock('openwhisk', () => ({
      actions: {
        invoke: invokeStub
      }
    }));

    const config = {
      middleware: [
        {
          action: 'package/action_00'
        },
        {
          action: 'package/action_01',
          properties: {
            continue_on_error: true
          }
        },
        {
          action: 'package/action_02'
        }
      ]
    }

    const payload = { result: 0 }

    requireMock.reRequire('openwhisk');

    return requireMock.reRequire('./index').main({ config, payload })
      .then(result => {
        chai.expect(result.statusCode).to.equal(202);
        
        chai.expect(invokeStub.callCount).to.equal(3);
        chai.expect(invokeStub.getCall(0).args[0].name).to.equal('package/action_00');
        chai.expect(invokeStub.getCall(0).args[0].params.payload.result).to.equal(0);
        chai.expect(invokeStub.getCall(1).args[0].name).to.equal('package/action_01');
        chai.expect(invokeStub.getCall(1).args[0].params.payload.result).to.equal(1);
        chai.expect(invokeStub.getCall(2).args[0].name).to.equal('package/action_02');
        chai.expect(invokeStub.getCall(2).args[0].params.payload.result).to.equal(1);

        chai.expect(result.payload.result).to.equal(3);
      });
  });

  it('continues processing after an error if catch-actions are defined', () => {
    const invokeStub = sinon.stub()
      .onCall(0).returns(Promise.resolve({ statusCode: 200, payload: { result: 1 } }))
      .onCall(1).returns(Promise.resolve({ statusCode: 500, error: { message: 'foo' } }))
      .onCall(0).returns(Promise.resolve({ statusCode: 200, payload: { result: 3 } }))
      .onCall(2).returns(Promise.resolve({ statusCode: 200, payload: { result: 4 } }));

    requireMock('openwhisk', () => ({
      actions: {
        invoke: invokeStub
      }
    }));

    const config = {
      middleware: [
        {
          action: 'package/action_00'
        },
        {
          action: 'package/action_01'
        },
        {
          action: 'package/action_02'
        },
        {
          action: 'package/action_03',
          properties: {
            catch: true
          }
        },
        {
          action: 'package/action_04'
        }
      ]
    }

    const payload = { result: 0 }

    requireMock.reRequire('openwhisk');

    return requireMock.reRequire('./index').main({ config, payload })
      .then(result => {
        chai.expect(result.statusCode).to.equal(202);
        
        chai.expect(invokeStub.callCount).to.equal(4);
        chai.expect(invokeStub.getCall(0).args[0].name).to.equal('package/action_00');
        chai.expect(invokeStub.getCall(0).args[0].params.payload.result).to.equal(0);
        chai.expect(invokeStub.getCall(1).args[0].name).to.equal('package/action_01');
        chai.expect(invokeStub.getCall(1).args[0].params.payload.result).to.equal(1);
        chai.expect(invokeStub.getCall(2).args[0].name).to.equal('package/action_03');
        chai.expect(invokeStub.getCall(2).args[0].params.payload.result).to.equal(1);
        chai.expect(invokeStub.getCall(3).args[0].name).to.equal('package/action_04');
        chai.expect(invokeStub.getCall(3).args[0].params.payload.result).to.equal(3);

        chai.expect(result.payload.result).to.equal(4);
      });
  });

  it('also updates the payload if a payload is returned by a middleware failure', () => {
    const invokeStub = sinon.stub()
      .onCall(0).returns(Promise.resolve({ statusCode: 200, payload: { result: 1 } }))
      .onCall(1).returns(Promise.reject({
        statusCode: 503, error: {
          message: 'There was an error.',
          parameters: {

          }
        },
        payload: {
          result: 2
        }
      }))
      .onCall(2).returns(Promise.resolve({ statusCode: 200, payload: { result: 4 } }));

    requireMock('openwhisk', () => ({
      actions: {
        invoke: invokeStub
      }
    }));

    const config = {
      middleware: [
        {
          action: 'package/action_00'
        },
        {
          action: 'package/action_01'
        },
        {
          action: 'package/action_02'
        },
        {
          action: 'package/action_03',
          properties: {
            final: true
          }
        }
      ]
    }

    const payload = { result: 0 }

    requireMock.reRequire('openwhisk');

    return requireMock.reRequire('./index').main({ config, payload })
      .then(result => {
        chai.expect(result.statusCode).to.equal(202);
        
        chai.expect(invokeStub.callCount).to.equal(3);
        chai.expect(invokeStub.getCall(0).args[0].name).to.equal('package/action_00');
        chai.expect(invokeStub.getCall(0).args[0].params.payload.result).to.equal(0);
        chai.expect(invokeStub.getCall(1).args[0].name).to.equal('package/action_01');
        chai.expect(invokeStub.getCall(1).args[0].params.payload.result).to.equal(1);
        chai.expect(invokeStub.getCall(2).args[0].name).to.equal('package/action_03');
        chai.expect(invokeStub.getCall(2).args[0].params.payload.result).to.equal(2);

        chai.expect(result.payload.result).to.equal(4);
      });
  });

  it('middleware can also be passed via parameter', () => {
    const invokeStub = sinon.stub()
      .onCall(0).returns(Promise.resolve({ statusCode: 200, payload: { result: 1 } }))
      .onCall(1).returns(Promise.resolve({ statusCode: 200, payload: { result: 2 } }));

    requireMock('openwhisk', () => ({
      actions: {
        invoke: invokeStub
      }
    }));

    const config = {
      middleware: [
        {
          action: 'package/action_10'
        },
        {
          action: 'package/action_11'
        },
      ]
    }

    const middleware = [
      {
        action: 'package/action_00'
      },
      {
        action: 'package/action_01'
      },
    ]

    const payload = { result: 0 }

    requireMock.reRequire('openwhisk');

    return requireMock.reRequire('./index').main({ config, middleware, payload })
      .then(result => {       
        chai.expect(result.statusCode).to.equal(200); 
        chai.expect(invokeStub.callCount).to.equal(2);
        chai.expect(invokeStub.getCall(0).args[0].name).to.equal('package/action_00');
        chai.expect(invokeStub.getCall(0).args[0].params.payload.result).to.equal(0);
        chai.expect(invokeStub.getCall(1).args[0].name).to.equal('package/action_01');

        chai.expect(result.payload.result).to.equal(2);
      });
  });
});
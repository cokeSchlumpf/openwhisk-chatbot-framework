const _ = require('lodash');
const chai = require('chai');
const requireMock = require('mock-require');
const sinon = require('sinon');

describe('middleware-patterns-fanout', () => {
  it('executes all downstream actions concurrently, the one with the best result wins', () => {
    const invokeStub = sinon.stub()
      .onCall(0).returns(Promise.resolve({ statusCode: 200, payload: { conversationcontext: { result: 1 }}}))
      .onCall(1).returns(Promise.resolve({ statusCode: 200, payload: { conversationcontext: { result: 2 }}}));

    requireMock('openwhisk', () => ({
      actions: {
        invoke: invokeStub
      }
    }));

    const config = {
      patterns: {
        fanout: {
          fail_on_error: false,
          rating: {
            field: 'conversationcontext.result',
            default_value: 0,
            sort: 'asc'
          },
          actions: {
            foo: { action: 'package/action_00' },
            bar: { action: 'package/action_01' }
          }
        }
      }
    }

    const payload = { conversationcontext: { result: 0 } }

    requireMock.reRequire('openwhisk');

    return requireMock.reRequire('./index').main({ config, payload })
      .then(result => {
        chai.expect(result.statusCode).to.equal(200);
        
        chai.expect(invokeStub.callCount).to.equal(2);
        chai.expect(invokeStub.getCall(0).args[0].name).to.equal('package/action_00');
        chai.expect(invokeStub.getCall(0).args[0].params.payload.conversationcontext.result).to.equal(0);
        chai.expect(invokeStub.getCall(1).args[0].name).to.equal('package/action_01');
        chai.expect(invokeStub.getCall(1).args[0].params.payload.conversationcontext.result).to.equal(0);
        chai.expect(result.payload.conversationcontext.result).to.equal(1);
      });
  });

  it('executes all downstream actions concurrently, the one with the best result wins - desc test', () => {
    const invokeStub = sinon.stub()
      .onCall(0).returns(Promise.resolve({ statusCode: 200, payload: { conversationcontext: { result: 1 }}}))
      .onCall(1).returns(Promise.resolve({ statusCode: 200, payload: { conversationcontext: { result: 2 }}}));

    requireMock('openwhisk', () => ({
      actions: {
        invoke: invokeStub
      }
    }));

    const config = {
      patterns: {
        fanout: {
          fail_on_error: false,
          rating: {
            field: 'conversationcontext.result',
            default_value: 0,
            sort: 'desc'
          },
          actions: {
            foo: { action: 'package/action_00' },
            bar: { action: 'package/action_01' }
          }
        }
      }
    }

    const payload = { conversationcontext: { result: 0 } }

    requireMock.reRequire('openwhisk');

    return requireMock.reRequire('./index').main({ config, payload })
      .then(result => {
        chai.expect(result.statusCode).to.equal(200);
        
        chai.expect(invokeStub.callCount).to.equal(2);
        chai.expect(invokeStub.getCall(0).args[0].name).to.equal('package/action_00');
        chai.expect(invokeStub.getCall(0).args[0].params.payload.conversationcontext.result).to.equal(0);
        chai.expect(invokeStub.getCall(1).args[0].name).to.equal('package/action_01');
        chai.expect(invokeStub.getCall(1).args[0].params.payload.conversationcontext.result).to.equal(0);
        chai.expect(result.payload.conversationcontext.result).to.equal(2);
      });
  });

  it('executes all downstream actions concurrently, the one with the best result wins - a default value can be set', () => {
    const invokeStub = sinon.stub()
      .onCall(0).returns(Promise.resolve({ statusCode: 200, payload: { conversationcontext: { foo: 'bar' }}}))
      .onCall(1).returns(Promise.resolve({ statusCode: 200, payload: { conversationcontext: { result: 2 }}}));

    requireMock('openwhisk', () => ({
      actions: {
        invoke: invokeStub
      }
    }));

    const config = {
      patterns: {
        fanout: {
          fail_on_error: false,
          rating: {
            field: 'conversationcontext.result',
            default_value: 0,
            sort: 'asc'
          },
          actions: {
            foo: { action: 'package/action_00' },
            bar: { action: 'package/action_01' }
          }
        }
      }
    }

    const payload = { conversationcontext: { result: 10 } }

    requireMock.reRequire('openwhisk');

    return requireMock.reRequire('./index').main({ config, payload })
      .then(result => {
        chai.expect(result.statusCode).to.equal(200);
        
        chai.expect(invokeStub.callCount).to.equal(2);
        chai.expect(invokeStub.getCall(0).args[0].name).to.equal('package/action_00');
        chai.expect(invokeStub.getCall(0).args[0].params.payload.conversationcontext.result).to.equal(10);
        chai.expect(invokeStub.getCall(1).args[0].name).to.equal('package/action_01');
        chai.expect(invokeStub.getCall(1).args[0].params.payload.conversationcontext.result).to.equal(10);
        chai.expect(result.payload.conversationcontext.foo).to.equal('bar');
      });
  });

  it('fails if one of the downstream invocations fails', () => {
    const invokeStub = sinon.stub()
      .onCall(0).returns(Promise.resolve({ statusCode: 200, payload: { conversationcontext: { foo: 'bar' }}}))
      .onCall(1).returns(Promise.reject({}));

    requireMock('openwhisk', () => ({
      actions: {
        invoke: invokeStub
      }
    }));

    const config = {
      patterns: {
        fanout: {
          rating: {
            field: 'conversationcontext.result',
            default_value: 0,
            sort: 'asc'
          },
          actions: {
            foo: { action: 'package/action_00' },
            bar: { action: 'package/action_01' }
          }
        }
      }
    }

    const payload = { conversationcontext: { result: 10 } }

    requireMock.reRequire('openwhisk');

    return requireMock.reRequire('./index').main({ config, payload })
      .then(result => {
        chai.expect(true).to.be.false;
      })
      .catch(result => {
        chai.expect(result.statusCode).to.equal(503);
        chai.expect(result.error.message).to.contain("Error calling on downstream action");
      });
  });

  it('also can return a result, even if one downstream action returns an error', () => {
    const invokeStub = sinon.stub()
      .onCall(0).returns(Promise.resolve({ statusCode: 200, payload: { conversationcontext: { result: 42 }}}))
      .onCall(1).returns(Promise.reject({}));

    requireMock('openwhisk', () => ({
      actions: {
        invoke: invokeStub
      }
    }));

    const config = {
      patterns: {
        fanout: {
          fail_on_error: false,
          rating: {
            field: 'conversationcontext.result',
            default_value: 0,
            sort: 'asc'
          },
          actions: {
            foo: { action: 'package/action_00' },
            bar: { action: 'package/action_01' }
          }
        }
      }
    }

    const payload = { conversationcontext: { result: 10 } }

    requireMock.reRequire('openwhisk');

    return requireMock.reRequire('./index').main({ config, payload })
      .then(result => {
        chai.expect(result.statusCode).to.equal(200);
        
        chai.expect(invokeStub.callCount).to.equal(2);
        chai.expect(invokeStub.getCall(0).args[0].name).to.equal('package/action_00');
        chai.expect(invokeStub.getCall(0).args[0].params.payload.conversationcontext.result).to.equal(10);
        chai.expect(invokeStub.getCall(1).args[0].name).to.equal('package/action_01');
        chai.expect(invokeStub.getCall(1).args[0].params.payload.conversationcontext.result).to.equal(10);
        chai.expect(result.payload.conversationcontext.result).to.equal(42);
      });
  });

  it('returns an error if no downstream action was successful', () => {
    const invokeStub = sinon.stub()
      .onCall(0).returns(Promise.resolve({ statusCode: 407, payload: { conversationcontext: { result: 42 }}}))
      .onCall(1).returns(Promise.resolve({ statusCode: 409, payload: { conversationcontext: { result: 42 }}}));

    requireMock('openwhisk', () => ({
      actions: {
        invoke: invokeStub
      }
    }));

    const config = {
      patterns: {
        fanout: {
          fail_on_error: false,
          rating: {
            field: 'conversationcontext.result',
            default_value: 0,
            sort: 'asc'
          },
          actions: {
            foo: { action: 'package/action_00' },
            bar: { action: 'package/action_01' }
          }
        }
      }
    }

    const payload = { conversationcontext: { result: 10 } }

    requireMock.reRequire('openwhisk');

    return requireMock.reRequire('./index').main({ config, payload })
      .then(result => {
        chai.expect(true).to.be.false;
      })
      .catch(result => {
        chai.expect(result.statusCode).to.equal(503);
        chai.expect(result.error.message).to.exist;
      });
  });
});
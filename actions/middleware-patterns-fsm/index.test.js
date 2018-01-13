const _ = require('lodash');
const chai = require('chai');
const requireMock = require('mock-require');
const sinon = require('sinon');

describe('middleware-patterns-fsm', () => {
  it('executes the action defined for the initial state, if no state is active yet', () => {
    const invokeStub = sinon.stub()
      .onCall(0).returns(Promise.resolve({ statusCode: 200, payload: { result: 1 } }));

    requireMock('openwhisk', () => ({
      actions: {
        invoke: invokeStub
      }
    }));

    const config = {
      patterns: {
        fsm: {
          initial: {
            state: 'bar'
          },
          states: {
            foo: { action: 'package/action_00' },
            bar: { action: 'package/action_01' }
          }
        }
      }
    }

    const payload = { result: 0 }

    requireMock.reRequire('openwhisk');

    return requireMock.reRequire('./index').main({ config, payload })
      .then(result => {
        chai.expect(result.statusCode).to.equal(200);
        
        chai.expect(invokeStub.callCount).to.equal(1);
        chai.expect(invokeStub.getCall(0).args[0].name).to.equal('package/action_01');
        chai.expect(invokeStub.getCall(0).args[0].params.payload.result).to.equal(0);
        
        chai.expect(result.payload.result).to.equal(1);
        chai.expect(result.payload.conversationcontext.patterns.fsm.state).to.equal('bar');
      });
  });

  it('goes to the next state if the result of tha current state action indicates', () => {
    const invokeStub = sinon.stub()
      .onCall(0).returns(Promise.resolve({ statusCode: 200, payload: { result: 1 }, fsm: { goto: 'foo', using: 'lorem ipsum' } }));

    requireMock('openwhisk', () => ({
      actions: {
        invoke: invokeStub
      }
    }));

    const config = {
      patterns: {
        fsm: {
          initial: {
            state: 'bar'
          },
          states: {
            foo: { action: 'package/action_00' },
            bar: { action: 'package/action_01' }
          }
        }
      }
    }

    const payload = { result: 0 }

    requireMock.reRequire('openwhisk');

    return requireMock.reRequire('./index').main({ config, payload })
      .then(result => {
        chai.expect(result.statusCode).to.equal(200);
        
        chai.expect(invokeStub.callCount).to.equal(1);
        chai.expect(invokeStub.getCall(0).args[0].name).to.equal('package/action_01');
        chai.expect(invokeStub.getCall(0).args[0].params.payload.result).to.equal(0);
        
        chai.expect(result.payload.result).to.equal(1);
        chai.expect(result.payload.conversationcontext.patterns.fsm.state).to.equal('foo');
        chai.expect(result.payload.conversationcontext.patterns.fsm.data).to.equal('lorem ipsum');
      });
  });

  it('uses the current state if defined', () => {
    const invokeStub = sinon.stub()
      .onCall(0).returns(Promise.resolve({ statusCode: 200, payload: { result: 1 }, fsm: { goto: 'foo', using: 'lorem ipsum' } }));

    requireMock('openwhisk', () => ({
      actions: {
        invoke: invokeStub
      }
    }));

    const config = {
      patterns: {
        fsm: {
          initial: {
            state: 'bar'
          },
          states: {
            foo: { action: 'package/action_00' },
            bar: { action: 'package/action_01' }
          }
        }
      }
    }

    const payload = { 
      conversationcontext: {
        patterns: {
          fsm: {
            state: 'foo',
            data: 'lala'
          }
        }
      },
      result: 0 
    }

    requireMock.reRequire('openwhisk');

    return requireMock.reRequire('./index').main({ config, payload })
      .then(result => {
        chai.expect(result.statusCode).to.equal(200);
        
        chai.expect(invokeStub.callCount).to.equal(1);
        chai.expect(invokeStub.getCall(0).args[0].name).to.equal('package/action_00');
        chai.expect(invokeStub.getCall(0).args[0].params.fsm_state.data).to.equal('lala');
        chai.expect(invokeStub.getCall(0).args[0].params.payload.result).to.equal(0);
        
        chai.expect(result.payload.result).to.equal(1);
        chai.expect(result.payload.conversationcontext.patterns.fsm.state).to.equal('foo');
        chai.expect(result.payload.conversationcontext.patterns.fsm.data).to.equal('lorem ipsum');
      });
  });

  it('calls the unhandled handler if the state handler did not handle the payload', () => {
    const invokeStub = sinon.stub()
      .onCall(0).returns(Promise.resolve({ statusCode: 422 }))
      .onCall(1).returns(Promise.resolve({ statusCode: 200, payload: { result: 1 } }));

    requireMock('openwhisk', () => ({
      actions: {
        invoke: invokeStub
      }
    }));

    const config = {
      patterns: {
        fsm: {
          initial: {
            state: 'bar'
          },
          states: {
            foo: { action: 'package/action_00' },
            bar: { action: 'package/action_01' }
          },
          unhandled: { action: 'package/action_03' }
        }
      }
    }

    const payload = { result: 0 }

    requireMock.reRequire('openwhisk');

    return requireMock.reRequire('./index').main({ config, payload })
      .then(result => {
        chai.expect(result.statusCode).to.equal(200);
        
        chai.expect(invokeStub.callCount).to.equal(2);
        chai.expect(invokeStub.getCall(0).args[0].name).to.equal('package/action_01');
        chai.expect(invokeStub.getCall(0).args[0].params.payload.result).to.equal(0);
        chai.expect(invokeStub.getCall(1).args[0].name).to.equal('package/action_03');
        chai.expect(invokeStub.getCall(1).args[0].params.payload.result).to.equal(0);
        
        chai.expect(result.payload.result).to.equal(1);
      });
  });

  it('goes to the next state if the unhandled handler returns the fsm commands', () => {
    const invokeStub = sinon.stub()
      .onCall(0).returns(Promise.resolve({ statusCode: 422 }))
      .onCall(1).returns(Promise.resolve({ statusCode: 200, payload: { result: 1 }, fsm: { goto: 'foo', using: 'lorem ipsum' } }));

    requireMock('openwhisk', () => ({
      actions: {
        invoke: invokeStub
      }
    }));

    const config = {
      patterns: {
        fsm: {
          initial: {
            state: 'bar'
          },
          states: {
            foo: { action: 'package/action_00' },
            bar: { action: 'package/action_01' }
          },
          unhandled: { action: 'package/action_03' }
        }
      }
    }

    const payload = { result: 0 }

    requireMock.reRequire('openwhisk');

    return requireMock.reRequire('./index').main({ config, payload })
      .then(result => {
        chai.expect(result.statusCode).to.equal(200);
        
        chai.expect(invokeStub.callCount).to.equal(2);
        chai.expect(invokeStub.getCall(0).args[0].name).to.equal('package/action_01');
        chai.expect(invokeStub.getCall(0).args[0].params.payload.result).to.equal(0);
        chai.expect(invokeStub.getCall(1).args[0].name).to.equal('package/action_03');
        chai.expect(invokeStub.getCall(1).args[0].params.payload.result).to.equal(0);
        
        chai.expect(result.payload.result).to.equal(1);
        chai.expect(result.payload.conversationcontext.patterns.fsm.state).to.equal('foo');
        chai.expect(result.payload.conversationcontext.patterns.fsm.data).to.equal('lorem ipsum');
      });
  });

  it('accepts timeout commands for the next state', () => {
    const invokeStub = sinon.stub()
      .onCall(0).returns(Promise.resolve({ statusCode: 422 }))
      .onCall(1).returns(Promise.resolve({ statusCode: 200, payload: { result: 1 }, fsm: { 
        goto: 'foo', 
        using: 'lorem ipsum',
        timeout: 3 * 60 * 60 * 1000,
        timeout_goto: 'other_state',
        timeout_using: 'foo bar'
      } }));

    requireMock('openwhisk', () => ({
      actions: {
        invoke: invokeStub
      }
    }));

    const config = {
      patterns: {
        fsm: {
          initial: {
            state: 'bar'
          },
          states: {
            foo: { action: 'package/action_00' },
            bar: { action: 'package/action_01' }
          },
          unhandled: { action: 'package/action_03' }
        }
      }
    }

    const payload = { result: 0 }

    requireMock.reRequire('openwhisk');

    return requireMock.reRequire('./index').main({ config, payload })
      .then(result => {
        chai.expect(result.statusCode).to.equal(200);
        
        chai.expect(invokeStub.callCount).to.equal(2);
        chai.expect(invokeStub.getCall(0).args[0].name).to.equal('package/action_01');
        chai.expect(invokeStub.getCall(0).args[0].params.payload.result).to.equal(0);
        chai.expect(invokeStub.getCall(1).args[0].name).to.equal('package/action_03');
        chai.expect(invokeStub.getCall(1).args[0].params.payload.result).to.equal(0);
        
        chai.expect(result.payload.result).to.equal(1);
        chai.expect(result.payload.conversationcontext.patterns.fsm.state).to.equal('foo');
        chai.expect(result.payload.conversationcontext.patterns.fsm.data).to.equal('lorem ipsum');

        chai.expect(result.payload.conversationcontext.patterns.fsm.timeout).to.equal(3 * 60 * 60 * 1000);
        chai.expect(result.payload.conversationcontext.patterns.fsm.timeout_goto).to.equal('other_state');
        chai.expect(result.payload.conversationcontext.patterns.fsm.timeout_using).to.equal('foo bar');
      });
  });

  it('may jump to another defined timeout state, if the timeout is reached', () => {
    const invokeStub = sinon.stub()
      .onCall(0).returns(Promise.resolve({ statusCode: 200, payload: { result: 1 }, fsm: { 
        goto: 'foo', 
        using: 'lorem ipsum'
      } }));

    requireMock('openwhisk', () => ({
      actions: {
        invoke: invokeStub
      }
    }));

    const config = {
      patterns: {
        fsm: {
          initial: {
            state: 'bar'
          },
          states: {
            foo: { action: 'package/action_00' },
            bar: { action: 'package/action_01' }
          },
          unhandled: { action: 'package/action_03' }
        }
      }
    }

    const payload = { 
      conversationcontext: {
        patterns: {
          fsm: {
            state: 'foo',
            since_timestamp: (new Date()).getTime() - (60 * 1000),
            timeout: 2000,
            timeout_goto: 'bar',
            timeout_using: 'foo bar'
          }
        }
      },
      result: 0 
    }

    requireMock.reRequire('openwhisk');

    return requireMock.reRequire('./index').main({ config, payload })
      .then(result => {
        chai.expect(result.statusCode).to.equal(200);
        
        chai.expect(invokeStub.callCount).to.equal(1);
        chai.expect(invokeStub.getCall(0).args[0].name).to.equal('package/action_01');
        chai.expect(invokeStub.getCall(0).args[0].params.payload.result).to.equal(0);
        
        chai.expect(result.payload.result).to.equal(1);
        chai.expect(result.payload.conversationcontext.patterns.fsm.state).to.equal('foo');
        chai.expect(result.payload.conversationcontext.patterns.fsm.data).to.equal('lorem ipsum');
      });
  });

  it('may jump to the initial state, if the timeout is reached', () => {
    const invokeStub = sinon.stub()
      .onCall(0).returns(Promise.resolve({ statusCode: 200, payload: { result: 1 }, fsm: { 
        goto: 'foo', 
        using: 'lorem ipsum'
      } }));

    requireMock('openwhisk', () => ({
      actions: {
        invoke: invokeStub
      }
    }));

    const config = {
      patterns: {
        fsm: {
          initial: {
            state: 'bar'
          },
          states: {
            foo: { action: 'package/action_00' },
            bar: { action: 'package/action_01' }
          },
          unhandled: { action: 'package/action_03' }
        }
      }
    }

    const payload = { 
      conversationcontext: {
        patterns: {
          fsm: {
            state: 'foo',
            since_timestamp: (new Date()).getTime() - (60 * 1000),
            timeout: 2000
          }
        }
      },
      result: 0 
    }

    requireMock.reRequire('openwhisk');

    return requireMock.reRequire('./index').main({ config, payload })
      .then(result => {
        chai.expect(result.statusCode).to.equal(200);
        
        chai.expect(invokeStub.callCount).to.equal(1);
        chai.expect(invokeStub.getCall(0).args[0].name).to.equal('package/action_01');
        chai.expect(invokeStub.getCall(0).args[0].params.payload.result).to.equal(0);
        
        chai.expect(result.payload.result).to.equal(1);
        chai.expect(result.payload.conversationcontext.patterns.fsm.state).to.equal('foo');
        chai.expect(result.payload.conversationcontext.patterns.fsm.data).to.equal('lorem ipsum');
      });
  });

  it('does not jump to the timeout_action if timeout is not reached', () => {
    const invokeStub = sinon.stub()
      .onCall(0).returns(Promise.resolve({ statusCode: 200, payload: { result: 1 }, fsm: { 
        goto: 'foo', 
        using: 'lorem ipsum'
      } }));

    requireMock('openwhisk', () => ({
      actions: {
        invoke: invokeStub
      }
    }));

    const config = {
      patterns: {
        fsm: {
          initial: {
            state: 'bar'
          },
          states: {
            foo: { action: 'package/action_00' },
            bar: { action: 'package/action_01' }
          },
          unhandled: { action: 'package/action_03' }
        }
      }
    }

    const payload = { 
      conversationcontext: {
        patterns: {
          fsm: {
            state: 'foo',
            since_timestamp: (new Date()).getTime() - 2000,
            timeout: 1000 * 60,
            timeout_goto: 'bar',
            timeout_using: 'foo bar'
          }
        }
      },
      result: 0 
    }

    requireMock.reRequire('openwhisk');

    return requireMock.reRequire('./index').main({ config, payload })
      .then(result => {
        chai.expect(result.statusCode).to.equal(200);
        
        chai.expect(invokeStub.callCount).to.equal(1);
        chai.expect(invokeStub.getCall(0).args[0].name).to.equal('package/action_00');
        chai.expect(invokeStub.getCall(0).args[0].params.payload.result).to.equal(0);
        
        chai.expect(result.payload.result).to.equal(1);
        chai.expect(result.payload.conversationcontext.patterns.fsm.state).to.equal('foo');
        chai.expect(result.payload.conversationcontext.patterns.fsm.data).to.equal('lorem ipsum');
      });
  });

  it('returns an error if the state is not handled properly and no unhandled action is defined', () => {
    const invokeStub = sinon.stub()
      .onCall(0).returns(Promise.resolve({ statusCode: 422 }));

    requireMock('openwhisk', () => ({
      actions: {
        invoke: invokeStub
      }
    }));

    const config = {
      patterns: {
        fsm: {
          initial: {
            state: 'bar'
          },
          states: {
            foo: { action: 'package/action_00' },
            bar: { action: 'package/action_01' }
          }
        }
      }
    }

    const payload = { result: 0 }

    requireMock.reRequire('openwhisk');

    return requireMock.reRequire('./index').main({ config, payload })
      .then(result => {
        chai.expect(true).to.be.false;
      })
      .catch(result => {
        chai.expect(result.error.message).to.exist;
        chai.expect(result.statusCode).to.equal(503);
      });
  });
});
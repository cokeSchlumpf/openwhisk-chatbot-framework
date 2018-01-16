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
            foo: { handler: { action: 'package/action_00' } },
            bar: { handler: { action: 'package/action_01' } }
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
            foo: { handler: { action: 'package/action_00' } },
            bar: { handler: { action: 'package/action_01' } }
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
            foo: { handler: { action: 'package/action_00' } },
            bar: { handler: { action: 'package/action_01' } }
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
        chai.expect(invokeStub.getCall(0).args[0].params.fsm.data).to.equal('lala');
        chai.expect(invokeStub.getCall(0).args[0].params.payload.result).to.equal(0);

        chai.expect(result.payload.result).to.equal(1);
        chai.expect(result.payload.conversationcontext.patterns.fsm.state).to.equal('foo');
        chai.expect(result.payload.conversationcontext.patterns.fsm.data).to.equal('lorem ipsum');
      });
  });

  it('also accepts the current state directly passed to the action', () => {
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
            foo: { handler: { action: 'package/action_00' } },
            bar: { handler: { action: 'package/action_01' } }
          }
        }
      }
    }

    const payload = {
      conversationcontext: {},
      result: 0
    }

    const fsm = {
      state: 'foo',
      data: 'lala'
    }

    requireMock.reRequire('openwhisk');

    return requireMock.reRequire('./index').main({ config, payload, fsm })
      .then(result => {
        chai.expect(result.statusCode).to.equal(200);

        chai.expect(invokeStub.callCount).to.equal(1);
        chai.expect(invokeStub.getCall(0).args[0].name).to.equal('package/action_00');
        chai.expect(invokeStub.getCall(0).args[0].params.fsm.data).to.equal('lala');
        chai.expect(invokeStub.getCall(0).args[0].params.payload.result).to.equal(0);

        chai.expect(result.payload.result).to.equal(1);
        chai.expect(result.fsm.state).to.equal('foo');
        chai.expect(result.fsm.data).to.equal('lorem ipsum');
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
            foo: { handler: { action: 'package/action_00' } },
            bar: { handler: { action: 'package/action_01' } }
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
            foo: { handler: { action: 'package/action_00' } },
            bar: { handler: { action: 'package/action_01' } }
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
      .onCall(1).returns(Promise.resolve({
        statusCode: 200, payload: { result: 1 }, fsm: {
          goto: 'foo',
          using: 'lorem ipsum',
          timeout: {
            ms: 3 * 60 * 60 * 1000,
            goto: 'other_state',
            using: 'foo bar'
          }
        }
      }));

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
            foo: { handler: { action: 'package/action_00' } },
            bar: { handler: { action: 'package/action_01' } }
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

        chai.expect(result.payload.conversationcontext.patterns.fsm.timeout.ms).to.equal(3 * 60 * 60 * 1000);
        chai.expect(result.payload.conversationcontext.patterns.fsm.timeout.goto).to.equal('other_state');
        chai.expect(result.payload.conversationcontext.patterns.fsm.timeout.using).to.equal('foo bar');
      });
  });

  it('may jump to another defined timeout state, if the timeout is reached', () => {
    const invokeStub = sinon.stub()
      .onCall(0).returns(Promise.resolve({
        statusCode: 200, payload: { result: 1 }, fsm: {
          goto: 'foo',
          using: 'lorem ipsum'
        }
      }));

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
            foo: { handler: { action: 'package/action_00' } },
            bar: { handler: { action: 'package/action_01' } }
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
            since: {
              timestamp: (new Date()).getTime() - (60 * 1000)
            },
            timeout: {
              ms: 2000,
              goto: 'bar',
              using: 'foo bar'
            }
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
      .onCall(0).returns(Promise.resolve({
        statusCode: 200, payload: { result: 1 }, fsm: {
          goto: 'foo',
          using: 'lorem ipsum'
        }
      }));

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
            foo: { handler: { action: 'package/action_00' } },
            bar: { handler: { action: 'package/action_01' } }
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
            since: {
              timestamp: (new Date()).getTime() - (60 * 1000)
            },
            timeout: {
              ms: 2000
            }
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
      .onCall(0).returns(Promise.resolve({
        statusCode: 200, payload: { result: 1 }, fsm: {
          goto: 'foo',
          using: 'lorem ipsum'
        }
      }));

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
            foo: { handler: { action: 'package/action_00' } },
            bar: { handler: { action: 'package/action_01' } }
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
            foo: { handler: { action: 'package/action_00' } },
            bar: { handler: { action: 'package/action_01' } }
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

  it('calls transition actions when entering a state', () => {
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
            foo: { handler: { action: 'package/action_00' } },
            bar: { handler: { action: 'package/action_01' } }
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

  it('executes the action defined for the initial state and the enter action, if no state is active yet', () => {
    const invokeStub = sinon.stub()
      .onCall(0).returns(Promise.resolve({ statusCode: 200, payload: { result: 1 } }))
      .onCall(1).returns(Promise.resolve({ statusCode: 200, payload: { result: 2 } }))
      .onCall(2).returns(Promise.resolve({ statusCode: 200, payload: { result: 3 } }));

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
            foo: { handler: { action: 'package/action_00' } },
            bar: {
              enter: { action: 'package/action_02' },
              handler: { action: 'package/action_01' }
            }
          }
        }
      }
    }

    const payload = { result: 0 }

    requireMock.reRequire('openwhisk');

    return requireMock.reRequire('./index').main({ config, payload })
      .then(result => {
        chai.expect(result.statusCode).to.equal(200);

        chai.expect(invokeStub.callCount).to.equal(2);
        chai.expect(invokeStub.getCall(0).args[0].name).to.equal('package/action_02');
        chai.expect(invokeStub.getCall(0).args[0].params.payload.result).to.equal(0);
        chai.expect(invokeStub.getCall(1).args[0].name).to.equal('package/action_01');
        chai.expect(invokeStub.getCall(1).args[0].params.payload.result).to.equal(1);

        chai.expect(result.payload.result).to.equal(2);
        chai.expect(result.payload.conversationcontext.patterns.fsm.state).to.equal('bar');
      });
  });

  it('calls enter and exit actions when changing the state', () => {
    const invokeStub = sinon.stub()
      .onCall(0).returns(Promise.resolve({ statusCode: 200, payload: { result: 1 }, fsm: { goto: 'lorem', using: 'lorem ipsum' } }))
      .onCall(1).returns(Promise.resolve({ statusCode: 200, payload: { result: 2 } }))
      .onCall(2).returns(Promise.resolve({ statusCode: 200, payload: { result: 3 } }));

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
            foo: {
              handler: { action: 'package/action_00' },
              exit: { action: 'package/action_05' }
            },
            bar: {
              enter: { action: 'package/action_02' },
              handler: { action: 'package/action_01' }
            },
            lorem: {
              enter: { action: 'package/action_03' },
              handler: { action: 'package/action_04' }
            }
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
        chai.expect(result.payload.result).to.equal(3);

        chai.expect(invokeStub.callCount).to.equal(3);
        chai.expect(invokeStub.getCall(0).args[0].name).to.equal('package/action_00');
        chai.expect(invokeStub.getCall(0).args[0].params.fsm.data).to.equal('lala');
        chai.expect(invokeStub.getCall(0).args[0].params.payload.result).to.equal(0);

        chai.expect(invokeStub.getCall(1).args[0].params.payload.conversationcontext.patterns.fsm.state).to.equal('lorem');
        chai.expect(invokeStub.getCall(1).args[0].params.payload.conversationcontext.patterns.fsm.data).to.equal('lorem ipsum');

        chai.expect(invokeStub.getCall(1).args[0].name).to.equal('package/action_05');
        chai.expect(invokeStub.getCall(2).args[0].name).to.equal('package/action_03');
      });
  });

  it('additionally calls transitions when defined', () => {
    const invokeStub = sinon.stub()
      .onCall(0).returns(Promise.resolve({ statusCode: 200, payload: { result: 1 }, fsm: { goto: 'lorem', using: 'lorem ipsum' } }))
      .onCall(1).returns(Promise.resolve({ statusCode: 200, payload: { result: 2 } }))
      .onCall(2).returns(Promise.resolve({ statusCode: 200, payload: { result: 3 } }))
      .onCall(3).returns(Promise.resolve({ statusCode: 200, payload: { result: 4 } }));

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
            foo: {
              handler: { action: 'package/action_00' },
              exit: { action: 'package/action_05' }
            },
            bar: {
              enter: { action: 'package/action_02' },
              handler: { action: 'package/action_01' }
            },
            lorem: {
              enter: { action: 'package/action_03' },
              handler: { action: 'package/action_04' }
            }
          },
          transitions: [
            {
              from: 'foo',
              to: 'lorem',
              handler: {
                action: 'package/action_06'
              }
            }
          ]
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
        chai.expect(result.payload.result).to.equal(4);

        chai.expect(invokeStub.callCount).to.equal(4);
        chai.expect(invokeStub.getCall(0).args[0].name).to.equal('package/action_00');
        chai.expect(invokeStub.getCall(0).args[0].params.fsm.data).to.equal('lala');
        chai.expect(invokeStub.getCall(0).args[0].params.payload.result).to.equal(0);

        chai.expect(invokeStub.getCall(1).args[0].params.payload.conversationcontext.patterns.fsm.state).to.equal('lorem');
        chai.expect(invokeStub.getCall(1).args[0].params.payload.conversationcontext.patterns.fsm.data).to.equal('lorem ipsum');

        chai.expect(invokeStub.getCall(1).args[0].name).to.equal('package/action_05');
        chai.expect(invokeStub.getCall(2).args[0].name).to.equal('package/action_06');
        chai.expect(invokeStub.getCall(3).args[0].name).to.equal('package/action_03');
      });
  });

  it('can be used as hierarchical state machine', () => {
    const invokeStub = sinon.stub()
      .onCall(0).returns(Promise.resolve({ statusCode: 422 }))
      .onCall(1).returns(Promise.resolve({ statusCode: 200, payload: { result: 1 }, fsm: { goto: '/b/a', using: 'lorem ipsum' } }))

    requireMock('openwhisk', () => ({
      actions: {
        invoke: invokeStub
      }
    }));

    const config = {
      patterns: {
        fsm: {
          initial: {
            state: '/b'
          },
          states: {
            '/b': { handler: { action: 'package/action_00' } },
            '/b/a': { handler: { action: 'package/action_01' } },
            '/b/b': { handler: { action: 'package/action_02' } },
          }
        }
      }
    }

    const payload = {
      conversationcontext: {
        patterns: {
          fsm: {
            state: '/b/b',
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
        chai.expect(result.payload.result).to.equal(1);
        chai.expect(result.payload.conversationcontext.patterns.fsm.state).to.equal('/b/a');
        chai.expect(result.payload.conversationcontext.patterns.fsm.data).to.equal('lorem ipsum');

        chai.expect(invokeStub.callCount).to.equal(2);
        chai.expect(invokeStub.getCall(0).args[0].name).to.equal('package/action_02');
        chai.expect(invokeStub.getCall(0).args[0].params.fsm.data).to.equal('lala');
        chai.expect(invokeStub.getCall(0).args[0].params.payload.result).to.equal(0);

        chai.expect(invokeStub.getCall(1).args[0].name).to.equal('package/action_00');
        chai.expect(invokeStub.getCall(1).args[0].params.fsm.data).to.equal('lala');
        chai.expect(invokeStub.getCall(1).args[0].params.payload.result).to.equal(0);
      });
  });

  // Add implementatio + tests for transitions in hierarchies? Will not be implmented before it is required.
});
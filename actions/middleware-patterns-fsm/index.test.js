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
});
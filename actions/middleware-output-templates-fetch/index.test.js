const _ = require('lodash');
const chai = require('chai');
const requireMock = require('mock-require');
const sinon = require('sinon');

describe('middleware-output-templates-fetch', () => {
  it('calls an action to fetch messages for middleware-output-transform-* actions', () => {
    const action_stub = sinon.stub()
      .returns(Promise.resolve({
        statusCode: 200,
        messages: {
          foo: 'bar'
        }
      }));

    requireMock('openwhisk', () => ({
      actions: {
        invoke: action_stub
      }
    }));

    const config = {
      messages: {
        action: {
          name: 'packages/action'
        }
      }
    };

    const payload = {}

    requireMock.reRequire('openwhisk');
    return requireMock.reRequire('./index').main({ payload, config }).then(result => {      
      chai.expect(action_stub.callCount).to.equal(1);
      chai.expect(action_stub.getCall(0).args[0].name).to.equal('packages/action');

      chai.expect(result.statusCode).to.equal(200);
      chai.expect(result.payload.transient_context.output.transform.messages.foo).to.equal('bar');
    });
  });

  it('returns an error if messages were not fetched', () => {
    const action_stub = sinon.stub()
      .returns(Promise.reject({
        statusCode: 500
      }));

    requireMock('openwhisk', () => ({
      actions: {
        invoke: action_stub
      }
    }));

    const config = {
      messages: {
        action: {
          name: 'packages/action'
        }
      }
    };

    const payload = {}

    requireMock.reRequire('openwhisk');
    return requireMock.reRequire('./index').main({ payload, config }).then(result => {      
      chai.expect(true).to.be.false;
    }).catch(result => {
      chai.expect(action_stub.callCount).to.equal(1);
      chai.expect(result.statusCode).to.equal(503);
      chai.expect(result.error.parameters.error.statusCode).to.equal(500);
    });
  });

  it('returns an error if an exception occurs', () => {
    const action_stub = sinon.stub()
      .throws();

    requireMock('openwhisk', () => ({
      actions: {
        invoke: action_stub
      }
    }));

    const config = {
      messages: {
        action: {
          name: 'packages/action'
        }
      }
    };

    const payload = {}

    requireMock.reRequire('openwhisk');
    return requireMock.reRequire('./index').main({ payload, config }).then(result => {      
      chai.expect(true).to.be.false;
    }).catch(result => {
      chai.expect(action_stub.callCount).to.equal(1);
      chai.expect(result.statusCode).to.equal(500);
    });
  });
});
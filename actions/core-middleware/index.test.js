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
});
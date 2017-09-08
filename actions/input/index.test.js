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
describe('input', () => {
  it('returns the response of a input-connector if connector matches the request ...and calls the middleware processor', () => {
    // create stubs for actual functions
    const invokeStub = sinon.stub()
      .onCall(0).returns(Promise.resolve({
        statusCode: 422
      }))
      .onCall(1).returns(Promise.resolve({
        statusCode: 200,
        payload: {
          id: '12345',
          input: {
            channel: 'testchannel',
            user: 'foo',
            message: 'lorem ipsum'
          }
        },
        response: {
          statusCode: 200,
          body: { ok: 'ok' }
        }
      }))
      .onCall(2).returns(Promise.resolve());

    // mock openwhisk action calls to return successful results
    requireMock('openwhisk', () => ({
      actions: {
        invoke: invokeStub
      }
    }));

    // sample configuration used for the test
    const config = {
      connectors: {
        input: [
          {
            channel: 'channel_00_name',
            action: 'package/action_00',
            parameters: {}
          },
          {
            channel: 'channel_01_name',
            action: 'package/action_01',
            parameters: {}
          },
          {
            channel: 'channel_02_name',
            action: 'package/action_02',
            parameters: {}
          }
        ]
      },
      openwhisk: {
        package: 'testpackage'
      }
    }

    return requireMock.reRequire('./index').main({ __ow_method: 'get', __ow_path: '/', config })
      .then(result => {
        chai.expect(result.statusCode).to.equal(200);
        chai.expect(invokeStub.getCall(0).args[0].name).to.equal(config.connectors.input[0].action);
        chai.expect(invokeStub.getCall(1).args[0].name).to.equal(config.connectors.input[1].action);
        chai.expect(invokeStub.getCall(2).args[0].name).to.equal(`${config.openwhisk.package}/middleware`);
        chai.expect(invokeStub.getCall(2).args[0].params.payload.id).to.equal('12345');
        chai.expect(invokeStub.getCall(2).args[0].params.payload.input.message).to.equal('lorem ipsum');
      });
  });

  it('returns the response of a input-connector also if no response body is provided', () => {
    // create stubs for actual functions
    const invokeStub = sinon.stub()
      .returns(Promise.resolve({
        statusCode: 200,
        payload: {
          id: '12345',
          input: {
            channel: 'testchannel',
            user: 'foo',
            message: 'lorem ipsum'
          }
        },
        response: {
          statusCode: 200
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
      connectors: {
        input: [
          {
            channel: 'channel_00_name',
            action: 'package/action_00',
            parameters: {}
          }
        ]
      },
      openwhisk: {
        package: 'testpackage'
      }
    }

    return requireMock.reRequire('./index').main({ __ow_method: 'get', __ow_path: '/', config })
      .then(result => {
        chai.expect(result.statusCode).to.equal(200);
        chai.expect(invokeStub.getCall(0).args[0].name).to.equal(config.connectors.input[0].action);
        chai.expect(invokeStub.getCall(1).args[0].name).to.equal(`${config.openwhisk.package}/middleware`);
      });
  });

  it('returns 404 if no valid input connector was found', () => {
    // create stubs for actual functions
    const invokeStub = sinon.stub()
      .returns(Promise.resolve({
        statusCode: 422
      }));

    // mock openwhisk action calls to return successful results
    requireMock('openwhisk', () => ({
      actions: {
        invoke: invokeStub
      }
    }));

    // sample configuration used for the test
    const config = {
      connectors: {
        input: [
          {
            channel: 'channel_00_name',
            action: 'package/action_00',
            parameters: {}
          }
        ]
      }
    }

    return requireMock.reRequire('./index').main({ __ow_method: 'get', __ow_path: '/', config })
      .then(result => {
        chai.expect(result.statusCode).to.equal(404);
        chai.expect(invokeStub.getCall(0).args[0].name).to.equal(config.connectors.input[0].action);
      });
  });
});
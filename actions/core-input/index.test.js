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
describe('core-input', () => {
  it('returns the response of a input-connector if connector matches the request ...and calls the middleware processor', () => {
    // create stubs for actual functions
    const invokeStub = sinon.stub()
      .onCall(0).returns(Promise.resolve({
        statusCode: 422
      }))
      .onCall(1).returns(Promise.resolve({
        statusCode: 200,
        input: {
          user: 'foo',
          message: 'lorem ipsum'
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
        console.log(JSON.stringify(invokeStub.getCall(2).args[0].params.payload));
        chai.expect(result.statusCode).to.equal(200);
        chai.expect(invokeStub.getCall(0).args[0].name).to.equal(config.connectors.input[0].action);
        chai.expect(invokeStub.getCall(1).args[0].name).to.equal(config.connectors.input[1].action);
        chai.expect(invokeStub.getCall(2).args[0].name).to.equal(`${config.openwhisk.package}/core-middleware`);
        chai.expect(invokeStub.getCall(2).args[0].params.payload.id).to.exist;
        chai.expect(invokeStub.getCall(2).args[0].params.payload.input.channel).to.equal('channel_01_name');
        chai.expect(invokeStub.getCall(2).args[0].params.payload.input.message).to.equal('lorem ipsum');
      });
  });

  it('calls the middleware processor for each message returned - input can also be an array', () => {
    // create stubs for actual functions
    const invokeStub = sinon.stub()
      .onCall(0).returns(Promise.resolve({
        statusCode: 422
      }))
      .onCall(1).returns(Promise.resolve({
        statusCode: 200,
        input: [
          {
            user: 'foo',
            message: 'lorem ipsum'
          },
          {
            user: 'bar',
            message: 'dolor sit amet'
          }
        ],
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
        chai.expect(invokeStub.getCall(2).args[0].name).to.equal(`${config.openwhisk.package}/core-middleware`);
        chai.expect(invokeStub.getCall(2).args[0].params.payload.id).to.exist;
        chai.expect(invokeStub.getCall(2).args[0].params.payload.input.channel).to.equal('channel_01_name');
        chai.expect(invokeStub.getCall(2).args[0].params.payload.input.message).to.equal('lorem ipsum');

        chai.expect(invokeStub.getCall(3).args[0].name).to.equal(`${config.openwhisk.package}/core-middleware`);
        chai.expect(invokeStub.getCall(3).args[0].params.payload.id).to.exist;
        chai.expect(invokeStub.getCall(3).args[0].params.payload.input.channel).to.equal('channel_01_name');
        chai.expect(invokeStub.getCall(3).args[0].params.payload.input.message).to.equal('dolor sit amet');
      });
  });

  it('calls the middleware processor for each message returned - input can also be an object', () => {
    // create stubs for actual functions
    const invokeStub = sinon.stub()
      .onCall(0).returns(Promise.resolve({
        statusCode: 422
      }))
      .onCall(1).returns(Promise.resolve({
        statusCode: 200,
        input: {
          user: 'foo',
          message: {
            action: 'foo'
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
        chai.expect(invokeStub.getCall(2).args[0].name).to.equal(`${config.openwhisk.package}/core-middleware`);
        chai.expect(invokeStub.getCall(2).args[0].params.payload.id).to.exist;
        chai.expect(invokeStub.getCall(2).args[0].params.payload.input.channel).to.equal('channel_01_name');
        chai.expect(invokeStub.getCall(2).args[0].params.payload.input.message.action).to.equal('foo');
      });
  });

  it('returns the response of a input-connector also if no response body is provided', () => {
    // create stubs for actual functions
    const invokeStub = sinon.stub()
      .returns(Promise.resolve({
        statusCode: 200,
        input: {
          user: 'foo',
          message: 'lorem ipsum'
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
        chai.expect(invokeStub.getCall(1).args[0].name).to.equal(`${config.openwhisk.package}/core-middleware`);
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

  it('returns the response of the connector and stops processing on statusCode 204', () => {
    // create stubs for actual functions
    const invokeStub = sinon.stub()
      .returns(Promise.resolve({
        statusCode: 204,
        response: {
          statusCode: 200,
          body: 'Hello'
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
      }
    }

    return requireMock.reRequire('./index').main({ __ow_method: 'get', __ow_path: '/', config })
      .then(result => {
        chai.expect(result.statusCode).to.equal(200);
        chai.expect(result.body).to.equal('Hello');
      });
  });
});
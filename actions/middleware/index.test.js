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
describe('middleware', () => {
  it('calls all configured middleware components', () => {
    // create stubs for actual functions
    const invokeStub = sinon.stub()
      .returns(Promise.resolve({
        statusCode: 200,
        payload: {
          id: '123',
          input: {
            channel: 'facebook',
            user: '1234',
            message: 'foo'
          },
          conversationcontext: {
            user: {
              id: '1234',
              'facebook_id': '123456'
            }
          }
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
      middleware: [
        {
          action: 'package/action_00'
        },
        {
          action: 'package/action_01'
        }
      ]
    }

    const payload = {
      id: '12345',
      input: {
        channel: 'facebook',
        user: '1234',
        message: 'foo'
      }
    }

    return requireMock.reRequire('./index').main({ payload, config })
      .then(result => {
        chai.expect(result.result).to.have.lengthOf(2);
      });
  });

  it('stops processing if one middleware does not return statusCode 200', () => {
    // create stubs for actual functions
    const invokeStub = sinon.stub()
      .onCall(0).returns(Promise.resolve({
        statusCode: 301,
        payload: {
          id: '123',
          input: {
            channel: 'facebook',
            user: '1234',
            message: 'foo'
          }
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
      middleware: [
        {
          action: 'package/action_00'
        },
        {
          action: 'package/action_01'
        }
      ]
    }

    const payload = {
      id: '123',
      input: {
        channel: 'facebook',
        user: '1234',
        message: 'foo'
      }
    }

    return requireMock.reRequire('./index').main({ payload, config })
      .then(result => {
        chai.expect(result.result).to.have.lengthOf(1);
      });
  });

  it('stops and returns an error if an action returns an invalid response', () => {
    // create stubs for actual functions
    const invokeStub = sinon.stub()
      .onCall(0).returns(Promise.resolve({
        statusCode: 200,
        payload: {
          id: '1234',
          input: {
            channel: 'facebook',
            user: '1234',
            message: 'foo'
          }
        }
      }))
      .onCall(1).returns(Promise.resolve({}));

    // mock openwhisk action calls to return successful results
    requireMock('openwhisk', () => ({
      actions: {
        invoke: invokeStub
      }
    }));

    // sample configuration used for the test
    const config = {
      middleware: [
        {
          action: 'package/action_00'
        },
        {
          action: 'package/action_01'
        }
      ]
    }

    const payload = {
      id: '1234',
      input: {
        channel: 'facebook',
        user: '1234',
        message: 'foo'
      }
    }

    return requireMock.reRequire('./index').main({ payload, config })
      .then(result => {
        chai.expect(result).to.have.property('error');
        chai.expect(result.statusCode).to.equal(400);
        chai.expect(result.error.message).to.contain('package/action_01');
      });
  });
});
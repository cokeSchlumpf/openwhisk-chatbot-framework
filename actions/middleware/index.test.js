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
      .onCall(0).returns(Promise.resolve({
        statusCode: 200,
        result: [
          {
            type: 'user',
            facebook_id: 1234,
            name: 'Michael Wellner'
          }
        ]
      }))
      .onCall(1).returns(Promise.resolve({
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
              _id: '1234',
              'facebook_id': '123456'
            }
          }
        }
      }))
      .onCall(2).returns(Promise.resolve({
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
              _id: '1234',
              'facebook_id': '123456'
            }
          }
        }
      }))
      .onCall(3).returns(Promise.resolve({

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
      ],
      openwhisk: {
        package: 'testpackage'
      }
    }

    const payload = {
      id: '12345',
      input: {
        channel: 'facebook',
        user: '1234',
        message: 'foo'
      }
    }

    requireMock.reRequire('openwhisk');
    requireMock.reRequire('serverless-botpack-lib');

    return requireMock.reRequire('./index').main({ payload, config })
      .then(result => {
        chai.expect(invokeStub.getCall(0).args[0].params.operation).to.equal('read');
        chai.expect(invokeStub.getCall(0).args[0].params.selector.type).to.equal('user');
        chai.expect(invokeStub.getCall(0).args[0].params.selector.facebook_id).to.equal('1234');
        chai.expect(result.result).to.have.lengthOf(2);
      });
  });

  it('stops processing if middleware returns 203', () => {
    // create stubs for actual functions
    const invokeStub = sinon.stub()
      .onCall(0).returns(Promise.resolve({
        statusCode: 200,
        result: [
          {
            type: 'user',
            facebook_id: 1234,
            name: 'Michael Wellner'
          }
        ]
      }))
      .onCall(1).returns(Promise.resolve({
        statusCode: 204,
        payload: {
          id: '123',
          input: {
            channel: 'facebook',
            user: '1234',
            message: 'foo'
          }
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
      middleware: [
        {
          action: 'package/action_00'
        },
        {
          action: 'package/action_01'
        }
      ],
      openwhisk: {
        package: 'testpackage'
      }
    }

    const payload = {
      id: '123',
      input: {
        channel: 'facebook',
        user: '1234',
        message: 'foo'
      }
    }

    requireMock.reRequire('openwhisk');
    requireMock.reRequire('serverless-botpack-lib');

    return requireMock.reRequire('./index').main({ payload, config })
      .then(result => {
        chai.expect(result.statusCode).to.equal(200);
        chai.expect(result.result).to.have.lengthOf(1);
      });
  });

  it('stops and returns an error if an action returns an invalid response', () => {
    // create stubs for actual functions
    const invokeStub = sinon.stub()
      .onCall(0).returns(Promise.resolve({
        statusCode: 200,
        result: [
          {
            type: 'user',
            facebook_id: 1234,
            name: 'Michael Wellner'
          }
        ]
      }))
      .onCall(1).returns(Promise.resolve({
        foo: 'bar'
      }))
      .onCall(2).returns(Promise.resolve())
      .onCall(3).returns(Promise.resolve())
      .onCall(4).returns(Promise.resolve());

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

    requireMock.reRequire('openwhisk');
    requireMock.reRequire('serverless-botpack-lib');

    return requireMock.reRequire('./index').main({ payload, config })
      .then(result => {
        chai.expect(result).to.have.property('error');
        chai.expect(result.statusCode).to.equal(400);
        chai.expect(result.error.message).to.contain('package/action_00');
      });
  });

  it('creates a new user during content context enrichment if user id is not known.', () => {
    // create stubs for actual functions
    const invokeStub = sinon.stub()
      .onCall(0).returns(Promise.resolve({
        statusCode: 200,
        result: []
      }))
      .onCall(1).returns(Promise.resolve({
        statusCode: 201,
        result: {
          type: 'user',
          _id: '123456789',
          facebook_id: '1234'
        }
      }))
      .onCall(2).returns(Promise.resolve({
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
              _id: '1234',
              'facebook_id': '123456'
            }
          }
        }
      }))
      .onCall(3).returns(Promise.resolve())
      .onCall(4).returns(Promise.resolve());

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
        }
      ],
      openwhisk: {
        package: 'testpackage'
      }
    }

    const payload = {
      id: '1234',
      input: {
        channel: 'facebook',
        user: '1234',
        message: 'foo'
      }
    }

    requireMock.reRequire('openwhisk');
    requireMock.reRequire('serverless-botpack-lib');

    return requireMock.reRequire('./index').main({ payload, config })
      .then(result => {
        chai.expect(result.statusCode).to.equal(200);
        chai.expect(result.result).to.have.lengthOf(1);
      });
  });
});
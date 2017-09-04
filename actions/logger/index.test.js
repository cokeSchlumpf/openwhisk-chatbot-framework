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
describe('logger', () => {
  it('inserts log into the database', () => {
    // create stubs for actual functions
    const invokeStub = sinon.stub()
      .returns(Promise.resolve({
        statusCode: 200,
        result: {}
      }));

    // mock openwhisk action calls to return successful results
    requireMock('openwhisk', () => ({
      actions: {
        invoke: invokeStub
      }
    }));

    // sample configuration used for the test
    const config = {
      logger: {
        level: 'INFO'
      }
    };

    return requireMock.reRequire('./index').main({
      message: 'A test message',
      level: 'ERROR',
      config
    })
      .then(result => {
        console.log(result);
      });
  });
});
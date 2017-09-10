const _ = require('lodash');
const chai = require('chai');
const requireMock = require('mock-require');
const sinon = require('sinon');

describe('core-transform', () => {
  it('transforms an intent into a specific message', () => {
    // create stubs for openwhisk calls
    const invokeStub = sinon.stub()
      .returns(Promise.resolve({
        statusCode: 200,
        result: []
      }));

    // mock openwhisk action calls to return successful results
    requireMock('openwhisk', () => ({
      actions: {
        invoke: invokeStub
      }
    }));

    const config = {
      messages: {
        '#hello': {
          text: 'Hello {{{name}}}'
        }
      },
      openwhisk: {
        package: 'testpackage'
      }
    }

    const payload = {
      id: '123456',
      conversationcontext: {
        user: {
          _id: '1234abcd',
          testchannel_id: 'abcdefg'
        }
      },
      output: {
        channel: 'testchannel',
        intent: '#hello',
        user: 'abcdefg',
        context: {
          name: 'Egon'
        }
      }
    }

    requireMock.reRequire('openwhisk');
    requireMock.reRequire('serverless-botpack-lib');

    return requireMock.reRequire('./index').main({ payload, config })
      .then(result => {
        chai.expect(result.result.output.message).to.equal('Hello Egon');
      });
  });

  it('selects the translation based on channel and locale', () => {
    // create stubs for openwhisk calls
    const invokeStub = sinon.stub()
      .returns(Promise.resolve({
        statusCode: 200,
        result: []
      }));

    // mock openwhisk action calls to return successful results
    requireMock('openwhisk', () => ({
      actions: {
        invoke: invokeStub
      }
    }));

    const config = {
      messages: {
        '#hello': {
          DE_de: {
            testchannel: {
              text: 'Hallo {{{name}}} auf dem Testchannel!'
            }
          },
          text: 'Hello {{{name}}}'
        }
      },
      openwhisk: {
        package: 'testpackage'
      }
    }

    const payload = {
      id: '123456',
      conversationcontext: {
        user: {
          _id: '1234abcd',
          testchannel_id: 'abcdefg',
          locale: 'DE_de'
        }
      },
      output: {
        channel: 'testchannel',
        user: 'abcdefg',
        intent: '#hello',
        context: {
          name: 'Egon'
        }
      }
    }

    requireMock.reRequire('openwhisk');
    requireMock.reRequire('serverless-botpack-lib');

    return requireMock.reRequire('./index').main({ payload, config })
      .then(result => {
        chai.expect(result.result.output.message).to.equal('Hallo Egon auf dem Testchannel!');
      });
  });
});
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
      messages: [
        {
          '#hello': true,
          '#foo': true,
          value: {
            text: 'Hello {{{output.context.name}}}'
          }
        },
        {
          '#hello': true,
          value: {
            text: 'Not such a good ranking'
          }
        }
      ],
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
        intent: '#hello #foo',
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
      messages: [
        {
          '#hello': true,
          value: [
            {
              '#foo': true,
              value: {
                DE_de: {
                  testchannel: {
                    text: 'Hallo {{{output.context.name}}} auf dem Testchannel!'
                  }
                },
                text: 'Hello {{{output.context.name}}}'
              }
            }
          ]
        }
      ],
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
        intent: '#hello #foo',
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

  it('transforms an complex object intent into the complex object with rendered messages', () => {
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
      messages: [
        {
          '#hello': true,
          value: {
            text: {
              seq: [
                'Hello {{output.context.name}}',
                { typing_on: true },
                { wait: '5s' },
                { typing_off: true }
              ]
            }
          }
        },
        {
          '#foo': true,
          value: {
            text: {
              seq: [
                'Ciao {{output.context.name}}',
                { typing_on: true },
                { wait: '5s' },
                { typing_off: true }
              ]
            }
          }
        }
      ],
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
        chai.expect(result.result.output.message[0]).to.equal('Hello Egon');
        chai.expect(result.result.output.message[1].typing_on).to.be.true;
        chai.expect(result.result.output.message[2].wait).to.equal('5s');
        chai.expect(result.result.output.message[3].typing_off).to.be.true;
      });
  });

  it('retrieves the messages from a action if defined in the configuration.', () => {
    // create stubs for openwhisk calls
    const invokeStub = sinon.stub()
      .onCall(0).returns(Promise.resolve(
        [
          {
            '#hello': true,
            value: {
              text: {
                seq: [
                  'Hello {{output.context.name}}',
                  { typing_on: true },
                  { wait: '5s' },
                  { typing_off: true }
                ]
              }
            }
          },
          {
            '#foo': true,
            value: {
              text: {
                seq: [
                  'Ciao {{output.context.name}}',
                  { typing_on: true },
                  { wait: '5s' },
                  { typing_off: true }
                ]
              }
            }
          }
        ]
      ));

    // mock openwhisk action calls to return successful results
    requireMock('openwhisk', () => ({
      actions: {
        invoke: invokeStub
      }
    }));

    const config = {
      messages: {
        "$action": 'foo/bar'
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
        chai.expect(invokeStub.getCall(0).args[0].name).to.equal('foo/bar');

        chai.expect(result.result.output.message[0]).to.equal('Hello Egon');
        chai.expect(result.result.output.message[1].typing_on).to.be.true;
        chai.expect(result.result.output.message[2].wait).to.equal('5s');
        chai.expect(result.result.output.message[3].typing_off).to.be.true;
      });
  });
});
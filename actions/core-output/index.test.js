const _ = require('lodash');
const chai = require('chai');
const requireMock = require('mock-require');
const sinon = require('sinon');

describe('core-output', () => {
  it('transforms the bot intent, calls the output connector and persists the context', () => {
    // create stubs for actual functions
    const invokeStub = sinon.stub()
      .onCall(0).returns(Promise.resolve({
        statusCode: 200,
        result: {
          output: {
            message: 'This is the message'
          }
        }
      }))
      .onCall(1).returns(Promise.resolve({
        statusCode: 200
      }))
      .onCall(2).returns(Promise.resolve({
        statusCode: 200,
        result: {
          id: '12345',
          _id: 'foobar',
          _rev: 'aAaBbB',
          input: {
            channel: 'facebook',
            user: '1234',
            message: 'foo'
          },
          conversationcontext: {
            user: {
              _id: 'abcd',
              facebook_id: '1234',
              name: 'Egon Olsen'
            },
            foo: 'bar'
          },
          output: {
            channel: 'facebook',
            user: '1234',
            intent: '#hello',
            message: 'This is the message'
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
      connectors: {
        output: [
          {
            channel: 'facebook',
            action: 'testpackage/ouput',
            parameters: {
              test: 'foo'
            }
          }
        ]
      },
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
      },
      conversationcontext: {
        user: {
          _id: 'abcd',
          facebook_id: '1234',
          name: 'Egon Olsen'
        },
        foo: 'bar'
      },
      output: {
        channel: 'facebook',
        user: '1234',
        intent: '#hello'
      }
    }

    const params = {
      config,
      payload
    }

    requireMock.reRequire('openwhisk');
    requireMock.reRequire('serverless-botpack-lib');

    return requireMock.reRequire('./index').main(params)
      .then(result => {
        chai.expect(invokeStub.getCall(0).args[0].name).to.equal('testpackage/core-transform');
        chai.expect(invokeStub.getCall(0).args[0].params.payload.output.intent).to.exist;

        chai.expect(invokeStub.getCall(1).args[0].name).to.equal('testpackage/ouput');
        chai.expect(invokeStub.getCall(1).args[0].params.payload.output.message).to.exist;

        chai.expect(invokeStub.getCall(2).args[0].name).to.equal('testpackage/core-contextpersist');
        chai.expect(invokeStub.getCall(2).args[0].params.payload).to.exist;
        chai.expect(invokeStub.getCall(2).args[0].params.payload.output.message).to.equal('This is the message');

        chai.expect(result.statusCode).to.equal(200);
        chai.expect(result.result.id).to.equal('12345');
        chai.expect(JSON.stringify(result.result.input)).to.equal(JSON.stringify(params.payload.input));
        chai.expect(result.result.conversationcontext.user.facebook_id).to.equal('1234');
        chai.expect(result.result.conversationcontext.user._id).to.equal('abcd');
        chai.expect(result.result.conversationcontext.user.name).to.equal('Egon Olsen');
        chai.expect(result.result.output.message).to.equal('This is the message');
      });
  });

  it('intent and channel can also be passed via parameter', () => {
    // create stubs for actual functions
    const invokeStub = sinon.stub()
      .onCall(0).returns(Promise.resolve({
        statusCode: 200,
        result: {
          output: {
            message: 'This is the message'
          }
        }
      }))
      .onCall(1).returns(Promise.resolve({
        statusCode: 200
      }))
      .onCall(2).returns(Promise.resolve({
        statusCode: 200,
        result: {
          id: '12345',
          _id: 'foobar',
          _rev: 'aAaBbB',
          input: {
            channel: 'facebook',
            user: '1234',
            message: 'foo'
          },
          conversationcontext: {
            user: {
              _id: 'abcd',
              facebook_id: '1234',
              name: 'Egon Olsen'
            },
            foo: 'bar'
          },
          output: {
            channel: 'facebook',
            user: '1234',
            intent: '#hello',
            message: 'This is the message'
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
      connectors: {
        output: [
          {
            channel: 'facebook',
            action: 'testpackage/ouput',
            parameters: {
              test: 'foo'
            }
          }
        ]
      },
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
      },
      conversationcontext: {
        user: {
          _id: 'abcd',
          facebook_id: '1234',
          name: 'Egon Olsen'
        },
        foo: 'bar'
      }
    }

    const params = {
      config,
      payload,
      intent: '#hello'
    }

    requireMock.reRequire('openwhisk');
    requireMock.reRequire('serverless-botpack-lib');

    return requireMock.reRequire('./index').main(params)
      .then(result => {
        chai.expect(invokeStub.getCall(0).args[0].name).to.equal('testpackage/core-transform');
        chai.expect(invokeStub.getCall(0).args[0].params.payload.output.intent).to.equal('#hello');

        chai.expect(invokeStub.getCall(1).args[0].name).to.equal('testpackage/ouput');
        chai.expect(invokeStub.getCall(1).args[0].params.payload.output.message).to.exist;

        chai.expect(invokeStub.getCall(2).args[0].name).to.equal('testpackage/core-contextpersist');
        chai.expect(invokeStub.getCall(2).args[0].params.payload).to.exist;
        chai.expect(invokeStub.getCall(2).args[0].params.payload.output.message).to.equal('This is the message');

        chai.expect(result.statusCode).to.equal(200);
        chai.expect(result.result.id).to.equal('12345');
        chai.expect(JSON.stringify(result.result.input)).to.equal(JSON.stringify(params.payload.input));
        chai.expect(result.result.conversationcontext.user.facebook_id).to.equal('1234');
        chai.expect(result.result.conversationcontext.user._id).to.equal('abcd');
        chai.expect(result.result.conversationcontext.user.name).to.equal('Egon Olsen');
        chai.expect(result.result.output.message).to.equal('This is the message');
      });
  });

  it('returns an error if the output connector does not exist/ returns an error', () => {
    // create stubs for actual functions
    const invokeStub = sinon.stub()
      .onCall(0).returns(Promise.resolve({
        statusCode: 200,
        result: {
          output: {
            message: 'This is the message'
          }
        }
      }))
      .onCall(1).returns(Promise.resolve({
        statusCode: 400,
        error: {
          message: 'bla bla bla'
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
        output: [
          {
            channel: 'facebook',
            action: 'testpackage/ouput',
            parameters: {
              test: 'foo'
            }
          }
        ]
      },
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
      },
      conversationcontext: {
        user: {
          _id: 'abcd',
          facebook_id: '1234',
          name: 'Egon Olsen'
        },
        foo: 'bar'
      }
    }

    const params = {
      config,
      payload,
      intent: '#hello'
    }

    requireMock.reRequire('openwhisk');
    requireMock.reRequire('serverless-botpack-lib');

    return requireMock.reRequire('./index').main(params)
      .then(result => {
        chai.expect(invokeStub.getCall(0).args[0].name).to.equal('testpackage/core-transform');
        chai.expect(invokeStub.getCall(0).args[0].params.payload.output.intent).to.equal('#hello');

        chai.expect(invokeStub.getCall(1).args[0].name).to.equal('testpackage/ouput');
        chai.expect(invokeStub.getCall(1).args[0].params.payload.output.message).to.exist;

        chai.expect(result.statusCode).to.equal(503);
      });
  });

  it('returns an error if the output connector for the channel is not defined.', () => {
    // create stubs for actual functions
    const invokeStub = sinon.stub()
      .onCall(0).returns(Promise.resolve({
        statusCode: 200,
        result: {
          output: {
            message: 'This is the message'
          }
        }
      }))
      .onCall(1).returns(Promise.reject('error message'));

    // mock openwhisk action calls to return successful results
    requireMock('openwhisk', () => ({
      actions: {
        invoke: invokeStub
      }
    }));

    // sample configuration used for the test
    const config = {
      connectors: {
        output: [
          {
            channel: 'facebook',
            action: 'testpackage/ouput',
            parameters: {
              test: 'foo'
            }
          }
        ]
      },
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
      },
      conversationcontext: {
        user: {
          _id: 'abcd',
          facebook_id: '1234',
          name: 'Egon Olsen'
        },
        foo: 'bar'
      }
    }

    const params = {
      config,
      payload,
      intent: '#hello'
    }

    requireMock.reRequire('openwhisk');
    requireMock.reRequire('serverless-botpack-lib');

    return requireMock.reRequire('./index').main(params)
      .then(result => {
        chai.expect(invokeStub.getCall(0).args[0].name).to.equal('testpackage/core-transform');
        chai.expect(invokeStub.getCall(0).args[0].params.payload.output.intent).to.equal('#hello');
        
        chai.expect(result.statusCode).to.equal(503);
        chai.expect(result.error.cause).to.exist;
      });
  });
});
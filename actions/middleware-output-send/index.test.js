const _ = require('lodash');
const chai = require('chai');
const requireMock = require('mock-require');
const sinon = require('sinon');

describe('middleware-output-send', () => {
  it('calls the output connector for messages defined in the context', () => {
    const action_stub = sinon.stub()
      .returns(Promise.resolve({
        statusCode: 200
      }));

    requireMock('openwhisk', () => ({
      actions: {
        invoke: action_stub
      }
    }));

    const config = {
      connectors: {
        output: [
          {
            channel: 'facebook',
            action: 'channels-facebook-output'
          },
          {
            channel: 'foo',
            action: 'channels-foo-output'
          }
        ]
      }
    };

    const payload = {
      conversationcontext: {
        user: {
          id: '12345',
          facebook_id: 'abcdef'
        }
      },
      context: {
        output: {
          channel: 'facebook',
          messages: 'Hello World!'
        }
      }
    }

    requireMock.reRequire('openwhisk');
    return requireMock.reRequire('./index').main({ payload, config }).then(result => {
      chai.expect(action_stub.callCount).to.equal(1);
      chai.expect(action_stub.getCall(0).args[0].name).to.equal('channels-facebook-output');
      chai.expect(action_stub.getCall(0).args[0].params.message).to.equal('Hello World!');
      chai.expect(action_stub.getCall(0).args[0].params.user).to.equal('abcdef');

      chai.expect(result.statusCode).to.equal(200);
      chai.expect(_.size(result.payload.output)).to.equal(1);
      chai.expect(result.payload.output[0].channel).to.equal('facebook');
      chai.expect(_.size(result.payload.output[0].sent)).to.equal(1);
      chai.expect(result.payload.output[0].sent[0].message).to.equal('Hello World!');
    });
  });

  it('multiple messages are also allowed', () => {
    const action_stub = sinon.stub()
      .returns(Promise.resolve({
        statusCode: 200
      }));

    requireMock('openwhisk', () => ({
      actions: {
        invoke: action_stub
      }
    }));

    const config = {
      connectors: {
        output: [
          {
            channel: 'facebook',
            action: 'channels-facebook-output'
          },
          {
            channel: 'foo',
            action: 'channels-foo-output'
          }
        ]
      }
    };

    const payload = {
      conversationcontext: {
        user: {
          id: '12345',
          facebook_id: 'abcdef'
        }
      },
      context: {
        output: {
          channel: 'facebook',
          messages: [
            'Message 1',
            'Message 2'
          ]
        }
      }
    }

    requireMock.reRequire('openwhisk');
    return requireMock.reRequire('./index').main({ payload, config }).then(result => {
      chai.expect(action_stub.callCount).to.equal(2);
      chai.expect(action_stub.getCall(0).args[0].name).to.equal('channels-facebook-output');
      chai.expect(action_stub.getCall(0).args[0].params.message).to.equal('Message 1');
      chai.expect(action_stub.getCall(0).args[0].params.user).to.equal('abcdef');

      chai.expect(action_stub.getCall(1).args[0].name).to.equal('channels-facebook-output');
      chai.expect(action_stub.getCall(1).args[0].params.message).to.equal('Message 2');
      chai.expect(action_stub.getCall(1).args[0].params.user).to.equal('abcdef');

      chai.expect(result.statusCode).to.equal(200);
      chai.expect(_.size(result.payload.output)).to.equal(1);
      chai.expect(result.payload.output[0].channel).to.equal('facebook');
      chai.expect(_.size(result.payload.output[0].sent)).to.equal(2);
      chai.expect(result.payload.output[0].sent[0].message).to.equal('Message 1');
      chai.expect(result.payload.output[0].sent[1].message).to.equal('Message 2');
    });
  });

  it('returns an error on missing input', () => {
    const config = {
      connectors: {
        output: [
          {
            channel: 'foo',
            action: 'channels-foo-output'
          }
        ]
      }
    };

    const payload = {
      conversationcontext: {
        user: {
          id: '12345',
          facebook_id: 'abcdef'
        }
      },
      context: {
        output: {
          channel: 'facebook',
          messages: [
            'Message 1',
            'Message 2'
          ]
        }
      }
    }

    requireMock.reRequire('openwhisk');
    return requireMock.reRequire('./index').main({ payload, config }).then(result => {
      chai.expect(true).to.be.false;
    }).catch(error => {
      chai.expect(error.statusCode).to.equal(404);
      chai.expect(JSON.stringify(error.payload)).to.equal(JSON.stringify(payload));
    });
  });

  it('returns an error if output connector returns an error, but already sent messages are in updated payload', () => {
    const action_stub = sinon.stub()
      .onCall(0).returns(Promise.resolve({
        statusCode: 200
      }))
      .onCall(1).returns(Promise.resolve({
        statusCode: 404
      }));

    requireMock('openwhisk', () => ({
      actions: {
        invoke: action_stub
      }
    }));

    const config = {
      connectors: {
        output: [
          {
            channel: 'facebook',
            action: 'channels-facebook-output'
          },
          {
            channel: 'foo',
            action: 'channels-foo-output'
          }
        ]
      }
    };

    const payload = {
      conversationcontext: {
        user: {
          id: '12345',
          facebook_id: 'abcdef'
        }
      },
      context: {
        output: {
          channel: 'facebook',
          messages: [
            'Message 1',
            'Message 2'
          ]
        }
      }
    }

    requireMock.reRequire('openwhisk');
    return requireMock.reRequire('./index').main({ payload, config }).then(result => {
      chai.expect(true).to.be.false;
    }).catch(result => {
      chai.expect(result.statusCode).to.equal(503);
      
      chai.expect(action_stub.callCount).to.equal(2);
      chai.expect(action_stub.getCall(0).args[0].name).to.equal('channels-facebook-output');
      chai.expect(action_stub.getCall(0).args[0].params.message).to.equal('Message 1');
      chai.expect(action_stub.getCall(0).args[0].params.user).to.equal('abcdef');

      chai.expect(action_stub.getCall(1).args[0].name).to.equal('channels-facebook-output');
      chai.expect(action_stub.getCall(1).args[0].params.message).to.equal('Message 2');
      chai.expect(action_stub.getCall(1).args[0].params.user).to.equal('abcdef');

      chai.expect(_.size(result.payload.output)).to.equal(1);
      chai.expect(result.payload.output[0].channel).to.equal('facebook');
      chai.expect(_.size(result.payload.output[0].sent)).to.equal(1);
    });
  });

  it('For one payload, the output connector can be called multiple times', () => {
    const action_stub = sinon.stub()
      .returns(Promise.resolve({
        statusCode: 200
      }));

    requireMock('openwhisk', () => ({
      actions: {
        invoke: action_stub
      }
    }));

    const config = {
      connectors: {
        output: [
          {
            channel: 'facebook',
            action: 'channels-facebook-output'
          },
          {
            channel: 'foo',
            action: 'channels-foo-output'
          }
        ]
      }
    };

    const payload = {
      conversationcontext: {
        user: {
          id: '12345',
          facebook_id: 'abcdef'
        }
      },
      context: {
        output: {
          channel: 'facebook',
          messages: 'Hello World!'
        }
      },
      output: [
        {
          channel: 'foo',
          sent: [
            { message: 'Previous message' }
          ]
        }
      ]
    }

    requireMock.reRequire('openwhisk');
    return requireMock.reRequire('./index').main({ payload, config }).then(result => {
      chai.expect(action_stub.callCount).to.equal(1);
      chai.expect(action_stub.getCall(0).args[0].name).to.equal('channels-facebook-output');
      chai.expect(action_stub.getCall(0).args[0].params.message).to.equal('Hello World!');
      chai.expect(action_stub.getCall(0).args[0].params.user).to.equal('abcdef');

      chai.expect(result.statusCode).to.equal(200);
      chai.expect(_.size(result.payload.output)).to.equal(2);
      chai.expect(result.payload.output[1].channel).to.equal('facebook');
      chai.expect(_.size(result.payload.output[1].sent)).to.equal(1);
      chai.expect(result.payload.output[1].sent[0].message).to.equal('Hello World!');
    });
  });

  it('a message can also be an object', () => {
    const action_stub = sinon.stub()
      .returns(Promise.resolve({
        statusCode: 200
      }));

    requireMock('openwhisk', () => ({
      actions: {
        invoke: action_stub
      }
    }));

    const config = {
      connectors: {
        output: [
          {
            channel: 'facebook',
            action: 'channels-facebook-output'
          },
          {
            channel: 'foo',
            action: 'channels-foo-output'
          }
        ]
      }
    };

    const payload = {
      conversationcontext: {
        user: {
          id: '12345',
          facebook_id: 'abcdef'
        }
      },
      context: {
        output: {
          channel: 'facebook',
          messages: {
            typing_on: true
          }
        }
      }
    }

    requireMock.reRequire('openwhisk');
    return requireMock.reRequire('./index').main({ payload, config }).then(result => {
      chai.expect(action_stub.callCount).to.equal(1);
      chai.expect(action_stub.getCall(0).args[0].name).to.equal('channels-facebook-output');
      chai.expect(action_stub.getCall(0).args[0].params.message.typing_on).to.be.true;
      chai.expect(action_stub.getCall(0).args[0].params.user).to.equal('abcdef');

      chai.expect(result.statusCode).to.equal(200);
      chai.expect(_.size(result.payload.output)).to.equal(1);
      chai.expect(result.payload.output[0].channel).to.equal('facebook');
      chai.expect(_.size(result.payload.output[0].sent)).to.equal(1);
      chai.expect(result.payload.output[0].sent[0].message.typing_on).to.be.true;
    });
  });

  it('an object with property wait will cause the process to pause for the given time before continue sending', () => {
    const action_stub = sinon.stub()
      .returns(Promise.resolve({
        statusCode: 200
      }));

    requireMock('openwhisk', () => ({
      actions: {
        invoke: action_stub
      }
    }));

    const config = {
      connectors: {
        output: [
          {
            channel: 'facebook',
            action: 'channels-facebook-output'
          },
          {
            channel: 'foo',
            action: 'channels-foo-output'
          }
        ]
      }
    };

    const payload = {
      conversationcontext: {
        user: {
          id: '12345',
          facebook_id: 'abcdef'
        }
      },
      context: {
        output: {
          channel: 'facebook',
          messages: [
            'Message 1',
            {
              wait: '3s'
            },
            'Message 2'
          ]
        }
      }
    }

    requireMock.reRequire('openwhisk');

    const start = (new Date()).getTime();

    return requireMock.reRequire('./index').main({ payload, config }).then(result => {
      const end = (new Date()).getTime();
      const operation_time = end - start;
      chai.expect(operation_time > 2000).to.be.true;
      chai.expect(action_stub.callCount).to.equal(2);
      chai.expect(action_stub.getCall(0).args[0].name).to.equal('channels-facebook-output');
      chai.expect(action_stub.getCall(0).args[0].params.message).to.equal('Message 1');
      chai.expect(action_stub.getCall(0).args[0].params.user).to.equal('abcdef');

      chai.expect(action_stub.getCall(1).args[0].name).to.equal('channels-facebook-output');
      chai.expect(action_stub.getCall(1).args[0].params.message).to.equal('Message 2')
      chai.expect(action_stub.getCall(1).args[0].params.user).to.equal('abcdef');

      chai.expect(result.statusCode).to.equal(200);
      chai.expect(_.size(result.payload.output)).to.equal(1);
      chai.expect(result.payload.output[0].channel).to.equal('facebook');
      chai.expect(_.size(result.payload.output[0].sent)).to.equal(3);
      chai.expect(result.payload.output[0].sent[0].message).to.equal('Message 1');
      chai.expect(result.payload.output[0].sent[1].message.wait).to.equal('3s');
      chai.expect(result.payload.output[0].sent[2].message).to.equal('Message 2');
    });
  }).timeout(5000);

  it('an object with property wait can also have additional action which are send to the connector', () => {
    const action_stub = sinon.stub()
      .returns(Promise.resolve({
        statusCode: 200
      }));

    requireMock('openwhisk', () => ({
      actions: {
        invoke: action_stub
      }
    }));

    const config = {
      connectors: {
        output: [
          {
            channel: 'facebook',
            action: 'channels-facebook-output'
          },
          {
            channel: 'foo',
            action: 'channels-foo-output'
          }
        ]
      }
    };

    const payload = {
      conversationcontext: {
        user: {
          id: '12345',
          facebook_id: 'abcdef'
        }
      },
      context: {
        output: {
          channel: 'facebook',
          messages: [
            'Message 1',
            {
              wait: '3s',
              typing_on: true
            },
            'Message 2'
          ]
        }
      }
    }

    requireMock.reRequire('openwhisk');

    const start = (new Date()).getTime();

    return requireMock.reRequire('./index').main({ payload, config }).then(result => {
      const end = (new Date()).getTime();
      const operation_time = end - start;
      chai.expect(operation_time > 2000).to.be.true;
      chai.expect(action_stub.callCount).to.equal(3);
      chai.expect(action_stub.getCall(0).args[0].name).to.equal('channels-facebook-output');
      chai.expect(action_stub.getCall(0).args[0].params.message).to.equal('Message 1');
      chai.expect(action_stub.getCall(0).args[0].params.user).to.equal('abcdef');

      chai.expect(action_stub.getCall(1).args[0].name).to.equal('channels-facebook-output');
      chai.expect(action_stub.getCall(1).args[0].params.message.typing_on).to.be.true;
      chai.expect(action_stub.getCall(1).args[0].params.message.wait).to.be.undefined;
      chai.expect(action_stub.getCall(1).args[0].params.user).to.equal('abcdef');

      chai.expect(action_stub.getCall(2).args[0].name).to.equal('channels-facebook-output');
      chai.expect(action_stub.getCall(2).args[0].params.message).to.equal('Message 2')
      chai.expect(action_stub.getCall(2).args[0].params.user).to.equal('abcdef');

      chai.expect(result.statusCode).to.equal(200);
      chai.expect(_.size(result.payload.output)).to.equal(1);
      chai.expect(result.payload.output[0].channel).to.equal('facebook');
      chai.expect(_.size(result.payload.output[0].sent)).to.equal(3);
      chai.expect(result.payload.output[0].sent[0].message).to.equal('Message 1');
      chai.expect(result.payload.output[0].sent[1].message.wait).to.equal('3s');
      chai.expect(result.payload.output[0].sent[1].message.typing_on).to.be.true;
      chai.expect(result.payload.output[0].sent[2].message).to.equal('Message 2');
    });
  }).timeout(5000);

  it('changes the payload if the output connector returns an response object; the current response object is send to the connector', () => {
    const action_stub = sinon.stub()
      .returns(Promise.resolve({
        statusCode: 200,
        response: {
          output: 'Huhu!'
        }
      }));

    requireMock('openwhisk', () => ({
      actions: {
        invoke: action_stub
      }
    }));

    const config = {
      connectors: {
        output: [
          {
            channel: 'facebook',
            action: 'channels-facebook-output'
          },
          {
            channel: 'foo',
            action: 'channels-foo-output'
          }
        ]
      }
    };

    const payload = {
      input: {
        channel: 'facebook'
      },
      conversationcontext: {
        user: {
          id: '12345',
          facebook_id: 'abcdef'
        }
      },
      context: {
        output: {
          messages: [
            'Hello World!',
            'HUHUU'
          ]
        }
      }
    }

    requireMock.reRequire('openwhisk');
    return requireMock.reRequire('./index').main({ payload, config }).then(result => {
      chai.expect(action_stub.callCount).to.equal(2);
      chai.expect(action_stub.getCall(0).args[0].name).to.equal('channels-facebook-output');
      chai.expect(action_stub.getCall(0).args[0].params.message).to.equal('Hello World!');
      chai.expect(action_stub.getCall(0).args[0].params.user).to.equal('abcdef');
      chai.expect(JSON.stringify(action_stub.getCall(0).args[0].params.response)).to.equal('{}');
      chai.expect(action_stub.getCall(0).args[0].params.payload.input.channel).to.equal('facebook');

      chai.expect(JSON.stringify(action_stub.getCall(1).args[0].params.response)).to.equal(JSON.stringify({ output: 'Huhu!' }));

      chai.expect(result.statusCode).to.equal(200);
      chai.expect(_.size(result.payload.output)).to.equal(1);
      chai.expect(result.payload.output[0].channel).to.equal('facebook');
      chai.expect(_.size(result.payload.output[0].sent)).to.equal(2);
      chai.expect(result.payload.output[0].sent[0].message).to.equal('Hello World!');
      chai.expect(result.payload.response.output).to.equal('Huhu!');
    });
  });
});
const _ = require('lodash');
const chai = require('chai');
const requireMock = require('mock-require');
const sinon = require('sinon');

describe('core-contextpersist', () => {
  it('it persists the payload, the conversation context and the user', () => {
    // create stubs for actual functions
    const invokeStub = sinon.stub()
      .onCall(0).returns(Promise.resolve({
        statusCode: 201,
        result: {
          _id: 'foobar',
          _rev: 'aAaBbB',
          id: '12345',
          input: {
            channel: 'facebook',
            user: '1234',
            message: 'foo'
          },
          output: {
            channel: 'facebook',
            user: '1234',
            intent: '#hello',
            message: 'Hello World!'
          }
        }
      }))
      .onCall(1).returns(Promise.resolve({
        statusCode: 200,
        result: {
          _id: 'foo',
          _rev: 'bar',
          user: 'abcd',
          foo: 'bar'
        }
      }))
      .onCall(2).returns(Promise.resolve({
        statusCode: 200,
        result: {
          _id: 'abcd',
          _rev: '2-abcd',
          facebook_id: '1234',
          name: 'Egon Olsen'
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
        intent: '#hello',
        message: 'Hello World!'
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
        chai.expect(invokeStub.getCall(0).args[0].name).to.equal('testpackage/core-datastore');
        chai.expect(invokeStub.getCall(0).args[0].params.operation).to.equal('update');
        chai.expect(invokeStub.getCall(0).args[0].params.doc.type).to.equal('payload');
        chai.expect(invokeStub.getCall(0).args[0].params.doc.id).to.equal('12345');
        chai.expect(invokeStub.getCall(0).args[0].params.doc.input).to.exist;
        chai.expect(invokeStub.getCall(0).args[0].params.doc.output).to.exist;
        chai.expect(invokeStub.getCall(0).args[0].params.doc.user).to.equal('abcd');

        chai.expect(invokeStub.getCall(1).args[0].name).to.equal('testpackage/core-datastore');
        chai.expect(invokeStub.getCall(1).args[0].params.operation).to.equal('update');
        chai.expect(invokeStub.getCall(1).args[0].params.doc.type).to.equal('conversationcontext');
        chai.expect(invokeStub.getCall(1).args[0].params.doc.user).to.equal('abcd');
        chai.expect(invokeStub.getCall(1).args[0].params.doc.foo).to.equal('bar');

        chai.expect(invokeStub.getCall(2).args[0].name).to.equal('testpackage/core-datastore');
        chai.expect(invokeStub.getCall(2).args[0].params.operation).to.equal('update');
        chai.expect(invokeStub.getCall(2).args[0].params.doc.type).to.equal('user');
        chai.expect(invokeStub.getCall(2).args[0].params.doc._id).to.equal('abcd');
        chai.expect(invokeStub.getCall(2).args[0].params.doc.facebook_id).to.equal('1234');
        chai.expect(invokeStub.getCall(2).args[0].params.doc.name).to.equal('Egon Olsen');

        chai.expect(result.statusCode).to.equal(200);
        chai.expect(result.result.id).to.equal('12345');
        chai.expect(result.result._id).to.equal('foobar');
        chai.expect(JSON.stringify(result.result.input)).to.equal(JSON.stringify(params.payload.input));
        chai.expect(result.result.conversationcontext._id).to.equal('foo');
        chai.expect(result.result.conversationcontext._rev).to.equal('bar');
        chai.expect(result.result.conversationcontext.user._id).to.equal('abcd');
        chai.expect(result.result.conversationcontext.user._rev).to.equal('2-abcd');
        chai.expect(result.result.conversationcontext.user.facebook_id).to.equal('1234');
        chai.expect(result.result.conversationcontext.user.name).to.equal('Egon Olsen');
      });
  });

  it('it does not execute the process if payload is already persisted', () => {
    // sample configuration used for the test
    const config = {
      openwhisk: {
        package: 'testpackage'
      }
    }

    const payload = {
      _id: 'foo',
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
        intent: '#hello',
        message: 'Hello World!'
      }
    }

    const params = {
      config,
      payload
    }

    return requireMock.reRequire('./index').main(params)
      .then(result => {
        chai.expect(result.statusCode).to.equal(200);
        chai.expect(JSON.stringify(result.result)).to.equal(JSON.stringify(payload));
      });
  });

  it('except the force parameter is set', () => {
    // create stubs for actual functions
    const invokeStub = sinon.stub()
      .onCall(0).returns(Promise.resolve({
        statusCode: 201,
        result: {
          _id: 'foobar',
          _rev: 'aAaBbB',
          id: '12345',
          input: {
            channel: 'facebook',
            user: '1234',
            message: 'foo'
          },
          output: {
            channel: 'facebook',
            user: '1234',
            intent: '#hello',
            message: 'Hello World!'
          }
        }
      }))
      .onCall(1).returns(Promise.resolve({
        statusCode: 200,
        result: {
          _id: 'foo',
          _rev: 'bar',
          user: 'abcd',
          foo: 'bar'
        }
      }))
      .onCall(2).returns(Promise.resolve({
        statusCode: 200,
        result: {
          _id: 'abcd',
          _rev: '2-abcd',
          facebook_id: '1234',
          name: 'Egon Olsen'
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
      openwhisk: {
        package: 'testpackage'
      }
    }

    const payload = {
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
        message: 'Hello World!'
      }
    }

    const params = {
      config,
      payload,
      force: true
    }

    requireMock.reRequire('openwhisk');
    requireMock.reRequire('serverless-botpack-lib');

    return requireMock.reRequire('./index').main(params)
      .then(result => {
        chai.expect(invokeStub.getCall(0).args[0].name).to.equal('testpackage/core-datastore');
        chai.expect(invokeStub.getCall(0).args[0].params.operation).to.equal('update');
        chai.expect(invokeStub.getCall(0).args[0].params.doc.type).to.equal('payload');
        chai.expect(invokeStub.getCall(0).args[0].params.doc.id).to.equal('12345');
        chai.expect(invokeStub.getCall(0).args[0].params.doc.input).to.exist;
        chai.expect(invokeStub.getCall(0).args[0].params.doc.output).to.exist;
        chai.expect(invokeStub.getCall(0).args[0].params.doc.user).to.equal('abcd');

        chai.expect(invokeStub.getCall(1).args[0].name).to.equal('testpackage/core-datastore');
        chai.expect(invokeStub.getCall(1).args[0].params.operation).to.equal('update');
        chai.expect(invokeStub.getCall(1).args[0].params.doc.type).to.equal('conversationcontext');
        chai.expect(invokeStub.getCall(1).args[0].params.doc.user).to.equal('abcd');
        chai.expect(invokeStub.getCall(1).args[0].params.doc.foo).to.equal('bar');

        chai.expect(invokeStub.getCall(2).args[0].name).to.equal('testpackage/core-datastore');
        chai.expect(invokeStub.getCall(2).args[0].params.operation).to.equal('update');
        chai.expect(invokeStub.getCall(2).args[0].params.doc.type).to.equal('user');
        chai.expect(invokeStub.getCall(2).args[0].params.doc._id).to.equal('abcd');
        chai.expect(invokeStub.getCall(2).args[0].params.doc.facebook_id).to.equal('1234');
        chai.expect(invokeStub.getCall(2).args[0].params.doc.name).to.equal('Egon Olsen');

        chai.expect(result.statusCode).to.equal(200);
        chai.expect(result.result.id).to.equal('12345');
        chai.expect(result.result._id).to.equal('foobar');
        chai.expect(JSON.stringify(result.result.input)).to.equal(JSON.stringify(params.payload.input));
        chai.expect(result.result.conversationcontext._id).to.equal('foo');
        chai.expect(result.result.conversationcontext._rev).to.equal('bar');
        chai.expect(result.result.conversationcontext.user._id).to.equal('abcd');
        chai.expect(result.result.conversationcontext.user._rev).to.equal('2-abcd');
        chai.expect(result.result.conversationcontext.user.facebook_id).to.equal('1234');
        chai.expect(result.result.conversationcontext.user.name).to.equal('Egon Olsen');
      });
  });
});
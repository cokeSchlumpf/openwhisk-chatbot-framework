const _ = require('lodash');
const chai = require('chai');
const requireMock = require('mock-require');
const sinon = require('sinon');

describe('core-contextload', () => {
  it('initializes user and context if user is new', () => {
    // create stubs for actual functions
    const invokeStub = sinon.stub()
      .onCall(0).returns(Promise.resolve({
        statusCode: 200,
        result: []
      }))
      .onCall(1).returns(Promise.resolve({
        statusCode: 201,
        result: {
          _id: 'abcd-efgh',
          _rev: 'foo',
          channel_id: '1234'
        }
      }))
      .onCall(2).returns(Promise.resolve({
        statusCode: 200,
        result: []
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
      }
    }

    const params = {
      config,
      payload,
      user: {
        channel_id: '1234',
        name: 'Egon Olsen'
      }
    }

    requireMock.reRequire('openwhisk');
    requireMock.reRequire('serverless-botpack-lib');

    return requireMock.reRequire('./index').main(params)
      .then(result => {
        chai.expect(invokeStub.getCall(0).args[0].name).to.equal('testpackage/core-datastore');
        chai.expect(invokeStub.getCall(0).args[0].params.operation).to.equal('read');
        chai.expect(invokeStub.getCall(0).args[0].params.selector.channel_id).to.equal('1234');

        chai.expect(invokeStub.getCall(1).args[0].name).to.equal('testpackage/core-datastore');
        chai.expect(invokeStub.getCall(1).args[0].params.operation).to.equal('create');
        chai.expect(invokeStub.getCall(1).args[0].params.doc.channel_id).to.equal('1234');
        chai.expect(invokeStub.getCall(1).args[0].params.doc.type).to.equal('user');

        chai.expect(invokeStub.getCall(2).args[0].name).to.equal('testpackage/core-datastore');
        chai.expect(invokeStub.getCall(2).args[0].params.operation).to.equal('read');
        chai.expect(invokeStub.getCall(2).args[0].params.selector.user).to.equal('abcd-efgh');
        chai.expect(invokeStub.getCall(2).args[0].params.selector.type).to.equal('conversationcontext');

        chai.expect(result.statusCode).to.equal(200);
        chai.expect(result.result.id).to.equal('12345');
        chai.expect(JSON.stringify(result.result.input)).to.equal(JSON.stringify(params.payload.input));
        chai.expect(result.result.conversationcontext.user.channel_id).to.equal('1234');
        chai.expect(result.result.conversationcontext.user._id).to.equal('abcd-efgh');
        chai.expect(result.result.conversationcontext.user.name).to.equal('Egon Olsen');
      });
  });

  it('gets user and initializes context only if user exists, but no context', () => {
    // create stubs for actual functions
    const invokeStub = sinon.stub()
      .onCall(0).returns(Promise.resolve({
        statusCode: 200,
        result: [
          {
            _id: 'abcd-efgh',
            _rev: 'foo',
            channel_id: '1234'
          }
        ]
      }))
      .onCall(1).returns(Promise.resolve({
        statusCode: 200,
        result: []
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
      }
    }

    const params = {
      config,
      payload,
      user: {
        channel_id: '1234',
        name: 'Egon Olsen'
      }
    }

    requireMock.reRequire('openwhisk');
    requireMock.reRequire('serverless-botpack-lib');

    return requireMock.reRequire('./index').main(params)
      .then(result => {
        chai.expect(invokeStub.getCall(0).args[0].name).to.equal('testpackage/core-datastore');
        chai.expect(invokeStub.getCall(0).args[0].params.operation).to.equal('read');
        chai.expect(invokeStub.getCall(0).args[0].params.selector.channel_id).to.equal('1234');

        chai.expect(invokeStub.getCall(1).args[0].name).to.equal('testpackage/core-datastore');
        chai.expect(invokeStub.getCall(1).args[0].params.operation).to.equal('read');
        chai.expect(invokeStub.getCall(1).args[0].params.selector.user).to.equal('abcd-efgh');
        chai.expect(invokeStub.getCall(1).args[0].params.selector.type).to.equal('conversationcontext');

        chai.expect(result.statusCode).to.equal(200);
        chai.expect(result.result.id).to.equal('12345');
        chai.expect(JSON.stringify(result.result.input)).to.equal(JSON.stringify(params.payload.input));
        chai.expect(result.result.conversationcontext.user.channel_id).to.equal('1234');
        chai.expect(result.result.conversationcontext.user._id).to.equal('abcd-efgh');
        chai.expect(result.result.conversationcontext.user.name).to.equal('Egon Olsen');
      });
  });

  it('gets user and context only if they exist', () => {
    // create stubs for actual functions
    const invokeStub = sinon.stub()
      .onCall(0).returns(Promise.resolve({
        statusCode: 200,
        result: [
          {
            _id: 'abcd-efgh',
            _rev: 'foo',
            channel_id: '1234'
          }
        ]
      }))
      .onCall(1).returns(Promise.resolve({
        statusCode: 200,
        result: [
          {
            _id: 'ABCD-EFGH',
            _rev: 'bar',
            user: 'abcd-efgh',
            foo: 'bar',
          }
        ]
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
      }
    }

    const params = {
      config,
      payload,
      user: {
        channel_id: '1234',
        name: 'Egon Olsen'
      }
    }

    requireMock.reRequire('openwhisk');
    requireMock.reRequire('serverless-botpack-lib');

    return requireMock.reRequire('./index').main(params)
      .then(result => {
        chai.expect(invokeStub.getCall(0).args[0].name).to.equal('testpackage/core-datastore');
        chai.expect(invokeStub.getCall(0).args[0].params.operation).to.equal('read');
        chai.expect(invokeStub.getCall(0).args[0].params.selector.channel_id).to.equal('1234');

        chai.expect(invokeStub.getCall(1).args[0].name).to.equal('testpackage/core-datastore');
        chai.expect(invokeStub.getCall(1).args[0].params.operation).to.equal('read');
        chai.expect(invokeStub.getCall(1).args[0].params.selector.user).to.equal('abcd-efgh');
        chai.expect(invokeStub.getCall(1).args[0].params.selector.type).to.equal('conversationcontext');

        chai.expect(result.statusCode).to.equal(200);
        chai.expect(result.result.id).to.equal('12345');
        chai.expect(JSON.stringify(result.result.input)).to.equal(JSON.stringify(params.payload.input));
        chai.expect(result.result.conversationcontext.user.channel_id).to.equal('1234');
        chai.expect(result.result.conversationcontext.user._id).to.equal('abcd-efgh');
        chai.expect(result.result.conversationcontext.user.name).to.equal('Egon Olsen');
        chai.expect(result.result.conversationcontext.foo).to.equal('bar');
      });
  });
});
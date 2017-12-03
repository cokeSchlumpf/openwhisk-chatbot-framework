const _ = require('lodash');
const chai = require('chai');
const fs = require('fs');
const requireMock = require('mock-require');
const sinon = require('sinon');

const watson_response = JSON.parse(fs.readFileSync('./test/watson-response.sample.json', 'utf-8'));

describe('middleware-services-wcs', () => {
  it('calls watson conversation service with the user input', () => {
    const wcs_stub = sinon.stub().callsArgWith(1, undefined, watson_response);

    requireMock('watson-developer-cloud/conversation/v1', sinon.stub().returns({
      message: wcs_stub
    }));

    const config = {
      services: {
        wcs: {
          username: 'user',
          password: 'pass',
          workspace: 'abcd'
        }
      }
    }

    const payload = {
      input: {
        message: 'Hello World!'
      }
    }

    requireMock.reRequire('watson-developer-cloud/conversation/v1');

    return requireMock.reRequire('./index').main({ payload, config }).then(result => {
      chai.expect(wcs_stub.callCount).to.equal(1);
      chai.expect(result.statusCode).to.equal(200);
      chai.expect(wcs_stub.getCall(0).args[0].input.text).to.equal('Hello World!');
      chai.expect(wcs_stub.getCall(0).args[0].context).to.deep.equal({});

      chai.expect(payload.conversationcontext.services.wcs.conversation_id).to.equal('59aebcf9-3df2-4f85-8632-cf8e4c760260');
      chai.expect(payload.context.services.wcs.intents[0].intent).to.equal('hello');
      chai.expect(payload.context.output.messages[0]).to.equal('Hi! What can I do for you?');
    });
  });

  it('calls watson conversation service with the user input - a service name can be defined to read/write context.', () => {
    const wcs_stub = sinon.stub().callsArgWith(1, undefined, watson_response);

    requireMock('watson-developer-cloud/conversation/v1', sinon.stub().returns({
      message: wcs_stub
    }));

    const config = {
      services: {
        wcs: {
          username: 'user',
          password: 'pass',
          workspace: 'abcd'
        }
      }
    }

    const payload = {
      input: {
        message: 'Hello World!'
      }
    }

    requireMock.reRequire('watson-developer-cloud/conversation/v1');

    return requireMock.reRequire('./index').main({ payload, config, servicename: 'wcs_test' }).then(result => {
      chai.expect(result.statusCode).to.equal(200);

      chai.expect(wcs_stub.callCount).to.equal(1);
      chai.expect(wcs_stub.getCall(0).args[0].input.text).to.equal('Hello World!');
      chai.expect(wcs_stub.getCall(0).args[0].context).to.deep.equal({});

      chai.expect(payload.conversationcontext.services.wcs_test.conversation_id).to.equal('59aebcf9-3df2-4f85-8632-cf8e4c760260');
      chai.expect(payload.context.services.wcs_test.intents[0].intent).to.equal('hello');
      chai.expect(payload.context.output.messages[0]).to.equal('Hi! What can I do for you?');
    });
  });

  it('uses an existing context from the payload context.', () => {
    const wcs_stub = sinon.stub().callsArgWith(1, undefined, watson_response);

    requireMock('watson-developer-cloud/conversation/v1', sinon.stub().returns({
      message: wcs_stub
    }));

    const config = {
      services: {
        wcs: {
          username: 'user',
          password: 'pass',
          workspace: 'abcd'
        }
      }
    }

    const payload = {
      input: {
        message: 'Hello World!'
      },
      conversationcontext: {
        services: {
          wcs_test: {
            foo: 'bar'
          }
        }
      }
    }

    requireMock.reRequire('watson-developer-cloud/conversation/v1');

    return requireMock.reRequire('./index').main({ payload, config, servicename: 'wcs_test' }).then(result => {
      chai.expect(result.statusCode).to.equal(200);

      chai.expect(wcs_stub.callCount).to.equal(1);
      chai.expect(wcs_stub.getCall(0).args[0].input.text).to.equal('Hello World!');
      chai.expect(wcs_stub.getCall(0).args[0].context).to.deep.equal({ foo: 'bar' });

      chai.expect(payload.conversationcontext.services.wcs_test.conversation_id).to.equal('59aebcf9-3df2-4f85-8632-cf8e4c760260');
      chai.expect(payload.context.services.wcs_test.intents[0].intent).to.equal('hello');
      chai.expect(payload.context.output.messages[0]).to.equal('Hi! What can I do for you?');
    });
  });
});
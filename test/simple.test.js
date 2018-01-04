const _ = require('lodash');
const chai = require('chai');
const fs = require('fs');
const openwhisk = require('./openwhisk.mock');
const requireMock = require('mock-require');
const sinon = require('sinon');
const { StringDecoder } = require('string_decoder');

const parameters = JSON.parse(fs.readFileSync('./simple.test.parameters.json', 'utf-8'));
const ow = openwhisk(parameters);

const toJSON = (response) => {
  try {
    const decoder = new StringDecoder('utf8');
    const body_buffer = Buffer.from(response.body, 'base64');
    const body = JSON.parse(decoder.write(body_buffer));

    return _.assign({}, response, { body });
  } catch (error) {
    return response;
  }
}

requireMock('openwhisk', ow);

describe('openwhisk-chatbot-framework', () => {
  it('accepts http requests, selects the according input-connector and responds with the responds of the connector', () => {
    ow()._mock.reset();

    return ow().actions.invoke({
      name: 'package/core-input',
      blocking: true,
      result: true,
      params: {
        __ow_method: 'post',
        __ow_path: '/',
        foo: 'bar'
      }
    })
      .then(toJSON)
      .then(result => {
        chai.expect(result.statusCode).to.equal(404);
        chai.expect(result.headers['Content-Type']).to.equal('application/json');
        chai.expect(result.body.message).to.contain('no input connector');

        const calls = ow()._mock.calls();
        chai.expect(_.size(calls)).to.equal(3);
        chai.expect(calls[1].action.name).to.equal('serverless-botpack/channels-facebook-input');
        chai.expect(calls[2].action.name).to.equal('serverless-botpack/channels-simple-input');
      });
  });

  it('accepts http requests, selects the according input-connector and responds with the responds of the connector before starting the middleware-process', () => {
    ow()._mock.reset();

    const cloudant_find_stub = sinon.stub()
      .onCall(0).returns(Promise.resolve({
        docs: [
          {
            _id: '1234',
            _rev: '1-1234',
            type: 'user',
            channel_id: 'foo',
            firstname: 'Egon',
            lastname: 'Olsen'
          }
        ]
      }))
      .onCall(1).returns(Promise.resolve({
        docs: [
          {
            _id: '1234',
            _rev: '1-1234',
            type: 'conversationcontext',
            user: '1234',
            foo: 'bar'
          }
        ]
      }));

    requireMock('cloudant', () => ({
      db: {
        use: () => ({
          find: cloudant_find_stub,
        })
      }
    }));

    requireMock.reRequire('cloudant');
    requireMock.reRequire('../actions/middleware-user-load');

    return ow().actions.invoke({
      name: 'package/core-input',
      blocking: true,
      result: true,
      params: {
        __ow_method: 'post',
        __ow_path: '/',
        message: 'Hello World!'
      }
    })
      .then(toJSON)
      .then(result => {
        chai.expect(result.statusCode).to.equal(200);
        chai.expect(result.headers['Content-Type']).to.equal('application/json');
        chai.expect(result.body.ok).to.be.true;

        const calls = ow()._mock.calls();
        const last_action = _.last(calls);

        chai.expect(last_action.result.payload.conversationcontext.user.firstname).to.equal('Egon');
        chai.expect(last_action.result.payload.conversationcontext.foo).to.equal('bar');
      });
  });
});
const _ = require('lodash');
const chai = require('chai');
const requireMock = require('mock-require');
const sinon = require('sinon');

describe('middleware-context-load', () => {
  it('loads an existing conversation context from the database', () => {
    const cloudant_find_stub = sinon.stub()
      .returns(Promise.resolve({
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

    const config = {
      cloudant: {
        url: 'http://cloudant.url',
        database: 'db'
      }
    }

    const payload = {
      input: {
        user: '1234',
        channel: 'channel_name'
      },
      conversationcontext: {
        user: {
          _id: '1234',
          channel_id: 'foo',
          firstname: 'Egon',
          lastname: 'Olsen'
        }
      }
    }

    requireMock.reRequire('cloudant');
    
    return requireMock.reRequire('./index').main({ payload, config }).then(result => {
      chai.expect(cloudant_find_stub.callCount).to.equal(1);
      chai.expect(cloudant_find_stub.getCall(0).args[0].selector.user).to.equal('1234');

      chai.expect(result.statusCode).to.equal(200);
      chai.expect(result.payload.input.user).to.equal('1234');
      chai.expect(result.payload.conversationcontext.user._id).to.equal('1234');
      chai.expect(result.payload.conversationcontext.user.channel_id).to.equal('foo');
      chai.expect(result.payload.conversationcontext.user.lastname).to.equal('Olsen');
      chai.expect(result.payload.conversationcontext.type).to.equal('conversationcontext');
      chai.expect(result.payload.conversationcontext.foo).to.equal('bar');
    });
  });

  it('initializes an empty context, if no existing context was found', () => {
    const cloudant_find_stub = sinon.stub()
      .returns(Promise.resolve({
        docs: []
      }));

    requireMock('cloudant', () => ({
      db: {
        use: () => ({
          find: cloudant_find_stub,
        })
      }
    }));

    const config = {
      cloudant: {
        url: 'http://cloudant.url',
        database: 'db'
      }
    }

    const payload = {
      input: {
        user: '1234',
        channel: 'channel_name'
      },
      conversationcontext: {
        user: {
          _id: '1234',
          channel_id: 'foo',
          firstname: 'Egon',
          lastname: 'Olsen'
        }
      }
    }

    requireMock.reRequire('cloudant');
    
    return requireMock.reRequire('./index').main({ payload, config }).then(result => {
      chai.expect(cloudant_find_stub.callCount).to.equal(1);
      chai.expect(cloudant_find_stub.getCall(0).args[0].selector.user).to.equal('1234');

      chai.expect(result.statusCode).to.equal(200);
      chai.expect(result.payload.input.user).to.equal('1234');
      chai.expect(result.payload.conversationcontext.user._id).to.equal('1234');
      chai.expect(result.payload.conversationcontext.user.channel_id).to.equal('foo');
      chai.expect(result.payload.conversationcontext.user.lastname).to.equal('Olsen');
      chai.expect(result.payload.conversationcontext.type).to.equal('conversationcontext');
    });
  });

  it('rejects and returns an error if database throws an exception', () => {
    const cloudant_find_stub = sinon.stub()
      .throws();

    requireMock('cloudant', () => ({
      db: {
        use: () => ({
          find: cloudant_find_stub,
        })
      }
    }));

    const config = {
      cloudant: {
        url: 'http://cloudant.url',
        database: 'db'
      }
    }

    const payload = {
      input: {
        user: '1234',
        channel: 'channel_name'
      },
      conversationcontext: {
        user: {
          _id: '1234',
          channel_id: 'foo',
          firstname: 'Egon',
          lastname: 'Olsen'
        }
      }
    }

    requireMock.reRequire('cloudant');
    
    return requireMock.reRequire('./index').main({ payload, config }).then(result => {
      chai.expect(true).to.be.false;
    }).catch(result => {
      chai.expect(cloudant_find_stub.callCount).to.equal(1);
      chai.expect(result.statusCode).to.equal(500);
    });
  });
});
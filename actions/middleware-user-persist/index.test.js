const _ = require('lodash');
const chai = require('chai');
const requireMock = require('mock-require');
const sinon = require('sinon');

describe('middleware-user-persist', () => {
  it('persists an existing user in the database', () => {
    const cloudant_insert_stub = sinon.stub()
      .returns(Promise.resolve({
        id: '1234',
        rev: '2-1234'
      }));

    requireMock('cloudant', () => ({
      db: {
        use: () => ({
          insert: cloudant_insert_stub
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
          _rev: '1-1234',
          channel_name_id: '1234',
          firstname: 'Egon',
          lastname: 'Olsen'
        }
      }
    }

    requireMock.reRequire('cloudant');

    return requireMock.reRequire('./index').main({ payload, config }).then(result => {
      chai.expect(cloudant_insert_stub.callCount).to.equal(1);

      chai.expect(cloudant_insert_stub.getCall(0).args[0].channel_name_id).to.equal('1234');

      chai.expect(result.statusCode).to.equal(200);
      chai.expect(result.payload.input.user).to.equal('1234');
      chai.expect(result.payload.conversationcontext.user._id).to.equal('1234');
      chai.expect(result.payload.conversationcontext.user._rev).to.equal('2-1234');
    });
  });

  it('inserts a new user in the database', () => {
    const cloudant_insert_stub = sinon.stub()
      .returns(Promise.resolve({
        id: '1234',
        rev: '1-1234'
      }));

    requireMock('cloudant', () => ({
      db: {
        use: () => ({
          insert: cloudant_insert_stub
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
          channel_name_id: '1234',
          firstname: 'Egon',
          lastname: 'Olsen'
        }
      }
    }

    requireMock.reRequire('cloudant');

    return requireMock.reRequire('./index').main({ payload, config }).then(result => {
      chai.expect(cloudant_insert_stub.callCount).to.equal(1);

      chai.expect(cloudant_insert_stub.getCall(0).args[0].channel_name_id).to.equal('1234');

      chai.expect(result.statusCode).to.equal(200);
      chai.expect(result.payload.input.user).to.equal('1234');
      chai.expect(result.payload.conversationcontext.user._id).to.equal('1234');
      chai.expect(result.payload.conversationcontext.user._rev).to.equal('1-1234');
    });
  });

  it('gets the current revision id from db if no revision is known, before updating the user in the database', () => {
    const cloudant_get_stub = sinon.stub()
      .returns(Promise.resolve({
        _id: '1234',
        _rev: '1-1234',
        foo: 'bar'
      }));

    const cloudant_insert_stub = sinon.stub()
      .returns(Promise.resolve({
        id: '1234',
        rev: '2-1234'
      }));

    requireMock('cloudant', () => ({
      db: {
        use: () => ({
          get: cloudant_get_stub,
          insert: cloudant_insert_stub
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
          channel_name_id: '1234',
          firstname: 'Egon',
          lastname: 'Olsen'
        }
      }
    }

    requireMock.reRequire('cloudant');

    return requireMock.reRequire('./index').main({ payload, config }).then(result => {
      chai.expect(cloudant_get_stub.callCount).to.equal(1);
      chai.expect(cloudant_insert_stub.callCount).to.equal(1);

      chai.expect(cloudant_insert_stub.getCall(0).args[0].channel_name_id).to.equal('1234');
      chai.expect(cloudant_get_stub.getCall(0).args[0]).to.equal('1234');

      chai.expect(result.statusCode).to.equal(200);
      chai.expect(result.payload.input.user).to.equal('1234');
      chai.expect(result.payload.conversationcontext.user._id).to.equal('1234');
      chai.expect(result.payload.conversationcontext.user._rev).to.equal('2-1234');
      chai.expect(result.payload.conversationcontext.user.foo).to.be.undefined;
    });
  });
});
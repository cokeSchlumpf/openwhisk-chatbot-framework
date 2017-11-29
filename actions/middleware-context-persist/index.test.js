const _ = require('lodash');
const chai = require('chai');
const requireMock = require('mock-require');
const sinon = require('sinon');

describe('middleware-context-persist', () => {
  it('persists an existing conversationcontext in the database', () => {
    const cloudant_insert_stub = sinon.stub()
      .returns(Promise.resolve({
        id: 'abcde',
        rev: '2-abcde'
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
        _id: 'abcde',
        _rev: '1-abcde',
        user: {
          _id: '1234',
          _rev: '2-1234',
          channel_name_id: '1234',
          firstname: 'Egon',
          lastname: 'Olsen'
        },
        foo: 'bar'
      }
    }

    requireMock.reRequire('cloudant');

    return requireMock.reRequire('./index').main({ payload, config }).then(result => {
      chai.expect(cloudant_insert_stub.callCount).to.equal(1);

      chai.expect(cloudant_insert_stub.getCall(0).args[0].user).to.equal('1234');
      chai.expect(cloudant_insert_stub.getCall(0).args[0]._id).to.equal('abcde');
      chai.expect(cloudant_insert_stub.getCall(0).args[0]._rev).to.equal('1-abcde');
      chai.expect(cloudant_insert_stub.getCall(0).args[0].foo).to.equal('bar');

      chai.expect(result.statusCode).to.equal(200);
      chai.expect(result.payload.input.user).to.equal('1234');
      chai.expect(result.payload.conversationcontext.user._id).to.equal('1234');
      chai.expect(result.payload.conversationcontext.user._rev).to.equal('2-1234');
      chai.expect(result.payload.conversationcontext._rev).to.equal('2-abcde');
    });
  });

  it('inserts a new conversationcontext in the database', () => {
    const cloudant_insert_stub = sinon.stub()
      .returns(Promise.resolve({
        id: 'abcde',
        rev: '1-abcde'
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
          _rev: '2-1234',
          channel_name_id: '1234',
          firstname: 'Egon',
          lastname: 'Olsen'
        },
        foo: 'bar'
      }
    }

    requireMock.reRequire('cloudant');

    return requireMock.reRequire('./index').main({ payload, config }).then(result => {
      chai.expect(cloudant_insert_stub.callCount).to.equal(1);

      chai.expect(cloudant_insert_stub.getCall(0).args[0].user).to.equal('1234');
      chai.expect(cloudant_insert_stub.getCall(0).args[0].foo).to.equal('bar');

      chai.expect(result.statusCode).to.equal(200);
      chai.expect(result.payload.input.user).to.equal('1234');
      chai.expect(result.payload.conversationcontext.user._id).to.equal('1234');
      chai.expect(result.payload.conversationcontext.user._rev).to.equal('2-1234');
      chai.expect(result.payload.conversationcontext._id).to.equal('abcde');
      chai.expect(result.payload.conversationcontext._rev).to.equal('1-abcde');
    });
  });

  it('gets the current revision id from db if no revision is known, before updating the conversationcontext in the database', () => {
    const cloudant_get_stub = sinon.stub()
      .returns(Promise.resolve({
        _id: 'abcde',
        _rev: '1-abcde',
        foo: 'lorem ipsum'
      }));

    const cloudant_insert_stub = sinon.stub()
      .returns(Promise.resolve({
        id: 'abcde',
        rev: '2-abcde'
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
        _id: 'abcde',
        user: {
          _id: '1234',
          _rev: '2-1234',
          channel_name_id: '1234',
          firstname: 'Egon',
          lastname: 'Olsen'
        },
        foo: 'bar'
      }
    }

    requireMock.reRequire('cloudant');

    return requireMock.reRequire('./index').main({ payload, config }).then(result => {
      chai.expect(cloudant_get_stub.callCount).to.equal(1);
      chai.expect(cloudant_insert_stub.callCount).to.equal(1);

      chai.expect(cloudant_get_stub.getCall(0).args[0]).to.equal('abcde');
      chai.expect(cloudant_insert_stub.getCall(0).args[0]._id).to.equal('abcde');
      chai.expect(cloudant_insert_stub.getCall(0).args[0]._rev).to.equal('1-abcde');
      chai.expect(cloudant_insert_stub.getCall(0).args[0].foo).to.equal('bar');

      chai.expect(result.statusCode).to.equal(200);
      chai.expect(result.payload.input.user).to.equal('1234');
      chai.expect(result.payload.conversationcontext.user._id).to.equal('1234');
      chai.expect(result.payload.conversationcontext.user._rev).to.equal('2-1234');
      chai.expect(result.payload.conversationcontext._id).to.equal('abcde');
      chai.expect(result.payload.conversationcontext._rev).to.equal('2-abcde');
      chai.expect(result.payload.conversationcontext.foo).to.equal('bar');
    });
  });

  it('returns an error if no user id is defined the conversationcontext', () => {
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
        _id: 'abcde',
        user: {
          channel_name_id: '1234',
          firstname: 'Egon',
          lastname: 'Olsen'
        },
        foo: 'bar'
      }
    }

    return requireMock.reRequire('./index').main({ payload, config }).then(result => {
      chai.expect(true).to.be.false;
    }).catch(result => {
      chai.expect(result.statusCode).to.equal(500);
    });
  });
});
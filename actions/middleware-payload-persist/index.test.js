const _ = require('lodash');
const chai = require('chai');
const requireMock = require('mock-require');
const sinon = require('sinon');

describe('middleware-payload-persist', () => {
  it('persists an existing payload in the database', () => {
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
      _id: '1234',
      _rev: '1-1234',
      input: {
        user: '1234',
        channel: 'channel_name'
      },
      conversationcontext: {
        _id: 'abcde',
        _rev: '1-abcde',
        user: {
          _id: '1234',
          _rev: '1-1234',
          channel_name_id: '1234',
          firstname: 'Egon',
          lastname: 'Olsen'
        }
      },
      context: {
        foo: 'bar'
      }
    }

    requireMock.reRequire('cloudant');

    return requireMock.reRequire('./index').main({ payload, config }).then(result => {
      chai.expect(cloudant_insert_stub.callCount).to.equal(1);

      chai.expect(cloudant_insert_stub.getCall(0).args[0]._id).to.equal('1234');
      chai.expect(cloudant_insert_stub.getCall(0).args[0].context.foo).to.equal('bar');
      chai.expect(cloudant_insert_stub.getCall(0).args[0].conversationcontext).to.equal('abcde');

      chai.expect(result.statusCode).to.equal(200);
      chai.expect(result.payload.input.user).to.equal('1234');
      chai.expect(result.payload.conversationcontext.user.firstname).to.equal('Egon');
      chai.expect(result.payload.context.foo).to.equal('bar');
    });
  });

  it('persists an existing payload without the transient_context', () => {
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
      _id: '1234',
      _rev: '1-1234',
      input: {
        user: '1234',
        channel: 'channel_name'
      },
      conversationcontext: {
        _id: 'abcde',
        _rev: '1-abcde',
        user: {
          _id: '1234',
          _rev: '1-1234',
          channel_name_id: '1234',
          firstname: 'Egon',
          lastname: 'Olsen'
        }
      },
      context: {
        foo: 'bar'
      },
      transient_context: {
        lorem: 'ipsum'
      }
    }

    requireMock.reRequire('cloudant');

    return requireMock.reRequire('./index').main({ payload, config }).then(result => {
      chai.expect(cloudant_insert_stub.callCount).to.equal(1);

      chai.expect(cloudant_insert_stub.getCall(0).args[0]._id).to.equal('1234');
      chai.expect(cloudant_insert_stub.getCall(0).args[0].context.foo).to.equal('bar');
      chai.expect(cloudant_insert_stub.getCall(0).args[0].conversationcontext).to.equal('abcde');
      chai.expect(cloudant_insert_stub.getCall(0).args[0].transient_context).to.be.undefined;

      chai.expect(result.statusCode).to.equal(200);
      chai.expect(result.payload.input.user).to.equal('1234');
      chai.expect(result.payload.conversationcontext.user.firstname).to.equal('Egon');
      chai.expect(result.payload.context.foo).to.equal('bar');
    });
  });

  it('inserts a new payload in the database', () => {
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
        _id: 'abcde',
        _rev: '1-abcde',
        user: {
          _id: '1234',
          _rev: '1-1234',
          channel_name_id: '1234',
          firstname: 'Egon',
          lastname: 'Olsen'
        }
      },
      context: {
        foo: 'bar'
      }
    }

    requireMock.reRequire('cloudant');

    return requireMock.reRequire('./index').main({ payload, config }).then(result => {
      chai.expect(cloudant_insert_stub.callCount).to.equal(1);

      chai.expect(cloudant_insert_stub.getCall(0).args[0].conversationcontext).to.equal('abcde');

      chai.expect(result.statusCode).to.equal(200);
      chai.expect(result.payload.input.user).to.equal('1234');
      chai.expect(result.payload.conversationcontext.user._id).to.equal('1234');
      chai.expect(result.payload.conversationcontext.user._rev).to.equal('1-1234');
      chai.expect(result.payload._id).to.equal('1234');
      chai.expect(result.payload._rev).to.equal('1-1234');
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
      _id: '1234',
      input: {
        user: '1234',
        channel: 'channel_name'
      },
      conversationcontext: {
        _id: 'abcde',
        _rev: '1-abcde',
        user: {
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

      chai.expect(cloudant_insert_stub.getCall(0).args[0].input.user).to.equal('1234');
      chai.expect(cloudant_get_stub.getCall(0).args[0]).to.equal('1234');

      chai.expect(result.statusCode).to.equal(200);
      chai.expect(result.payload.input.user).to.equal('1234');
      chai.expect(result.payload.conversationcontext._id).to.equal('abcde');
      chai.expect(result.payload.conversationcontext._rev).to.equal('1-abcde');
      chai.expect(result.payload._id).to.equal('1234');
      chai.expect(result.payload._rev).to.equal('2-1234');
    });
  });

  it('returns an error if conversationcontext was not stored previously', () => {
    const config = {
      cloudant: {
        url: 'http://cloudant.url',
        database: 'db'
      }
    }

    const payload = {
      _id: '1234',
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

    return requireMock.reRequire('./index').main({ payload, config }).then(result => {
      chai.expect(true).to.be.false;
    }).catch(result => {
      chai.expect(result.statusCode).to.equal(404);
    });
  });

  it('returns an error, when the database returns an error', () => {
    const cloudant_get_stub = sinon.stub()
      .returns(Promise.resolve({
        _id: '1234',
        _rev: '1-1234',
        foo: 'bar'
      }));

    const cloudant_insert_stub = sinon.stub()
      .returns(Promise.reject());

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
      _id: '1234',
      input: {
        user: '1234',
        channel: 'channel_name'
      },
      conversationcontext: {
        _id: 'abcde',
        _rev: '1-abcde',
        user: {
          channel_name_id: '1234',
          firstname: 'Egon',
          lastname: 'Olsen'
        }
      }
    }

    requireMock.reRequire('cloudant');

    return requireMock.reRequire('./index').main({ payload, config }).then(result => {
      chai.expect(true).to.be.false;
    }).catch(result => {
      chai.expect(cloudant_get_stub.callCount).to.equal(1);
      chai.expect(cloudant_insert_stub.callCount).to.equal(1);
      chai.expect(cloudant_insert_stub.getCall(0).args[0].input.user).to.equal('1234');
      chai.expect(cloudant_get_stub.getCall(0).args[0]).to.equal('1234');

      chai.expect(result.statusCode).to.equal(503);
    });
  });
});
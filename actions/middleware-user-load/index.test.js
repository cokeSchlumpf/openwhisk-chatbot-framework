const _ = require('lodash');
const chai = require('chai');
const requireMock = require('mock-require');
const sinon = require('sinon');

describe('middleware-user-load', () => {
  it('enriches the payload with the user data from the database', () => {
    const cloudant_find_stub = sinon.stub()
      .returns(Promise.resolve({
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
      }
    }

    requireMock.reRequire('cloudant');
    return requireMock.reRequire('./index').main({ payload, config }).then(result => {
      chai.expect(cloudant_find_stub.callCount).to.equal(1);

      chai.expect(cloudant_find_stub.getCall(0).args[0].selector.channel_name_id).to.equal('1234');

      chai.expect(result.statusCode).to.equal(200);
      chai.expect(result.payload.input.user).to.equal('1234');
      chai.expect(result.payload.conversationcontext.user.channel_id).to.equal('foo');
    });
  });

  it('enriches the payload with the new user data, if user not known', () => {
    const cloudant_find_stub = sinon.stub()
      .returns(Promise.resolve({
        docs: []
      }));

    requireMock('cloudant', () => ({
      db: {
        use: () => ({
          find: cloudant_find_stub
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
        channel: 'channel'
      }
    }

    requireMock.reRequire('cloudant');

    return requireMock.reRequire('./index').main({ payload, config }).then(result => {
      chai.expect(cloudant_find_stub.callCount).to.equal(1);

      chai.expect(result.statusCode).to.equal(200);
      chai.expect(result.payload.input.user).to.equal('1234');
      chai.expect(result.payload.conversationcontext.user.channel_id).to.equal('1234');
    });
  });

  it('enriches the payload with the user data, if a new user is detected, and calls a newuser middleware for the channel', () => {
    const cloudant_find_stub = sinon.stub()
      .returns(Promise.resolve({
        docs: []
      }));

    const ow_stub = sinon.stub()
      .returns(Promise.resolve({
        statusCode: 200,
        payload: {
          input: {
            user: '1234',
            channel: 'channel'
          },
          conversationcontext: {
            user: {
              channel_id: '1234',
              type: 'user',
              firstname: 'Egon',
              lastname: 'Olsen'
            }
          }
        }
      }));

    requireMock('cloudant', () => ({
      db: {
        use: () => ({
          find: cloudant_find_stub
        })
      }
    }));

    requireMock('openwhisk', () => ({ actions: { invoke: ow_stub } }));

    const config = {
      cloudant: {
        url: 'http://cloudant.url',
        database: 'db'
      },
      connectors: {
        newuser: [
          {
            channel: 'channel',
            action: 'package/channel-newuser'
          }
        ]
      }
    };

    const payload = {
      input: {
        user: '1234',
        channel: 'channel'
      }
    }

    requireMock.reRequire('cloudant');

    return requireMock.reRequire('./index').main({ payload, config }).then(result => {
      chai.expect(cloudant_find_stub.callCount).to.equal(1);

      chai.expect(ow_stub.getCall(0).args[0].name).to.equal('package/channel-newuser');
      chai.expect(ow_stub.getCall(0).args[0].blocking).to.be.true;
      chai.expect(ow_stub.getCall(0).args[0].result).to.be.true;
      chai.expect(ow_stub.getCall(0).args[0].params.payload.conversationcontext.user.channel_id).to.equal('1234');
      chai.expect(ow_stub.getCall(0).args[0].params.payload.conversationcontext.user.type).to.equal('user');

      chai.expect(result.statusCode).to.equal(200);
      chai.expect(result.payload.input.user).to.equal('1234');
      chai.expect(result.payload.conversationcontext.user.channel_id).to.equal('1234');
      chai.expect(result.payload.conversationcontext.user.firstname).to.equal('Egon');
      chai.expect(result.payload.conversationcontext.user.lastname).to.equal('Olsen');
    });
  });

  it('the newuser connector can have additional parameters configured', () => {
    const cloudant_find_stub = sinon.stub()
      .returns(Promise.resolve({
        docs: []
      }));

    const ow_stub = sinon.stub()
      .returns(Promise.resolve({
        statusCode: 200,
        payload: {
          input: {
            user: '1234',
            channel: 'channel'
          },
          conversationcontext: {
            user: {
              channel_id: '1234',
              type: 'user',
              firstname: 'Egon',
              lastname: 'Olsen'
            }
          }
        }
      }));

    requireMock('cloudant', () => ({
      db: {
        use: () => ({
          find: cloudant_find_stub
        })
      }
    }));

    requireMock('openwhisk', () => ({ actions: { invoke: ow_stub } }));

    const config = {
      cloudant: {
        url: 'http://cloudant.url',
        database: 'db'
      },
      connectors: {
        newuser: [
          {
            channel: 'channel',
            action: 'package/channel-newuser',
            parameters: {
              foo: 'bar'
            }
          }
        ]
      }
    };

    const payload = {
      input: {
        user: '1234',
        channel: 'channel'
      }
    }

    requireMock.reRequire('cloudant');

    return requireMock.reRequire('./index').main({ payload, config }).then(result => {
      chai.expect(cloudant_find_stub.callCount).to.equal(1);

      chai.expect(ow_stub.getCall(0).args[0].name).to.equal('package/channel-newuser');
      chai.expect(ow_stub.getCall(0).args[0].blocking).to.be.true;
      chai.expect(ow_stub.getCall(0).args[0].result).to.be.true;
      chai.expect(ow_stub.getCall(0).args[0].params.foo).to.equal('bar');
      chai.expect(ow_stub.getCall(0).args[0].params.payload.conversationcontext.user.channel_id).to.equal('1234');
      chai.expect(ow_stub.getCall(0).args[0].params.payload.conversationcontext.user.type).to.equal('user');

      chai.expect(result.statusCode).to.equal(200);
      chai.expect(result.payload.input.user).to.equal('1234');
      chai.expect(result.payload.conversationcontext.user.channel_id).to.equal('1234');
      chai.expect(result.payload.conversationcontext.user.firstname).to.equal('Egon');
      chai.expect(result.payload.conversationcontext.user.lastname).to.equal('Olsen');
    });
  });

  it('should return an error if database has an exception', () => {
    const cloudant_find_stub = sinon.stub()
      .returns(Promise.reject({
        statusCode: 503,
        error: {
          message: 'Some error'
        }
      }));

    requireMock('cloudant', () => ({
      db: {
        use: () => ({
          find: cloudant_find_stub
        })
      }
    }));

    const config = {
      cloudant: {
        url: 'http://cloudant.url',
        database: 'db'
      }
    };

    const payload = {
      input: {
        user: '1234',
        channel: 'channel'
      }
    }

    requireMock.reRequire('cloudant');

    return requireMock.reRequire('./index').main({ payload, config })
      .then(result => {
        chai.expect(true).to.be.false;
      })
      .catch(result => {
        chai.expect(cloudant_find_stub.callCount).to.equal(1);
        chai.expect(result.statusCode).to.equal(503);
        chai.expect(result.error.message).to.equal('error fetching the user from the database');
        chai.expect(result.error.parameters.cause.error.message).to.equal('Some error');
        chai.expect(result.error.parameters.input).to.exist;
      });
  });

  it('should return an error if database has an exception', () => {
    const cloudant_find_stub = sinon.stub()
      .throws();

    requireMock('cloudant', () => ({
      db: {
        use: () => ({
          find: cloudant_find_stub
        })
      }
    }));

    const config = {
      cloudant: {
        url: 'http://cloudant.url',
        database: 'db'
      }
    };

    const payload = {
      input: {
        user: '1234',
        channel: 'channel'
      }
    }

    requireMock.reRequire('cloudant');

    return requireMock.reRequire('./index').main({ payload, config })
      .then(result => {
        chai.expect(true).to.be.false;
      })
      .catch(result => {
        chai.expect(cloudant_find_stub.callCount).to.equal(1);
        chai.expect(result.statusCode).to.equal(500);
        chai.expect(result.error.parameters.input).to.exist;
      });
  });

  it('returns an error if the newuser connector returns an error', () => {
    const cloudant_find_stub = sinon.stub()
      .returns(Promise.resolve({
        docs: []
      }));

    const ow_stub = sinon.stub()
      .returns(Promise.reject({
        statusCode: 500,
        error: {
          message: 'Some error'
        }
      }));

    requireMock('cloudant', () => ({
      db: {
        use: () => ({
          find: cloudant_find_stub
        })
      }
    }));

    requireMock('openwhisk', () => ({ actions: { invoke: ow_stub } }));

    const config = {
      cloudant: {
        url: 'http://cloudant.url',
        database: 'db'
      },
      connectors: {
        newuser: [
          {
            channel: 'channel',
            action: 'package/channel-newuser',
            parameters: {
              foo: 'bar'
            }
          }
        ]
      }
    };

    const payload = {
      input: {
        user: '1234',
        channel: 'channel'
      }
    }

    requireMock.reRequire('cloudant');

    return requireMock.reRequire('./index').main({ payload, config }).then(result => {
      chai.expect(true).to.be.false;
    })
    .catch(result => {
      chai.expect(cloudant_find_stub.callCount).to.equal(1);
      chai.expect(ow_stub.callCount).to.equal(1);

      chai.expect(ow_stub.getCall(0).args[0].name).to.equal('package/channel-newuser');
      chai.expect(ow_stub.getCall(0).args[0].blocking).to.be.true;
      chai.expect(ow_stub.getCall(0).args[0].result).to.be.true;
      chai.expect(ow_stub.getCall(0).args[0].params.foo).to.equal('bar');
      chai.expect(ow_stub.getCall(0).args[0].params.payload.conversationcontext.user.channel_id).to.equal('1234');
      chai.expect(ow_stub.getCall(0).args[0].params.payload.conversationcontext.user.type).to.equal('user');

      chai.expect(result.statusCode).to.equal(503);
      chai.expect(result.error.message).to.equal('error calling action package/channel-newuser');
    });
  });

  it('returns an error if the newuser connector throws an exception', () => {
    const cloudant_find_stub = sinon.stub()
      .returns(Promise.resolve({
        docs: []
      }));

    const ow_stub = sinon.stub()
      .throws();

    requireMock('cloudant', () => ({
      db: {
        use: () => ({
          find: cloudant_find_stub
        })
      }
    }));

    requireMock('openwhisk', () => ({ actions: { invoke: ow_stub } }));

    const config = {
      cloudant: {
        url: 'http://cloudant.url',
        database: 'db'
      },
      connectors: {
        newuser: [
          {
            channel: 'channel',
            action: 'package/channel-newuser',
            parameters: {
              foo: 'bar'
            }
          }
        ]
      }
    };

    const payload = {
      input: {
        user: '1234',
        channel: 'channel'
      }
    }

    requireMock.reRequire('cloudant');

    return requireMock.reRequire('./index').main({ payload, config }).then(result => {
      chai.expect(true).to.be.false;
    })
    .catch(result => {
      chai.expect(cloudant_find_stub.callCount).to.equal(1);
      chai.expect(ow_stub.callCount).to.equal(1);

      chai.expect(ow_stub.getCall(0).args[0].name).to.equal('package/channel-newuser');
      chai.expect(ow_stub.getCall(0).args[0].blocking).to.be.true;
      chai.expect(ow_stub.getCall(0).args[0].result).to.be.true;
      chai.expect(ow_stub.getCall(0).args[0].params.foo).to.equal('bar');
      chai.expect(ow_stub.getCall(0).args[0].params.payload.conversationcontext.user.channel_id).to.equal('1234');
      chai.expect(ow_stub.getCall(0).args[0].params.payload.conversationcontext.user.type).to.equal('user');

      chai.expect(result.statusCode).to.equal(500);
      chai.expect(result.error.message).to.equal('internal error during action execution');
    });
  });
});
const _ = require('lodash');
const chai = require('chai');
const requireMock = require('mock-require');
const sinon = require('sinon');

describe('middleware-output-transform-signals', () => {
  it('fetches the messagetemplate based on signals', () => {
    const config = {
      messages: {
        key: {
          path: {
            output: 'Hello you!'
          }
        }
      }
    };

    const payload = {
      context: {
        output: {
          channel: 'facebook',
          messages: '$key.path'
        }
      }
    }

    return require('./index').main({ payload, config }).then(result => {
      chai.expect(result.statusCode).to.equal(200);
      chai.expect(result.payload.context.output.messages).to.equal('Hello you!');
    });
  });

  it('allows to specify channel and locale specific outputs', () => {
    const config = {
      messages: {
        key: {
          path: {
            de_DE: {
              facebook: {
                output: 'Hallo Facebook!'
              }
            },
            facebook: {
              output: 'Hello Facebook!'
            },
            output: 'Hello you!'
          }
        }
      }
    };

    const payload = {
      context: {
        output: {
          channel: 'facebook',
          messages: '$key.path'
        }
      }
    }

    return require('./index').main({ payload, config }).then(result => {
      chai.expect(result.statusCode).to.equal(200);
      chai.expect(result.payload.context.output.messages).to.equal('Hello Facebook!');
    });
  });

  it('allows to specify channel and locale specific outputs', () => {
    const config = {
      messages: {
        key: {
          path: {
            de_DE: {
              facebook: {
                output: 'Hallo Facebook!'
              }
            },
            facebook: {
              output: 'Hello Facebook!'
            },
            output: 'Hello you!'
          }
        }
      }
    };

    const payload = {
      context: {
        output: {
          channel: 'facebook',
          messages: '$key.path'
        }
      }
    }

    return require('./index').main({ payload, config }).then(result => {
      chai.expect(result.statusCode).to.equal(200);
      chai.expect(result.payload.context.output.messages).to.equal('Hello Facebook!');
    });
  });

  it('allows to specify channel and locale specific outputs', () => {
    const config = {
      messages: {
        key: {
          path: {
            de_DE: {
              facebook: {
                output: 'Hallo Facebook!'
              }
            },
            facebook: {
              output: 'Hello Facebook!'
            },
            output: 'Hello you!'
          }
        }
      }
    };

    const payload = {
      context: {
        output: {
          channel: 'facebook',
          locale: 'de_DE',
          messages: '$key.path'
        }
      }
    }

    return require('./index').main({ payload, config }).then(result => {
      chai.expect(result.statusCode).to.equal(200);
      chai.expect(result.payload.context.output.messages).to.equal('Hallo Facebook!');
    });
  });
});
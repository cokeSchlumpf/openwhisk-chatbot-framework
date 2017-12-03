const _ = require('lodash');
const chai = require('chai');
const requireMock = require('mock-require');
const sinon = require('sinon');

describe('middleware-output-transform-signals', () => {
  it('fetches the messagetemplate based on signals', () => {
    const config = {
      messages: [
        {
          '$intent': 'hello',
          value: [
            {
              '$intent': 'hello',
              '$signal2': 'foo',
              value: {
                text: 'Hello you!'
              }
            },
            {
              '$intent': 'blabla',
              value: {
                text: 'Not such a good ranking'
              }
            }
          ]
        },
        {
          '$intent': 'foo',
          value: {
            text: 'Fooo Baar'
          }
        }
      ]
    };

    const payload = {
      context: {
        output: {
          channel: 'facebook',
          messages: '$intent:hello'
        }
      }
    }

    return require('./index').main({ payload, config }).then(result => {
      chai.expect(result.statusCode).to.equal(200);
      chai.expect(result.payload.context.output.messages).to.equal('Hello you!');
    });
  });

  it('fetches the messagetemplate based on signals (test with multipe signals', () => {
    const config = {
      messages: [
        {
          '$intent': 'hello',
          value: [
            {
              '$signal': 'bar',
              value: {
                text: 'Hello you!'
              }
            },
            {
              '$signal': 'foo',
              value: {
                text: 'Not such a good ranking'
              }
            }
          ]
        },
        {
          '$intent': 'foo',
          value: {
            text: 'Fooo Baar'
          }
        }
      ]
    };

    const payload = {
      context: {
        output: {
          channel: 'facebook',
          messages: '$intent:hello $signal:bar'
        }
      }
    }

    return require('./index').main({ payload, config }).then(result => {
      chai.expect(result.statusCode).to.equal(200);
      chai.expect(result.payload.context.output.messages).to.equal('Hello you!');
    });
  });

  it('doesn\'t modify messages if now template is found', () => {
    const config = {
      messages: [
        {
          '$intent': 'hello',
          value: [
            {
              '$signal': 'bar',
              value: {
                text: 'Hello you!'
              }
            },
            {
              '$signal': 'foo',
              value: {
                text: 'Not such a good ranking'
              }
            }
          ]
        },
        {
          '$intent': 'foo',
          value: {
            text: 'Fooo Baar'
          }
        }
      ]
    };

    const payload = {
      context: {
        output: {
          channel: 'facebook',
          messages: '$intent:goodbye $signal:bar'
        }
      }
    }

    return require('./index').main({ payload, config }).then(result => {
      chai.expect(result.statusCode).to.equal(200);
      chai.expect(result.payload.context.output.messages).to.equal('$intent:goodbye $signal:bar');
    });
  });

  it('replaces all messages in output-context when an array is provided', () => {
    const config = {
      messages: [
        {
          '$intent': 'hello',
          value: [
            {
              '$signal': 'bar',
              value: {
                text: 'Hello you!'
              }
            },
            {
              '$signal': 'foo',
              value: {
                text: 'Not such a good ranking'
              }
            }
          ]
        },
        {
          '$intent': 'foo',
          value: {
            text: 'Fooo Baar'
          }
        }
      ]
    };

    const payload = {
      context: {
        output: {
          channel: 'facebook',
          messages: [
            '$intent:hello $signal:bar',
            '$signal:foo',
            '$intent:hello $signal:foo'
          ]
        }
      }
    }

    return require('./index').main({ payload, config }).then(result => {
      chai.expect(result.statusCode).to.equal(200);
      chai.expect(result.payload.context.output.messages[0]).to.equal('Hello you!');
      chai.expect(result.payload.context.output.messages[1]).to.equal('$signal:foo');
      chai.expect(result.payload.context.output.messages[2]).to.equal('Not such a good ranking');
    });
  });

  it('doesn\'t modify messages if now template is found and message doesn\'t include signals', () => {
    const config = {
      messages: [
        {
          '$intent': 'hello',
          value: [
            {
              '$signal': 'bar',
              value: {
                text: 'Hello you!'
              }
            },
            {
              '$signal': 'foo',
              value: {
                text: 'Not such a good ranking'
              }
            }
          ]
        },
        {
          '$intent': 'foo',
          value: {
            text: 'Fooo Baar'
          }
        }
      ]
    };

    const payload = {
      context: {
        output: {
          channel: 'facebook',
          messages: 'Hello World!'
        }
      }
    }

    return require('./index').main({ payload, config }).then(result => {
      chai.expect(result.statusCode).to.equal(200);
      chai.expect(result.payload.context.output.messages).to.equal('Hello World!');
    });
  });
});
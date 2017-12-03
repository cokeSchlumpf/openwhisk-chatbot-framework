const _ = require('lodash');
const chai = require('chai');
const requireMock = require('mock-require');
const sinon = require('sinon');

describe('middleware-output-transform-simple', () => {
  it('selects a random value if a message is an array', () => {
    const config = {

    };

    const payload = {
      context: {
        output: {
          channel: 'facebook',
          messages: [
            [
              "a",
              "b",
              "c"
            ],
            "Hello World!"
          ]
        }
      }
    }

    return require('./index').main({ payload, config }).then(result => {
      chai.expect(result.statusCode).to.equal(200);
      chai.expect(result.payload.context.output.messages[0]).to.be.oneOf(['a', 'b', 'c']);
      chai.expect(result.payload.context.output.messages[1]).to.equal('Hello World!');
    });
  });

  it('transforms messages sequences', () => {
    const config = {

    };

    const payload = {
      context: {
        output: {
          channel: 'facebook',
          messages: [
            [
              "a",
              "b",
              "c"
            ],
            {
              seq: [
                'message 1',
                { typing_on: true },
                'message 2',
                [
                  '1',
                  '2',
                  '3'
                ]
              ]
            }
          ]
        }
      }
    }

    return require('./index').main({ payload, config }).then(result => {
      chai.expect(result.statusCode).to.equal(200);
      chai.expect(result.payload.context.output.messages[0]).to.be.oneOf(['a', 'b', 'c']);
      chai.expect(result.payload.context.output.messages[1]).to.equal('message 1');
      chai.expect(result.payload.context.output.messages[2].typing_on).to.be.true;
      chai.expect(result.payload.context.output.messages[3]).to.equal('message 2');
      chai.expect(result.payload.context.output.messages[4]).to.be.oneOf(['1', '2', '3']);
    });
  });

  it('selects does not randomly select a value if context.messages is an array of spring - it\'s considered to be a sequence', () => {
    const config = {

    };

    const payload = {
      context: {
        output: {
          channel: 'facebook',
          messages: [
            "a",
            "b",
            "c"
          ]
        }
      }
    }

    return require('./index').main({ payload, config }).then(result => {
      chai.expect(result.statusCode).to.equal(200);
      chai.expect(result.payload.context.output.messages[0]).to.equal('a');
      chai.expect(result.payload.context.output.messages[1]).to.equal('b');
      chai.expect(result.payload.context.output.messages[2]).to.equal('c');
    });
  });
});
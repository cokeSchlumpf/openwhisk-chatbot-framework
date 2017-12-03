const _ = require('lodash');
const chai = require('chai');
const requireMock = require('mock-require');
const sinon = require('sinon');

describe('middleware-output-transform-templates', () => {
  it('renders messages as mustache templates', () => {
    const config = {
 
    };

    const payload = {
      conversationcontext: {
        user: {
          name: 'Egon'
        }
      },
      context: {
        output: {
          channel: 'facebook',
          messages: 'Hello {{{ conversationcontext.user.name }}}!'
        }
      }
    }

    return require('./index').main({ payload, config }).then(result => {
      chai.expect(result.statusCode).to.equal(200);
      chai.expect(result.payload.context.output.messages).to.equal('Hello Egon!');
    });
  });

  it('renders multiple messages as mustache templates', () => {
    const config = {
 
    };

    const payload = {
      conversationcontext: {
        user: {
          name: 'Egon',
          lastname: 'Olsen'
        }
      },
      context: {
        output: {
          channel: 'facebook',
          messages: [
            'Hello {{{ conversationcontext.user.name }}}!',
            'Your lastname is {{{ conversationcontext.user.lastname }}}'
          ]
        }
      }
    }

    return require('./index').main({ payload, config }).then(result => {
      chai.expect(result.statusCode).to.equal(200);
      chai.expect(result.payload.context.output.messages[0]).to.equal('Hello Egon!');
      chai.expect(result.payload.context.output.messages[1]).to.equal('Your lastname is Olsen');
    });
  });

  it('renders ignores objects as messages', () => {
    const config = {
 
    };

    const payload = {
      conversationcontext: {
        user: {
          name: 'Egon',
          lastname: 'Olsen'
        }
      },
      context: {
        output: {
          channel: 'facebook',
          messages: [
            'Hello {{{ conversationcontext.user.name }}}!',
            { typing_on: true },
            'Your lastname is {{{ conversationcontext.user.lastname }}}'
          ]
        }
      }
    }

    return require('./index').main({ payload, config }).then(result => {
      chai.expect(result.statusCode).to.equal(200);
      chai.expect(result.payload.context.output.messages[0]).to.equal('Hello Egon!');
      chai.expect(result.payload.context.output.messages[1].typing_on).to.be.true;
      chai.expect(result.payload.context.output.messages[2]).to.equal('Your lastname is Olsen');
    });
  });
});
const _ = require('lodash');
const chai = require('chai');
const requireMock = require('mock-require');
const sinon = require('sinon');

const action = require('./index');

describe('channels-facebook.newuser', () => {
  it('fetches the user data from facebook', () => {
    const requestStub = sinon.stub()
      .onCall(0).returns(Promise.resolve({
        "first_name": "Peter",
        "last_name": "Chang",
        "profile_pic": "https://fbcdn-profile-a.akamaihd.net/hprofile-ak-xpf1/v/t1.0-1/p200x200/13055603_10105219398495383_8237637584159975445_n.jpg?oh=1d241d4b6d4dac50eaf9bb73288ea192&oe=57AF5C03&__gda__=1470213755_ab17c8c8e3a0a447fed3f272fa2179ce",
        "locale": "en_US",
        "timezone": -7,
        "gender": "male"
      }));

    requireMock('request-promise', requestStub);

    // sample configuration used for the test
    const config = {
      facebook: {
        access_token: 'foobar'
      }
    }

    const user = {
      facebook_id: '1234'
    }

    requireMock.reRequire('request-promise');

    return requireMock.reRequire('./index').main({ user, config })
      .then(result => {
        chai.expect(requestStub.getCall(0).args[0].uri).to.contain('1234');
        chai.expect(requestStub.getCall(0).args[0].qs.access_token).to.contain('foobar');

        chai.expect(result.payload.conversationcontext.user.first_name).to.equal('Peter');
        chai.expect(result.payload.conversationcontext.user.last_name).to.equal('Chang');
      });
  });
});
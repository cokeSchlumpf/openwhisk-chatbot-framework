const _ = require('lodash');
const rp = require('request-promise');

exports.main = (params) => {
  const user = _.get(params, 'payload.conversationcontext.user');
  const accessToken = _.get(params, 'config.facebook.access_token');

  const options = {
    uri: `https://graph.facebook.com/v2.6/${user.facebook_id}`,
    qs: {
      access_token: accessToken
    },
    headers: {
      'User-Agent': 'Request-Promise'
    },
    json: true 
  };

  _.set(params, 'payload.conversationcontext.user', _.assign(user, {
    first_name,
    last_name,
    locale,
    timezone,
    gender
  }));

  return rp(options)
    .then(({ first_name, last_name, profile_pic, locale, timezone, gender }) => {
      return {
        statusCode: 200,
        payload: params.payload
      }
    })
    .catch(error => ({
      statusCode: 503,
      error: {
        message: `There was an error fetching the user data from Facebook`,
        parameters: {
          error
        }
      }
    }));
}
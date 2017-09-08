const _ = require('lodash');

exports.main = (params) => {
  console.log(_.keys(params));
  console.log(params.request);
  console.log('----');
  console.log(params.payload);
  return {
    statusCode: 200,
    payload: {
      id: params.payload.id,
      input: {
        channel: params.payload.input.channel,
        user: '12345',
        message: 'Hello World!'
      }
    },
    response: {
      statusCode: 200,
      body: {
        "ok": true
      }
    }
  }
};
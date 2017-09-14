const _ = require('lodash');

exports.main = (params) => {
  console.log(_.keys(params));
  console.log(params.request);
  console.log('----');
  console.log(params.payload);
  return {
    statusCode: 200,
    input: {
      user: '12345',
      message: 'Hello World!'
    },
    response: {
      statusCode: 200,
      body: {
        "ok": true
      }
    }
  }
};
const _ = require('lodash');

exports.main = ({ message, user }) => {
  console.log(message);

  return Promise.resolve({
    statusCode: 200
  });
}
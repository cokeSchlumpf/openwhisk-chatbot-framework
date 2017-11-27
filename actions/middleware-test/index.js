exports.main = (params) => {
  return Promise.resolve({
    statusCode: 200,
    payload: params.payload
  });
}
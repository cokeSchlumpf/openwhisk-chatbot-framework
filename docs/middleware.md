# Middleware actions

Middleware actions can be called as part of a message processing pipeline. A middleware can be called asynchronuous and synchronuous. If the middleware is called synchronuous it may change the payload of the current processing pipeline.

## Input parameters

When a middleware action is called it receives the following action parameter:

```json
{
  "config": {
    // The current configuration object
  },
  "payload": {
    // The payload of the current process
  }
}
```

## Output parameters

A middleware should produce a result with the following content:

```json
{
  "statusCode": 200,
  "payload": {
    // The payload which may differ from the input payload.
  }
}
```

If a `statusCode` of `2xx` is returend, the middleware action is considered to be successful. Otherwise the result will be identified as an error. To add addional error information to the response, the action may return an error like in the following example.

```json
{
  "statusCode": 401,
  "error": {
    "message": "The required parameter 'foo' is missing.",
    "parameters": {
      "input": {
        // You may pass the input payload here for debugging purposes
      }
    }
  }
}
```

When a middleware is called synchronuously and it returns a `statusCode` of `201`, the processing of middlewares will be discontinued and processing will be finished.
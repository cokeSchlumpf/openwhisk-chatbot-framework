# Channels

Channels are different methods to interact with your bot. E.g. your bot may have an interface for Facebook Messenger, Website, Whats App, etc. or even non-chat interfaces like E-Mail.

Each channel may have an `input-` and `output-connector`. Additionally a channel may have a `newuser-connector` which is called if a new user needs to be initialized and the channel is required to fetch more user data.

The Cloud Functions Chatbot Framework already includes connectors for the following channels:

* Facebook - **TODO: Add documentation**

## Configuration

Channels need to be defined in the framework configuration as follows:

```json
{
  "connectors": {
    "input": [
      {
        "channel": "facebook",
        "action": "serverless-botpack/channels-facebook-input",
        "parameters": {}
      },
      {
        "channel": "other",
        "action": "other_package/other-input",
        "parameters": {
          "some_parameter": "any_value"
        }
      }
    ],
    "newuser": [
      {
        "channel": "facebook",
        "action": "serverless-botpack/channels-facebook-newuser",
        "parameters": {}
      }
    ],
    "output": [
      {
        "channel": "facebook",
        "action": "serverless-botpack/channels-facebook-input",
        "parameters": {}
      },
      {
        "channel": "other",
        "action": "other_package/other-output",
        "parameters": {}
      }
    ]
  }
}
```

## Input connectors

The input-connectors are called by the frameworks central messaging REST endpoint. They are called in the order as they're defined in the configuration.

An input-connector action will receive the following parameters:

```json
{
  "request": {
    "body": { }, // The parsed HTTP request, usually a JSON object
    "url": "http://some.url", // The target url of the HTTP request
    "method": "POST", // The method of the HTTP request
    "query": "?param=foo" // The query string of the request
  },
  // Additional parameters which are set in the configuration
}
```

*Note: Query parameters are automatically added to the bodies JSON object.*

The result of the action should have the following structure:

```json
{
  statusCode: 200,
  input: {
    user: '<USER_ID>',
    message: 'The message which was received.'
  },
  response: {
    statusCode: 200, // the HTTP response status code
    body: { }, // an optional response body which should be sent as HTTP response
  }
}
```

Multiple inputs, are also allowed:

```json
{
  statusCode: 200,
  input: [
    {
      user: '<USER_ID>',
      message: 'The message which was received.'
    },
    {
      user: '<USER_ID>',
      message: 'The message which was received.'
    }
  ],
  response: {
    statusCode: 200, // the HTTP response status code
    body: { }, // an optional response body which should be sent as HTTP response
  }
}
```

The input connector may return in three different ways:

**Accepted (statusCode: 200):** Like in the example above, the connector detects the request as valid for its channel and returns the received messages and user ids.

**Accepted (statusCode: 204):** The connector detects the request as a valid request for its channel, but the request does not contain any messages. This may be required for verification calls, healthchecks, etc. In that case the `input` can be undefined or empty.

**Not applicable (statusCode: 422):** If the connector does not detect a valid request, it should return a statusCode of `422`.
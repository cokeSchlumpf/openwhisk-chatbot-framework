# QuickStart Guide

To build a simple Hello World bot in 3 steps, prepare a `package.parameters.json` with the following content:

```json
{
  "config": {
    "connectors": {
      "input": [
        {
          "channel": "http",
          "action": "channels-http-input",
          "parameters": {}
        }
      ],
      "output": [
        {
          "channel": "http",
          "action": "channels-http-output",
          "parameters": {}
        }
      ]
    },
    "middleware": [
      {
        "action": "middleware-static-message",
        "parameters": {
          "message": "Hello my friend!"
        }
      },
      {
        "action": "middleware-output-send"
      }
    ]
  }
}
```
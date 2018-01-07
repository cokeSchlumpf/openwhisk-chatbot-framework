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
    ],
    "openwhisk": {
      "package": "sample-bot"
    }
  }
}
```

No create a pakcage binding with this JSON file to your OpenWhisk Space:

```bash
wsk package bind /wsk-chatbot-framework_prod/v1 sample-bot -P package.parameters.json
```

Create accessable API

```
wsk package create sample-bot-api

wsk action update sample-bot-api/core-input \
  --sequence sample-bot/core-input \
  --web true
```

Sample CURL call

```bash
curl https://openwhisk.eu-de.bluemix.net/api/v1/web/wsk-chatbot-framework_sample/sample-bot-api/core-input?message=Hello%20World
```
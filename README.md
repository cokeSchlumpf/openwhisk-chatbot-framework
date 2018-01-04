# [In Work] Serverless Botpack

Serverless Botpack is framework to assemble and create serverless chatbot applications running on [Apache OpenWhisk](https://openwhisk.incubator.apache.org/).

The framework consists of two parts:

* **Action Library.** A ready-to-use set of OpenWhisk actions which can be bind to your configuration to build the bot app.

* **Node JS Library.** A Node JS library which helps to create custom actions for Serverless Botpack.

## Key Features

Botpack seamlessly integrates with existing Bot frameworks and Services like [Watson Conversation Service](http://todo), [Botkit](http://) ....

* Building multi-channel chatbots
* Building multi-language chatbots
* Integrating different cognitive services to build a more-and-more human like bot

## Getting Started

The getting started guide will show you how to build your own.

## Configuration

The foundation of Serverless Botpack is the configuration which is injected into the actions of Serverless Botpack OpenWhisk actions. Amlost every action relies on several configuration values to get its work done.

As you have seen in the Getting Started example, an own instance of Serverless Botpack can be created by creating an OpenWhisk package binding:

```bash
wsk package bind serverless-botpack-generic my-serverless-bot -P package.parameters.json

wsk action update my-serverless-bot-api/core-input \
        --sequence serverless-botpack-generic/core-input \
        --web true
```

All configuration can be put into the `package.parameters.json` file. The minimum setup of the file looks as follows:

```json
{
  "config": {
    "cloudant": {
      "database": "<DATABASE_NAME>",
      "url": "<DATABASE_URL>"
    },
    "connectors": {
      "input": [
        {
          "channel": "test",
          "action": "my-serverless-bot/channels-simple-input",
          "parameters": {}
        }
      ],
      "output": [
        {
          "channel": "test",
          "action": "my-serverless-bot/channels-simple-output",
          "parameters": {}
        }
      ]
    },
    "logger": {
      "level": "INFO"
    },
    "messages": {
      "#hello": {
        "text": "Hello {{{name}}}",
        "text.de_DE": "Hallo {{{name}}}"
      },
      "#goodbye": {
        "text": [
          "Auf wiedersehen!",
          "Bis zum nächsten mal, {{{name}}}!"
        ]
      }
    },
    "middleware": [
      {
        "action": "my-serverless-bot/middleware-test",
        "parameters": {}
      } 
    ],
    "openwhisk": {
      "package": "my-serverless-bot"
    }
  }
}
```

Depending on the connectors and middleware which is configured, additional configuration values might be required.

## Extending Serverless Botpack

Serverless Botpack can be extended by own actions for creating connectors and middleware.

# Basics

Building simple chatbots is quite easy; building complex chatbots with many integrations, channels and services is harder. But don't be fooled - Getting started with OpenWhisk Chatbot Framework is incredibly simple, even though it enables you to extend your chatbot with many functions easily. 

To get started without struggle, you should bring some basic skills of Apache OpenWhisk with you, as well as an instance of OpenWhisk which you can use. This can be a self hosted or a free available, e.g. [IBM Cloud Functions](https://console.bluemix.net/openwhisk). For the examples will use the [OpenWhisk CLI](https://github.com/apache/incubator-openwhisk-cli). If you haven't installed and if you are using IBM Cloud, you can download it from here: [https://console.bluemix.net/openwhisk/learn/cli](https://console.bluemix.net/openwhisk/learn/cli).

The guide will introduce you step by step into the most important components of OpenWhisk Chatbot Framework by building a chatbot; starting simple, becoming more advanced.

## The "Hello World!" Bot

Let's start with a quite simple one: The classical "Hello World!" example.

**package.parameters.json** is the single configuration file to configure the functionality and behaviour of the bot. For our "Hello World!" example, in an empty directory of your choice, create a file called `package.parameters.json` with the following content:

```json
{
  "config": {
    "connectors": {
      "input": [
        {
          "channel": "http",
          "action": "channels-http-input"
        }
      ],
      "output": [
        {
          "channel": "http",
          "action": "channels-http-output"
        }
      ]
    },
    "middleware": [
      { 
        "action": "middleware-static-message",
        "parameters": {
          "message": "Hello World!"
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

We'll have a close look soon to the contents of this file. For now just continue on the terminal and create an [OpenWhisk package binding](https://github.com/apache/incubator-openwhisk/blob/master/docs/packages.md#creating-and-using-package-bindings) with `package.parameters.json`:

```bash
$ cd /your/directory/with/package.parameters.json
$ wsk package bind /wsk-chatbot-framework_prod/v1 sample-bot -P package.parameters.json
ok: created binding sample-bot
```

**core-input** is an OpenWhisk action provided by the OpenWhisk Chatbot Framework which acts as the central entrypoint for all messages received via any channel. This action needs to be provided as [OpenWhisk web action](https://console.bluemix.net/docs/openwhisk/openwhisk_webactions.html) to make your chatbot accessible. To expose the action via HTTP(S), execute the following commands

```bash
$ wsk package create sample-bot-api
ok: created package sample-bot-api

$ wsk action create sample-bot-api/core-input \
  --sequence sample-bot/core-input \
  --web true
ok: created action sample-bot-api/core-input
```

Believe it or not. You're done with the first very simple "Hello World" bot. To test your bot, call it via `curl`:

```bash 
$ curl https://<openwhisk_endpoint>/api/v1/web/<your_namespace>/sample-bot-api/core-input?message=Hello

# For example:
$ curl https://openwhisk.eu-de.bluemix.net/api/v1/web/wsk-chatbot-framework_sample/sample-bot-api/core-input?message=Hello
{
  "messages": [
    "Hello World!"
  ],
  "conversationcontext": {}
  "context": {}
}
```

**Note: The first call might take a few seconds as OpenWhisk needs to prepare everything. On the next call, all the actions will be warmed up and the response will be presented much faster. Try it out.**
# core-transform

This action transforms a bot intent into an actual message which can be handled by an output connector.

## Input parameters:

```json
{
  "payload": {
    "conversationcontext": {
      "user": {
        "_id": "bar", 
        "CHANNEL_id": "foo",
        "locale": "DE_de", // optional
      }
    },
    "output": {
      "channel": "CHANNEL",
      "intent": "#hello",
      "context": { // optional
        "name": "Egon",
        "age": 12
      }
    }
  }
}
```

Bot Expressions can be defined within configuration or as configuration value in the database.

```json
"config": {
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
  }
}
```

# core-input

The core-input middleware component is the entry-point for messages that are received via any channel.

The component initializes the middleware pipeline with the following input structure:

```json
{
  "payload": {
    "id":"<id>",
    "input": {
      "channel": "<channel name>",
      "user": "<user id>",
      "message": "<message>",
      "received": 1511624654124
    }
  }
}
```
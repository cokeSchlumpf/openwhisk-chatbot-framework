# Payload

| Field                   | Purpose |
|-|-|
| `input`                 | Stores information about the input messages received via the input connector from a channel. |
| `context`               | The pipeline context of the current request. |
| `conversationcontext`   | The overall context of the conversation between the user and the bot. |
| `output`                | Information about messages sent within the request processing. |
| `transient_context`     | Like `context`, but will not be persisted in the database when storing the payload. |


# Actions

## Refactored actions

| | Action                          | Modifies | Description |
|-|-|-|-|
| [x] | core-input                  | Yes      | The action which receives HTTP requests from different channels to initiate the pipeline. |
| [x] | core-middleware             | Yes      | The pipeline processing engine. |
| [x] | middleware-context-load     | Yes      | This action loads or initiates the context into the payload. |
| [x] | middleware-context-persist  | Yes      | This action persists the context from the payload in the database. |
| [x] | middleware-output-send      | Yes      | This action calls output-connectors for messages defined in the payload context. |
| [x] | middleware-user-load        | Yes      | This action loads or initiates the user into the payload. |
| [x] | middleware-user-persist     | Yes      | This action persists the user from payload.conversationcontext to the database. |

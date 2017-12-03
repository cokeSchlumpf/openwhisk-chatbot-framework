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

| | Action                                    | Modifies | Description |
|-|-|-|-|
| [x] | core-input                            | Yes      | The action which receives HTTP requests from different channels to initiate the pipeline. |
| [x] | core-middleware                       | Yes      | The pipeline processing engine. |
| [x] | middleware-context-load               | Yes      | This action loads or initiates the context into the payload. |
| [x] | middleware-context-persist            | Yes      | This action persists the context from the payload in the database. |
| [x] | middleware-output-send                | Yes      | This action calls output-connectors for messages defined in the payload context. |
| [x] | middleware-output-templates-fetch     | Yes      | This middleware fetches output-messages into transient_context from an action defined in the configuration. These messages can be used by middleare-output-transform-* actions. |
| [x] | middleware-output-transform-keys      | Yes      | This middleware transforms message keys into messages within payload context. |
| [x] | middleware-output-transform-signals   | Yes      | This middleware transforms signals into messages within payload context. |
| [x] | middleware-output-transform-simple    | Yes      | This middleware transforms sequences and array which include random variations. |
| [x] | middleware-output-transform-templates | Yes      | This middleware renders mustache templates for output messages. |
| [x] | middleware-payload-persist            | Yes      | This middleware persists the current payload in the database. |
| [x] | middleware-services-wcs               | Yes      | A middleware to call IBM Watson Conversation Service. |
| [x] | middleware-user-load                  | Yes      | This action loads or initiates the user into the payload. |
| [x] | middleware-user-persist               | Yes      | This action persists the user from payload.conversationcontext to the database. |

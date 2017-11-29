# Actions

## Refactored actions

| | Action                          | Modifies | Description |
|-|-|-|-|
| [x] | core-input                  | Yes      | The action which receives HTTP requests from different channels to initiate the pipeline. |
| [x] | core-middleware             | Yes      | The pipeline processing engine. |
| [x] | middleware-context-load     | Yes      | This action loads or initiates the context into the payload. |
| [x] | middleware-context-persist  | Yes      | This action persists the context from the payload in the database. |
| [x] | middleware-user-load        | Yes      | This action loads or initiates the user into the payload. |
| [x] | middleware-user-persist     | Yes      | This action persists the user from payload.conversationcontext to the database. |

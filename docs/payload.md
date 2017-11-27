# Payload

The following table depicts the common fields of the request payload:

|Field|Type|Description|
|-|-|-|
| `payload`                             | `object`         | The payload root object |
| `payload.input`                       | `object`         | Data received from the input connector |
| `payload.input.user`                  | `string|number`  | The channel specific user id |
| `payload.input.channel`               | `string`         | The name of the channel |
| `payload.conversationcontext`         | `object`         | The context of the conversation |
| `payload.conversationcontext.user`    | `object`         | The user object |
# core-middleware

The core-middleware action executes a sequence of middleware-actions. This actions is initiated by default by [core-input](http://todo) for processing a received input, in this case it executes the middlewares which are defined in the [configuration](http://todo); but it can also called within another action to execute a sub-sequent sequence of middlewares, in that case the middlewares to be executed are passes as parameters.

core-middleware will call the defined sequence actions in the order they're defined, by default it will stop processing if one of the actions fails. This behaviour can be changed with `action.properties`, see below.

## Input

| Parameter                             | Description |
|-|-|
| `payload`                             | The current payload |
| `middleware` || `config.middleware`   | The middlewares to call in the sequence |

### `payload`

See detailed description [here](http://todo).

### `middleware` || `config.middleware`

`middleware` is an array of middleware definitions which should be called within the sequence, e.g. 

```json
{
  "middleware": [
    {
      "action": "package/action_00"
    },
    {
      "action": "package/action_01"
    }
  ]
}
```

Each action in the sequence must be a valid middleware. As in the example above a middleware is defined at least with the action name. Additionally `parameters` and `properties` can be defined.

```json
{
  "action": "package/action",
  "parameters": {
    "foo": "bar"
  },
  "properties": {
    "final": true
  }
}
```

The `parameters` will be passed to the middleware-action invocation. Properties may include the following values:

| Properterty           | Description |
|-|-|
| `final`               | The action will be executed, even if a preceeding action was failing. |
| `continue_on_error`   | If the action fails, it continues to execute the sequence. |

## Output

| Parameter       | Description |
|-|-|
| `statusCode`    | The execution result |
| `payload`       | The payload as it was changed by the middlewares |
| `processed`     | Details about the result of each middleware |
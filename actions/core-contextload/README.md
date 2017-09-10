# core-contextload

This action loads the context of a conversation, based on a given user object. The input parameters should contain a user object with at least one `_id` field (e.g. `_id`, `channelname_id`, etc.):

```json
{
  "user": {
    "_id": "12346",
    "profile": { ... }
  }
}
```

The user object can contain further data, this data will not be used to select a user from the database, but it will be used to create the user in the database if it does not exist.

```bash
cp -R _template new-action
```
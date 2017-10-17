# Database Views

`_design/type-views/_view/payloads`

```javascript
function (doc) {
  if (doc.type === "payload") {
    var input = doc.input !== undefined;
    var channel;
    
    try {
      channel = doc.input ? doc.input.channel : doc.output.sent[0].channel;
    } catch (error) {
      channel = 'n/a'
    }
    
    emit(doc.user, { input: input, channeL: channel });
  }
}
```

`_design/type-views/_view/logs`

```javascript
function (doc) {
  if (doc.type === "log") {
    emit(doc.timestamp, [ doc.level, doc.message ]); 
  }
}
```

`_design/type-views/_view/conversationcontexts`

```javascript
function (doc) {
  if (doc.type === "conversationcontext") {
    emit([doc.state && doc.state[0] ? doc.state[0].time : 0, doc.user], [ doc.state && doc.state[0] ? doc.state[0].state : 'n/a' ]); 
  }
}
```

`_design/type-views/_view/users`

```javascript
function (doc) {
  if (doc.type === "user") {
    emit(doc._id, [ doc.last_name, doc.first_name ]);
  }
}
```
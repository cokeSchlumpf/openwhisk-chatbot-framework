# core-contextpersist

This action checks whether the payload was already saved, if not the payload as well as the conversationcontext is stored in the database. Storing the context in the database can also be forced (`{ forced: true }`).

The action returns the new payload.
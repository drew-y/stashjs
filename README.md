# StashJS - Reactive Non-Persistent Data Store

Features:
- Works in both the browser and nodejs
- Mongo like api
- Fast and Lightweight

## Basic Usage Example

```javascript
const Stash = require('stashjs');

const users = new Stash();

users.insert({ firstname: "John", lastname: "Smith" });

users.findOne({ firstname: "John" }) // ({ firstname: "John", lastname: "Smith" }
```

## Documentation TODO ¯\\\_(ツ)_/¯

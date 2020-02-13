# Node Dot Hot 🔥🌶️🌋

Hot reloading for Node.js - in the simplest possible way.

## How it works
DotHot watches `require`'d files for changes (using `chokidar`).
When a module changes, it is deleted from `require.cache`.

It is up to you to re-require the module. In practice,
this means using late binding:

```js
myFunction () {
  require('module').doSomething()
}
```

instead of the usual:

```js
const {doSomething} = require('module')
myFunction () {
  doSomething()
}
```

It is also up to you to avoid memory leaks from global objects
that fail to be dereferenced upon deleting the module object.

## Usage

```
npm i dothot
node -r dothot your_main_script.js
```

The env var `NODE_HOT_OUT` can be `stdout`, `stderr` or a path to a file;
if it is set, debugging info is printed to that destination.

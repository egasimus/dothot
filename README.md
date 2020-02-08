# Node Dot Hot 🔥🌶️🌋

Hot reloading for Node.js in the simplest possible way.

## How it works
DotHot watches `require`'d files for changes (using `chokidar`).
When a module changes, it is deleted from `require.cache`.

It is up to you to re-require the module. In practice,
this means you need to do:

```js
myFunction () {
  require('module').doSomething()
}
```

instead of:

```js
const {doSomething} = require('module')
myFunction () {
  doSomething()
}
```

## Usage

```
npm i dothot
NODE_HOT_OUT=stdout node -r dothot your_main_script.js
```

NODE_HOT_OUT can be `stdout`, `stderr` or a path to a file.
If the file exists, it will be overwritten.

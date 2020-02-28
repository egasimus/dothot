# Node-DotHot 🔥🌶️🌋

Simple, smart hot reloading - now for the backend.

## How it works
DotHot allows you to edit your running Node.js application
without needing to restart it as often (or at all.)

DotHot watches `require`'d files for changes (using `chokidar`).
When you edit a module, DotHot deletes it from `require.cache`.
All existing references to things from that module are preserved as-is.
However, if you `require` the module anew, a curious thing happens:
`require` actually re-evaluates your module and gives you the updated version!

Now if, instead of this:

```js
var {doSomething} = require('module')
myFunction () {
  doSomething()
}
```

you do this:

```js
myFunction () {
  require('module').doSomething()
}
```

You can get away with restarting Node a lot less often!

Needless to say, it makes little sense to run this in production.

Furthermore, it is up to you to avoid memory leaks from global objects
that fail to be dereferenced upon deleting the module object (though a
restart of your program should clean those up.)

## Usage

```
npm i dothot
node -r dothot your_main_script.js
```

The env var `NODE_HOT_OUT` can be `stdout`, `stderr` or a path to a file;
if it is set, debugging info is printed to that destination.

## DotHot vs Nodemon

The main competitor in the space of preventing restarts to the Node.js process
and saving Node developers valuable time is `nodemon` (kudos @remy!). Here's
a quick comparison/list of reasons why you may prefer one over the other.

* Nodemon has more features, and is coding style agnostic. In fact, since it
  works on the filesystem level, it supports reloading programs in other
  languages besides JS! On the other hand, DotHot's design reminds you to keep
  state under control and write in a concise, functional style.
* DotHot does exactly one thing, and is ~150LOC, pulling in another ~4000 LOC
  of dependencies in 20 `node_modules`; for comparison, Nodemon is around
  ~2000LOC (which is pretty sweet) but depends on 102 NPM modules weighing in
  at another ~17000 LOC.
* Restarting your whole application every time a file changes is slower, and
  loses any in-memory state. This is especially noticeable if you're doing
  any heavy lifting at startup, perhaps prompting you to reach for an external
  datastore and a distributed paradigm where a more self-contained approach
  would've been cleaner.

Remember, software isn't going to solve itself on its own but is
known to do the opposite.

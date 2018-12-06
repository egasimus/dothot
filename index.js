module.exports = DotHot

function DotHot () {

  // process is an event emitter, let's hook onto it
  // TODO allow user to pass a custom event emitter
  var events = process

  // dependency graph
  var parents = {}
  var children = {}

  // patch hook into CJS loader method
  // TODO: support ESM modules if possible and necessary
  var requiredBeforeWatcher = []
  var Module = require('module')
  var builtins = Module.builtinModules || require('builtin-modules')
  var loadModule = Module._load
  Module._load = function _load (request, parent, isMain) {
    add(request, parent)
    return loadModule(request, parent, isMain)
  }

  // create an empty filesystem watcher
  // modules will be added manually upon require
  // TODO: manual mode: watcher disabled; read flush commands from line stream
  var watcher = require('chokidar').watch()
  watcher.on('change', flush)
  watcher.on('unlink', flush)
  requiredBeforeWatcher.forEach(function (filename) {
    watcher.add(filename)
  })

  return {
    events: events,
    watcher: watcher,
    parents: parents,
    children: children,
    add: add,
    flush: flush
  }

  function add (child, parent) {
    // get full file names
    if (builtins.indexOf(child) < 0) {
      child = Module._resolveFilename(child, parent)
    }

    // parent can be null for entrypoints
    if (parent) parent = parent.filename

    // add bidirectional links to dependency graphs
    if (!parents[child]) {
      parents[child] = [parent]
    } else if (parents[child].indexOf(parent) < 0) {
      parents[child].push(parent)
    }
    if (!children[parent]) {
      children[parent] = [child]
    } else if (children[parent].indexOf(child) < 0) {
      children[parent].push(child)
    }

    // emit cache hit/miss
    // always emits hit for builtins since they're not added to require.cache
    if (
      builtins.indexOf(child) < 0 &&
      Object.keys(require.cache).indexOf(child) < 0
    ) {
      events.emit('require-cache-miss', child, parent)
    } else {
      events.emit('require-cache-hit', child, parent)
    }

    // add to watcher
    if (watcher) {
      watcher.add(child)
    } else {
      requiredBeforeWatcher.push(child)
    }
  }

  function flush (filename) {
    require('clear-module')(filename)
    events.emit('require-cache-flush', filename)
    watcher.unwatch(filename)
  }

}

// to instrument a Node process:
// * set env var NODE_HOT_OUT
// * add `-r dothot` to `node` command line
if (module.parent && module.parent.id === 'internal/preload') {

  process.hot = DotHot()

  // env var NODE_HOT_OUT specifies an output path to log to
  // TODO: log cache hits
  // TODO: log (hi-res?) timestamps for all events
  if (process.env.NODE_HOT_OUT) {

    var output =
      (process.env.NODE_HOT_OUT === 'stdout') ? process.stdout :
      (process.env.NODE_HOT_OUT === 'stderr') ? process.stderr :
      require('fs').createWriteStream(process.env.NODE_HOT_OUT)

    process.hot.events.on('require-cache-miss', function (child, parent) {
      output.write(JSON.stringify(['require-cache-miss', child, parent])+'\n')
    })

    process.hot.events.on('require-cache-flush', function (filename) {
      output.write(JSON.stringify(['require-cache-flush', filename])+'\n')
    })

  }

}

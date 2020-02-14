module.exports = DotHot

var EVENTS = module.exports.events = {
  HIT:   'DotHot.Hit',
  MISS:  'DotHot.Miss',
  FLUSH: 'DotHot.Flush',
}

// to instrument a Node process, either
// * add `-r dothot` to `node` command line
// * require('dothot')(process) at entry

if (
  module.parent && // how do these conditions work?
  module.parent.id === 'internal/preload'
) {
  setupOutput(process.env.NODE_HOT_OUT, process)
  DotHot(process)
}

function DotHot (emitter) {

  // prevent duplicate binding
  if (emitter) {
    if (emitter._DotHot_) {
      return
    } else {
      emitter._DotHot_ = true;
    }
  }

  // dependency graph
  var parents  = {}
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
    emitter:  emitter,
    watcher:  watcher,
    parents:  parents,
    children: children,
    add:      add,
    flush:    flush
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
    if (emitter) {
      if (
        builtins.indexOf(child) < 0 &&
        Object.keys(require.cache).indexOf(child) < 0
      ) {
        emitter.emit(DotHot.events.MISS, child, parent)
      } else {
        emitter.emit(DotHot.events.HIT, child, parent)
      }
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
    if (emitter) {
      emitter.emit('require-cache-flush', filename)
    }
    watcher.unwatch(filename)
  }

}

function setupOutput (outputSpec, emitter) {
  if (!outputSpec) return

  var output =
    (outputSpec === 'stdout') ? process.stdout :
    (outputSpec === 'stderr') ? process.stderr :
    require('fs').createWriteStream(outputSpec)

  function log (event, data) {
    event = { event: event }
    Object.keys(data).forEach(function (key) { event[key] = data[key] })
    output.write(JSON.stringify(event))
    output.write('\n')
  }

  process.on('require-cache-miss', function (child, parent) {
    log(DotHot.events.MISS, { child: child, parent: parent })
  })

  process.on('require-cache-flush', function (filename) {
    log(DotHot.events.FLUSH, { filename: filename })
  })

}

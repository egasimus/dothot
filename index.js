module.exports = DotHot

function DotHot (events, watch, output, input) {

  events = events || require('process')
  var watcher
  var parents = {}
  var children = {}
  var entrypoints = []
  var Module = require('module')
  var builtins = Module.builtinModules || require('builtin-modules')
  var loadModule = Module._load

  // patch hook into CJS loader method
  Module._load = function _load (request, parent, isMain) {
    add(request, parent)
    return loadModule(request, parent, isMain)
  }

  // create an empty filesystem watcher
  // modules will be added manually upon require
  // env var NODE_HOT_OFF turns this off
  if (watch) {
    watcher = require('chokidar').watch()
    watcher.on('change', flush)
    watcher.on('unlink', flush)
  }

  // env var NODE_HOT_OUT specifies an output path to log to
  if (output) {
    var outputStream = require('fs').createWriteStream(output)
    events.on('require-cache-miss', function (child, parent) {
      outputStream.write(JSON.stringify(['miss', child, parent])+'\n')
    })
    events.on('require-cache-hit', function (child, parent) {
      outputStream.write(JSON.stringify(['hit', child, parent])+'\n')
    })
    events.on('require-cache-flush', function (filename) {
      outputStream.write(JSON.stringify(['flush', filename])+'\n')
    })
  }

  // env var NODE_HOT_IN specifies an input path to read commands from
  if (input) {
    var inputStream = require('fs').createReadStream(input)
    var nullStream = require('fs').createWriteStream('/dev/null')
    let readline
    const createReadline = () => {
      readline = require('readline').createInterface({
        input: inputStream,
        output: nullStream
      })
      readline.on('line', flush)
      readline.on('close', createReadline)
    }
    createReadline()
  }

  return {
    parents: parents,
    children: children,
    events: events,
    watcher: watcher,
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

    // emit and add to watcher
    if (
      builtins.indexOf(child) < 0 &&
      Object.keys(require.cache).indexOf(child) < 0
    ) {
      events.emit('require-cache-miss', child, parent)
    } else {
      events.emit('require-cache-hit', child, parent)
    }
    if (watcher) watcher.add(child)
  }

  function flush (filename) {
    require('clear-module')(filename)
    events.emit('require-cache-flush', filename)
    if (watcher) watcher.unwatch(filename)
  }

}

// a node process can be instrumented with this using `node -r dothot`
if (module.parent && module.parent.id === 'internal/preload') {
  process.hot = DotHot(
    process,
    !process.env.NODE_HOT_OFF,
    process.env.NODE_HOT_OUT,
    process.env.NODE_HOT_IN,
  )
}

(function DotHot (events, watch, input, output) {

  events = events || require('process')
  var watcher
  var parents = {}
  var children = {}
  var builtins = Module.builtinModules || require('builtin-modules')
  var Module = require('module')
  var loadModule = Module._load

  Module._load = function _load (request, parent, isMain) {
    add(request, parent)
    return loadModule(request, parent, isMain)
  }

  if (watch) {
    watcher = require('chokidar').watch()
    watcher.on('change', flush)
    watcher.on('unlink', flush)
  }

  if (output) {
    var outputStream = require('fs').createWriteStream(output)
    events.on('required', function (child, parent) {
      outputStream.write(JSON.stringify(['required', child, parent])+'\n')
    })
    events.on('flushed', function (filename) {
      outputStream.write(JSON.stringify(['flushed', filename])+'\n')
    })
  }

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
    if (builtins.indexOf(child) < 0) {
      child = Module._resolveFilename(child, parent)
    }

    parent = parent.filename

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

    events.emit('required', child, parent)
    if (watcher) watcher.add(child)
  }

  function flush (filename) {
    require('clear-module')(filename)
    events.emit('flushed', filename)
    if (watcher) watcher.unwatch(filename)
  }

})

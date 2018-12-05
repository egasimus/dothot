const Module   = require('module')
    , builtins = Module.builtinModules || require('builtin-modules')
    , clear    = require('clear-module')

class DotHot {

  constructor () {
    this.emitter  = process
    this.watcher  = null
    this.parents  = {}
    this.children = {}
    this.oldModuleLoad = Module._load
  }

  install () {
    const _this = this
    Module._load = function (request, parent, isMain) {
      _this.add(request, parent)
      return _this.oldModuleLoad(request, parent, isMain)
    }
  }

  watch () {
    if (this.watcher) return
    this.watcher = require('chokidar').watch()
    this.watcher.on('change', path => this.flush(path))
    this.watcher.on('unlink', path => this.flush(path))
  }

  add (child, parent) {
    if (builtins.indexOf(child) < 0) {
      child = Module._resolveFilename(child, parent)
    }

    parent = parent.filename

    if (!this.parents[child]) {
      this.parents[child] = [parent]
    } else if (this.parents[child].indexOf(parent) < 0) {
      this.parents[child].push(parent)
    }

    if (!this.children[parent]) {
      this.children[parent] = [child]
    } else if (this.children[parent].indexOf(child) < 0) {
      this.children[parent].push(child)
    }

    this.emitter.emit('required', child, parent)
    if (this.watcher) this.watcher.add(child)
  }

  flush (filename) {
    require('clear-module')(filename)
    this.emitter.emit('flushed', filename)
    if (this.watcher) this.watcher.unwatch(filename)
  }

  output (filename) {
    const stream = require('fs').createWriteStream(filename)
    this.emitter.on('required', (child, parent) => {
      stream.write(JSON.stringify(['required', child, parent])+'\n')
    })
    this.emitter.on('flushed', (filename) => {
      stream.write(JSON.stringify(['flushed', filename])+'\n')
    })
  }

  input (filename) {
    const input = require('fs').createReadStream(filename)
    const output = require('fs').createWriteStream('/dev/null')
    let readline
    const createReadline = () => {
      readline = require('readline').createInterface({ input, output })
      readline.on('line', line => this.flush(line))
      readline.on('close', createReadline)
    }
    createReadline()
  }

}

module.exports = DotHot

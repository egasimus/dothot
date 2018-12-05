#!/usr/bin/env node
process.argv.splice(1, 1)
var HOT_WATCH = '--hot-watch'
var HOT_OUT = '--hot-out='
var HOT_IN = '--hot-in='
for (var i = 1; i < process.argv.length; i++) {
  if (process.argv[i] === HOT_WATCH) {
    // dotHot.watch()
    process.argv[i] = undefined
    continue
  }
  if (process.argv[i].indexOf(HOT_OUT) === 0) {
    // dotHot.output(process.argv[i].slice(HOT_OUT.length))
    process.argv[i] = undefined
    continue
  }
  if (process.argv[i].indexOf(HOT_IN) === 0) {
    // dotHot.input(process.argv[i].slice(HOT_IN.length))
    process.argv[i] = undefined
    continue
  }
}
process.argv = process.argv.filter(arg=>arg!==undefined)
console.log(process.argv)

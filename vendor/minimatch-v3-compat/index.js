'use strict'
// ESLint 9 y sus plugins piden minimatch ^3 y lo usan como función por defecto
// (`require('minimatch')(...)`, `import minimatch from 'minimatch'`). La 3 tiene
// la alerta GHSA-g3hv-75wg-m249 sin parche; la 11 la corrige y ya cuelga de la
// función todo lo que la 3 exportaba (Minimatch, filter, makeRe, sep, GLOBSTAR…),
// así que alcanza con devolver esa función.
module.exports = require('minimatch-11').minimatch

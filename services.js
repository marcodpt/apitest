import query from 'https://cdn.jsdelivr.net/gh/marcodpt/query@0.0.2/index.js'
import axios from
  'https://cdn.jsdelivr.net/npm/redaxios@0.4.1/dist/redaxios.module.js'
axios.defaults.withCredentials = true

const jpath = (X, P) => {
  var R = X
  var stop = false
  console.log(X)
  console.log(P)

  P.forEach((p, i) => {
    if (stop) {
      return
    }
    if (p.substr(0, 1) == '@' && R instanceof Array) {
      if (p == '@') {
        return
      }

      var key = ''
      var val = null
      const F = {}

      p.substr(1).split(',').forEach(m => {
        const M = m.split(':')
        if (M.length == 1) {
          F[M[0]] = M[0]
        } else if (M[1] == '$') {
          key = M[0]
        } else if (M[1] == '!') {
          val = M[0]
        } else {
          F[M[0]] = M[1]
        }
      })

      var Y = key == '' ? [] : {}
      R.forEach(r => {
        console.log(r)
        var y = null
        if (val) {
          y = r[val]
        } else {
          y = {}
          Object.keys(F).forEach(f => {
            y[F[f]] = r[f] != null ? r[f] : null
          })
        }

        if (key == '') {
          Y.push(y)
        } else {
          Y[r[key]] = y
        }
      })

      R = Y
    } else if (p == '*' && R instanceof Array) {
      const S = []
      R.forEach(r => S.push(jpath(r, P.filter((p, j) => j > i))))
      R = S
      stop = true
    } else if (R != null) {
      if (typeof R == 'object' && R[p] != null) {
        R = R[p]
      } else {
        R = null
      }
    }
  })

  return R
}

const out = X => JSON.stringify(X, 
  X && typeof X == 'object' && !(X instanceof Array) ? 
    Object.keys(X).sort() : null
, 2)

const Op = {
  eq: (a, b) => out(a) == out(b),
  ne: (a, b) => out(a) != out(b),
  gt: (a, b) => parseFloat(a) > parseFloat(b)
}

const run = (V, M, id, F, done) => {
  var p = null
  const method = V[id].method
  const params = V[id].params
  const url = V[id].url
  const A = V[id].assertions
  const q = query(params)
  const label = `${id+1}: ${method} ${url+(q ? '?' : '')+q}`
  const host = localStorage.getItem('HOST') || ''
  if (method != 'GET') {
    p = new Promise ((resolve, reject) => {
      axios({
        url: host+url,
        method: method,
        headers: {
          'Content-Type': 'text/plain;charset=UTF-8'
        },
        data: JSON.stringify(params)
      }).then(res => {
        resolve({
          ...res,
          mime: res.headers.get('Content-Type')
        })
      }).catch(err => {
        reject(err)
      })
    })
  } else {
    p = axios.get(host+url+(q ? '?' : '')+q)
  }

  const check = res => {
    if (typeof done == 'function') {
      done(res)
    }
    var R = null
    A.forEach(a => {
      if (R == null) {
        const v = jpath(res, a.expression.split('.'))
        if (Op[a.operator] == null) {
          R = {
            schema: {
              title: F.schema.title,
              description: 'Unknown operator: <'+a.operator+'>'
            },
            alert: 'danger',
            back: F.back
          }
        } else if (!Op[a.operator](v, a.value)) {
          R = {
            schema: {
              title: F.schema.title,
              description: [
                label,
                `Error: ${a.expression} ${a.operator}`,
                `***** Expected *****`,
                out(a.value),
                `***** Result   *****`,
                out(v)
              ].concat(a.operator != 'eq' ? [] : [
                `********************`,
                `Do you want to update?`
              ]).join('\n').trim()
            },
            back: F.back,
            alert: 'danger',
            submit: a.operator != 'eq' ? null : (V, M, xid, F) => {
              a.value = v
              if (xid < id) {
                return null
              } else if (id == xid) {
                return check(res)
              } else {
                return run(V, M, xid, F)
              }
            }
          }
        }
      }
    })
    return R
  }

  return p
    .then(res => check(res))
    .catch(err => check(err))
}

const runSchema = {
  type: 'primary',
  icon: 'play',
  title: 'Exec',
  description: info => '',
  finish: 'passed'
}

const runTest = (V, M, id, F) => {
  V[id].env = {}

  return V[id].requests.reduce((p, r, i) => p.then(res => {
    if (res != null) {
      return res
    } else {
      return run(V[id].requests, M, i, F, res => {
        const W = V[id].requests[i].vars
        Object.keys(W).forEach(key => {
          V[id].env[key] = jpath(res, W[key].split('.'))
        })
      })
    }
  }), Promise.resolve())
}

export default {
  post: {
    type: 'success',
    icon: 'pencil-alt',
    title: 'Insert',
    finish: 'added',
    submit: (V, M, id) => {
      V.push(M)
    }
  },
  delete: {
    type: 'danger',
    icon: 'trash',
    title: 'Delete',
    description: info => 
      `Are you sure do you want to exclude: ${info}?`+
      ` This action cannot be undone!`,
    finish: 'removed',
    batch: true,
    reverse: true,
    submit: (V, M, id) => {
      V.splice(id, 1)
    }
  },
  put: {
    type: 'warning',
    icon: 'edit',
    title: 'Edit',
    finish: 'updated',
    batch: false,
    submit: (V, M, id) => {
      V[id] = {
        ...V[id],
        ...M
      }
    }
  },
  copy: {
    type: 'success',
    icon: 'copy',
    title: 'Copy request',
    finish: 'copied',
    description: info => ``,
    batch: false,
    submit: (V, M, id) => {
      V.push(JSON.parse(JSON.stringify(V[id])))
    }
  },
  run: {
    ...runSchema,
    batch: true,
    submit: run
  },
  runTest: {
    ...runSchema,
    batch: true,
    submit: runTest
  },
  runAll: {
    ...runSchema,
    multiple: true,
    submit: (V, M, x, F) => 
      V.reduce((p, v, id) => p.then(res => {
        if (res != null) {
          return res
        } else {
          return runTest(V, M, id, F)
        }
      }), Promise.resolve())
  },
  save: {
    type: 'info',
    icon: 'save',
    title: 'Save',
    description: info => '',
    finish: '',
    submit: () => {
      var link = document.createElement('a')
      link.setAttribute('href',
        'data:text/plain;charset=utf-8,'+
        encodeURIComponent(localStorage.getItem('DATA'))
      )
      link.setAttribute('download', 'tests.json')
      document.body.appendChild(link)
      link.click()
      link.parentNode.removeChild(link)
      history.back()
    }
  },
  import: {
    type: 'light',
    icon: 'file',
    title: 'Import',
    description: info => [
      'Are you sure to import file?',
      'This will override all data!'
    ].join('\n'),
    refresh: true,
    Fields: [
      {
        key: 'file',
        type: 'array',
        format: 'file'
      }, {
        key: 'type',
        type: 'string',
        enum: ['raw', 'old'],
        default: 'raw'
      }
    ],
    submit: (V, M, id, F) =>
      new Promise((resolve, reject) => {
        var reader = new FileReader()
        reader.onloadend = function () {
          if (reader.error) {
            reject(reader.error)
          } else {
            resolve(reader.result)
          }
        }
        reader.readAsText(M.file[0], 'UTF-8')
      }).then(data => {
        var X = JSON.parse(data)
        if (M.type == 'old') {
          V.push({
            name: M.file[0].name,
            env: X.env,
            requests: X.H.map(row => ({
              method: row.method,
              url: row.url,
              params: row.params,
              vars: row.vars,
              assertions: row.tests.map(t => ({
                expression: t.exp,
                operator: t.op,
                value: t.value
              }))
            }))
          })
          X = V
        }
        localStorage.setItem('DATA', JSON.stringify(X))
        return {
          schema: {
            title: F.schema.title,
            description: 'File imported: <'+M.file[0].name+'>'
          },
          alert: 'success',
          back: F.back
        }
      }).catch(err => {
        console.log(err)
        return {
          schema: {
            title: F.schema.title,
            description: 'Error to import file: <'+M.file[0].name+'>'
          },
          alert: 'danger',
          back: F.back
        }
      })
  },
  clear: {
    type: 'danger',
    icon: 'trash',
    title: 'Remove All',
    description: info => [
      'Are you sure do you want to remove all tests?',
      'This action cannot be undone!'
    ].join('\n'),
    finish: 'removed',
    multiple: true,
    submit: (V, M) => {
      V.length = 0
    }
  }, 
  cors: {
    type: 'warning',
    icon: 'flask',
    title: 'Test Cors',
    description: info => '',
    multiple: true,
    submit: (V, M, id, F) => 
      axios.get('https://www.google.com').then(res => {
        return {
          schema: {
            title: F.schema.title,
            description: 'CORS is enabled!'
          },
          alert: 'success',
          back: F.back
        }
      }).catch(err => {
        console.log(err)
        return {
          schema: {
            title: F.schema.title,
            description: 'CORS is NOT enabled!'
          },
          alert: 'danger',
          back: F.back
        }
      })
  },
  github: {
    type: 'dark',
    icon: '@github',
    title: 'Fork me on GitHub',
    href: 'https://github.com/marcodpt/apitest'
  }
}

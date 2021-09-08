import query from 'https://cdn.jsdelivr.net/gh/marcodpt/query@0.0.2/index.js'
import axios from
  'https://cdn.jsdelivr.net/npm/redaxios@0.4.1/dist/redaxios.module.js'
axios.defaults.withCredentials = true

const maybe = (X, def) => X == null ? def || null : X

const jpath = (X, P, inside) => {
  var R = maybe(X)
  var stop = false

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
          F[M[0]] = maybe(M[0])
        } else if (M[1] == '$') {
          key = maybe(M[0])
        } else if (M[1] == '!') {
          val = maybe(M[0])
        } else {
          F[M[0]] = maybe(M[1])
        }
      })

      var Y = key == '' ? [] : {}
      R.forEach(r => {
        var y = null
        if (val) {
          y = maybe(r[val])
        } else {
          y = {}
          Object.keys(F).forEach(f => {
            y[F[f]] = maybe(r[f])
          })
        }

        if (key == '') {
          Y.push(maybe(y))
        } else {
          Y[r[key]] = maybe(y)
        }
      })

      R = Y
    } else if (p == '*' && R instanceof Array) {
      const S = []
      R.forEach(r => S.push(jpath(r, P.filter((p, j) => j > i), inside)))
      R = S
      stop = true
    } else if (R != null) {
      if (R instanceof Array) {
        p = parseInt(p)
        p = p < 0 ? R.length + p : p
        R = maybe(R[p])
      } else if (typeof R == 'object' && R[p] != null) {
        R = R[p]
      } else {
        R = null
      }
    }
  })

  return typeof R == 'string' && inside ? R.split('\n').join('\\n') : R
}

const render = (tpl, X) => 
  tpl.replace(
    /\{\$\.([A-Za-z0-9_\.]+?)\}/g,
    (str, path) => maybe(jpath(
      X, ['$'].concat(path.split('.')), X != null
    ), '')
  )

const sortKeys = X => {
  if (!X || typeof X != 'object' || X instanceof Array) {
    return X
  }
  var K = Object.keys(X)
  K.sort()
  return K.reduce((Y, key) => {
    Y[key] = sortKeys(X[key])
    return Y
  }, {})
}

const out = (X, E) => render(JSON.stringify(sortKeys(X), undefined, 2), E)

const Op = {
  eq: (a, b, E) => out(a) == out(b, E),
  ne: (a, b, E) => out(a) != out(b, E),
  gt: (a, b, E) => parseFloat(a) > parseFloat(b)
}

const run = (V, M, id, F, E, action) => {
  const method = V[id].method
  const params = JSON.parse(render(JSON.stringify(V[id].params), E))
  const url = render(V[id].url, E)
  const A = V[id].assertions
  const q = query(params)
  const label = `${id+1}: ${method} ${url+(q ? '?' : '')+q}`
  const host = localStorage.getItem('HOST') || ''
  const p = new Promise ((resolve, reject) => {
    axios({
      url: host+url+(method != 'GET' ? '' : ((q ? '?' : '')+q)),
      method: method,
      data: method == 'GET' ? null : params
    }).then(res => {
      resolve({
        ...res,
        mime: res.headers.get('Content-Type')
      })
    }).catch(res => {
      var mime = ''
      try {
        mime = res.headers.get('Content-Type')
      } catch (err) {}
      reject({
        ...res,
        mime: mime
      })
    })
  })

  const check = res => {
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
        } else if (!Op[a.operator](v, a.value, E)) {
          const x = out(a.value, E)
          const y = out(v)
          const Diff = [] 
          const X = x.split('\n')
          const Y = y.split('\n')

          for (var i = 0, j = 0; i < X.length && j < Y.length; i++, j++) {
            if (X[i] != Y[j]) {
              const k = i
              if (Y.indexOf(X[i], j) == -1) {
                Diff.push('(-):'+X[i])
              } else {
                i--
              }
              if (X.indexOf(Y[j], k) == -1) {
                Diff.push('(+):'+Y[j])
              } else if (i == k) {
                j--
              }
            }
          }
          while (i < X.length) {
            Diff.push('(-):'+X[i++])
          }
          while (j < Y.length) {
            Diff.push('(+):'+Y[j++])
          }

          R = {
            schema: {
              title: F.schema.title,
              description: [
                label,
                `Error: ${a.expression} ${a.operator}`,
                `***** Diff     *****`
              ].concat(Diff).concat([
                `***** Expected *****`,
                x,
                `***** Result   *****`,
                y
              ]).concat(a.operator != 'eq' ? [] : [
                `********************`,
                `Do you want to update?`
              ]).join('\n').trim()
            },
            back: F.back,
            alert: 'danger',
            submit: a.operator != 'eq' ? null : (V, M, xid, F, E) => {
              a.value = v
              return check(res) || (action ?
                action(V, M, xid, F, E) :
                run(V, M, xid, F, E, action)
              )
            }
          }
        }
      }
    })

    const W = V[id].vars
    Object.keys(W).forEach(key => {
      E.$[key] = jpath(res, W[key].split('.'))
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

const runTest = (V, M, id, F, E, status, index) => {
  V[id].env = {}
  const start = + new Date()
  const setLabel = i => {
    const now = + new Date()
    const time = ((now - start) / 1000).toFixed(1)
    return `[${id+1}] ${V[id].name} [${i}/${V[id].requests.length}] ${time}s`
  }
  const setStatus = i => {
    status({
      bg: 'success',
      width: `${(100 * (i+1) / V[id].requests.length).toFixed(2)}%`,
      label: setLabel(i+1)
    })
  }

  setStatus(index == null ? -1 : index)

  return new Promise((resolve, reject) => {
    V[id].requests.reduce((p, r, i) => p.then(res => {
      if (res != null) {
        return res
      } else if (i <= index) {
        return null
      } else {
        setStatus(i)
        const adaptor = overload => (U, M, id, F, E) => 
          run(V[id].requests, M, i, F, {
            $: V[id].env
          }, adaptor(true)).then(res =>
            !overload || res ? res : runTest(V, M, id, F, E, status, i)
          )
        return adaptor(false)(V, M, id, F, E)
      }
    }), Promise.resolve()).then(res => {
      resolve(res || setLabel(V[id].requests.length))
    }).catch(err => {
      reject(err)
    })
  })
}

const summary = Msg => {
  const X = Msg.map(msg => msg.split(' ')).map(M => ({
    assertions: parseInt(M[M.length - 2].substr(1).split('/')[0]),
    time: parseFloat(M[M.length - 1].substr(0, M[M.length - 1].length - 1))
  })).reduce((X, M) => {
    X.assertions += M.assertions
    X.time += M.time
    return X
  }, {
    assertions: 0,
    time: 0.0
  })

  return [
    'SUMMARY',
    `#Tests: ${Msg.length}`,
    `#Assertions: ${X.assertions}`,
    `Time: ${X.time.toFixed(1)}s`
  ].join('\n')
}

const copy = X => JSON.parse(JSON.stringify(X))

export default {
  post: {
    type: 'success',
    icon: 'pencil-alt',
    title: 'Insert',
    finish: 'added',
    submit: (V, M, id) => {
      V.push(copy(M))
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
      V.push(copy(V[id]))
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
    summary: summary,
    submit: runTest
  },
  runAll: {
    ...runSchema,
    multiple: true,
    summary: Msg => summary(Msg[0].split('\n - ')),
    submit: (V, M, x, F, E, status) => new Promise ((resolve, reject) => {
      const Msg = []
      const addMsg = X => {
        if (typeof X == 'string') {
          if (X) {
            Msg.push(X)
          }
          X = null
        }
        return X
      }
      V.reduce((p, v, id) => p.then(res => {
        res = addMsg(res)
        if (res != null) {
          res.submit = null
          res.schema.description = res.schema.description
            .split('********************')[0]
          return res
        } else {
          return runTest(V, M, id, F, E, status)
        }
      }), Promise.resolve()).then(res => {
        res = addMsg(res)
        resolve(res == null && Msg.length ? Msg.join('\n - ') : res)
      }).catch(err => {
        resolve(err)
      })
    })
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
        localStorage.setItem(
          'DATA',
          JSON.stringify(JSON.parse(data), undefined, 2)
        )
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
    submit: (V, M, id, F) =>  {
      const host = localStorage.getItem('HOST')
      return axios.get(host).then(res => ({
        schema: {
          title: F.schema.title,
          description: `CORS is enabled! (${host})`
        },
        alert: 'success',
        back: F.back
      })).catch(err => {
        console.log(err)
        return {
          schema: {
            title: F.schema.title,
            description: `CORS is NOT enabled! (${host})`
          },
          alert: 'danger',
          back: F.back
        }
      })
    }
  },
  github: {
    type: 'dark',
    icon: '@github',
    title: 'Fork me on GitHub',
    href: 'https://github.com/marcodpt/apitest'
  }
}

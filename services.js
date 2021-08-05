import query from 'https://cdn.jsdelivr.net/gh/marcodpt/query@0.0.2/index.js'
import axios from
  'https://cdn.jsdelivr.net/npm/redaxios@0.4.1/dist/redaxios.module.js'

const jpath = (X, P) => {
  var R = X
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

      exp.substr(1).split(',').forEach(m => {
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
      R.forEach(r => S.append(jpath(r, P.filter((p, j) => j > i))))
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

const out = X => JSON.stringify(X, undefined, 2)

const Op = {
  eq: (a, b) => out(a) == out(b),
  ne: (a, b) => out(a) != out(b),
  gt: (a, b) => parseFloat(a) > parseFloat(b)
}

export default {
  post: {
    type: 'success',
    icon: 'pencil-alt',
    title: 'Insert',
    finish: 'added',
    submit: (V, M, id) => {
      console.log(M)
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
  run: {
    type: 'primary',
    icon: 'play',
    title: 'Exec',
    description: info => '',
    finish: 'passed',
    batch: true,
    submit: (V, M, id, F) => {
      var p = null
      const method = V[id].method.toLowerCase()
      const params = V[id].params
      const url = V[id].url
      const A = V[id].assertions
      if ([
        'post',
        'put',
        'patch'
      ].indexOf(method) != -1) {
        p = axios[method](url, params)
      } else {
        const q = query(params)
        p = axios[method](url+(q ? '?' : '')+q)
      }

      const check = res => {
        var R = null
        A.forEach(a => {
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
                  `Error: ${a.expression} ${a.operator}`,
                  `***** Expected *****`,
                  out(a.value),
                  `***** Result   *****`,
                  out(p)
                ].concat(a.operator != 'eq' ? [] : [
                  `********************`,
                  `Do you want to update?`
                ]).join('\n').trim()
              },
              back: F.back,
              alert: 'danger',
              submit: a.operator != 'eq' ? null : () => {
                a.value = v
                return check(res)
              }
            }
          }
        })
        return R || {
          schema: {
            title: F.schema.title,
            description: 'All assertions passed!'
          },
          alert: 'success',
          back: F.back
        }
      }

      return p
        .then(res => check(res))
        .catch(err => check(err))
    }
  }
}

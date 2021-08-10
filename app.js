import spa from 'https://cdn.jsdelivr.net/gh/marcodpt/spa@0.0.1/index.js'
import {form} from 'https://cdn.jsdelivr.net/gh/marcodpt/form@0.0.5/index.js'
import {table} from 'https://cdn.jsdelivr.net/gh/marcodpt/table@0.0.9/index.js'
import routes from './routes.js'
import services from './services.js'

var X = null

const load = () => {
  try {
    X = JSON.parse(localStorage.getItem('DATA')) || []
  } catch (err) {
    X = []
  }
}

const back = () => {history.back()}

const K = [
  'key',
  'formatter',
  'parser',
  'get',
].concat(Object.keys(services))

const getProp = (Fields, params, Base) => Fields.reduce((P, F) => {
  if (Base != null || F.get == null) {
    P[F.key] = K.reduce((R, key) => {
      delete R[key]
      return R
    }, {...F})
    if (typeof P[F.key].href == 'function') {
      P[F.key].href = P[F.key].href(params)
    }
  }

  return P
}, Base || {})

const resolve = (route, params) => route.split('/').map(
  key => key.substr(0, 1) == ':' ? params[key.substr(1)] : key
).join('/')

const getLinks = (Services, global, href) => Object.keys(services)
  .filter(key => (
    (global && services[key].batch == null) ||
    (!global && services[key].batch != null)
  ) && Services.indexOf(key) != -1)
  .map(key => ({
    ...services[key],
    href: href+(global ? '/' : '/{id}/')+key,
    batch: !global && services[key].batch ? href+`/{_ids}/${key}` : false
  }))

const getContext = (context, Data, params) => {
  if (typeof context != 'function') {
    return ''
  } else {
    const s = context(Data, params).map(C => {
      const R = routes[C[0]]
      return '['+R.item+': '+R.label(C[1])+']'
    }).join(' ')
    return s+(s.length ? ' ' : '')
  }
}

load()

window.addEventListener('load', () => {
  const router = spa(document.body, {
    routes: routes.reduce((Routes, {
      route,
      context,
      name,
      item,
      source,
      label,
      Fields,
      Services
    }) => {
      Routes.push({
        route: route,
        comp: table,
        mount: params => {
          const href = resolve(route, params)
          const P = getProp(Fields, params, {
            index: {
              type: 'integer',
              title: 'Id'
            }
          })

          return {
            sort: true,
            search: true,
            filter: true,
            group: true,
            check: true,
            limit: 10,
            back: back,
            schema: {
              type: 'array',
              title: getContext(context, X, params)+name,
              items: {
                type: 'object',
                properties: P,
                required: Object.keys(P),
                links: getLinks(Services, false, href)
              },
              links: getLinks(Services, true, href)
            },
            data: source(X, params).map((row, i) => Fields.reduce((R, F) => {
              const k = F.key
              const v = row[k]

              if (F.get) {
                R[k] = F.get(v)
              } else if (F.formatter) {
                R[k] = F.formatter(v)
              } else {
                R[k] = v
              }

              return R
            }, {
              id: i,
              index: i + 1
            }))
          }
        }
      })

      return Routes.concat(Services
        .filter(key => services[key] != null)
        .map(service => {
          const S = services[service]
          return {
            route: route+(S.batch == null ? '/' : '/:id/')+service,
            comp: form,
            mount: params => {
              const G = S.Fields || Fields
              const P = getProp(G, params)
              const Ids = []
              var info = ''
              const pre = getContext(context, X, params)
              const title = `${pre}${S.title} ${S.multiple ? name : item}`
              var V = source(X, params)
              var id = null
              
              if (params.id != null) {
                const max = V.length
                params.id.split(',')
                  .map(id => parseInt(id))
                  .filter(id => typeof id == 'number' && id >= 0 && id < max)
                  .forEach(id => {
                    Ids.push(id)
                  })
                Ids.sort((a, b) => a - b)
                info = '\n - '+Ids.map(id => label(V[id])).join('\n - ')+'\n'
                if (S.reverse) {
                  Ids.reverse()
                }
                id = Ids.length == 1 ? Ids[0] : id
              } else {
                Ids.push(null)
              }

              if (!Ids.length) {
                return {
                  schema: {
                    type: 'object',
                    title: title,
                    description: 'Nothing selected!'
                  },
                  alert: 'danger',
                  back: back
                }
              } else {
                const Q = Object.keys(P)
                const run = submitter => M => {
                  const Data = G.reduce((M, F) => {
                    if (F.get) {
                      if (F[service] && M[F.key] == null) {
                        M[F.key] = F[service]
                      }
                    } else if (F.parser && M[F.key] != null) {
                      M[F.key] = F.parser(M[F.key])
                    }
                    return M
                  }, {...M})
                  return Ids.reduce((p, id) => p.then(res => {
                    if (res != null) {
                      return res
                    } else {
                      return submitter(V, Data, id, R)
                    }
                  }), Promise.resolve()).then(W => {
                    if (S.refresh) {
                      load()
                    } else {
                      localStorage.clear()
                      localStorage.setItem('DATA', JSON.stringify(X))
                    }
                    if (!S.multiple) {
                      info = info || label(Data)
                    }

                    if (W && W.submit) {
                      W.submit = run(W.submit)
                    }

                    return W || {
                      schema: {
                        type: 'object',
                        title: title,
                        description: S.multiple ? `${name}: ${S.finish}` :
                          `${item}: ${info} ${S.finish}!`
                      },
                      alert: 'success',
                      back: back
                    }
                  })
                }
                const R = {
                  schema: {
                    type: 'object',
                    title: title,
                    description: S.description ? S.description(info) : '',
                    properties: S.description && !S.Fields ? {} : 
                      id == null ? P : Q.reduce((P, key) => {
                        const F = G.filter(
                          F => F.key == key
                        )[0]
                        const v = V[id][key]
                        P[key].default = F && F.formatter ? F.formatter(v) : v
                        return P
                      }, P),
                    required: S.description ? [] : Q
                  },
                  alert: 'info',
                  back: back,
                  submit: run(S.submit)
                }
                return !R.schema.description && !R.schema.required.length ?
                  R.submit({}) : R
              }
            }
          }
        })
      )
    }, []),
    view: document.body.innerHTML
  })
  const tick = () => {
    router(location.hash)
  }
  window.addEventListener('hashchange', tick)
  tick()
})

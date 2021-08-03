import axios from
  'https://cdn.jsdelivr.net/npm/redaxios@0.4.1/dist/redaxios.module.js'
import query from 'https://cdn.jsdelivr.net/gh/marcodpt/query@0.0.2/index.js'
import spa from 'https://cdn.jsdelivr.net/gh/marcodpt/spa@0.0.1/index.js'
import {form} from 'https://cdn.jsdelivr.net/gh/marcodpt/form@0.0.5/index.js'
import {table} from 'https://cdn.jsdelivr.net/gh/marcodpt/table@0.0.9/index.js'
import routes from './routes.js'
import services from './services.js'

var X = null

const reload = () => {
  if (X != null) {
    localStorage.clear()
    localStorage.setItem('DATA', JSON.stringify(X))
  }
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

const getProp = (Fields, Base) => Fields.reduce((P, F) => {
  P[F.key] = K.reduce((R, key) => {
    delete R[key]
    return R
  }, {...F})

  return P
}, Base)

const resolve = (route, params) => route.split('/').map(
  key => key.substr(0, 1) == ':' ? params[key.substr(1)] : key
).join('/')

const getLinks = (Services, global, href) => Object.keys(services)
  .filter(key => (
      (global && services[key].batch == null) ||
      (!global && services[key].batch != null)
    ) && Services.indexOf(key) != -1
  )
  .map(key => ({
    ...services[key],
    href: href+(global ? '/' : '/{id}/')+key,
    batch: !global && services[key].batch ? href+`/{_ids}/${key}` : false
  }))

reload()
console.log(X)

window.addEventListener('load', () => {
  const router = spa(document.body, {
    routes: routes.reduce((Routes, {
      route,
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
          const P = getProp(Fields, {
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
              title: name,
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
              const P = getProp(Fields, {})

              return {
                schema: {
                  type: 'object',
                  title: X.title+' '+name,
                  description: S.description ? S.description(info) : '',
                  properties: P,
                  required: Object.keys(P)
                },
                back: back,
                submit: (M, ids) => {
                  const title = `${S.title} ${name}`
                  const V = source(X, params)

                  const Ids = ids.split(',')
                    .map(id => parseInt(id))
                    .filter(id => typeof id == 'number' && id >= 0 && id < max)
                  Ids.sort((a, b) => a - b)
                  const info = '\n - '+Ids.map(getInfo).join('\n - ')+'\n'

                  X.submit(V, M, ids)
                  reload()

                  if (err) {
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
                    return {
                      schema: {
                        type: 'object',
                        title: title,
                        description: `${name}: ${label(M)} ${S.finish}!`
                      },
                      alert: 'success',
                      back: back
                    }
                  }
                }
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

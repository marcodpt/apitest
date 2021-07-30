import axios from
  'https://cdn.jsdelivr.net/npm/redaxios@0.4.1/dist/redaxios.module.js'
import spa from 'https://cdn.jsdelivr.net/gh/marcodpt/spa@0.0.1/index.js'
import {form} from 'https://cdn.jsdelivr.net/gh/marcodpt/form@0.0.5/index.js'
import {table} from 'https://cdn.jsdelivr.net/gh/marcodpt/table@0.0.9/index.js'
import query from 'https://cdn.jsdelivr.net/gh/marcodpt/query@0.0.2/index.js'

const D = {
  index: {
    type: 'integer',
    title: 'Id'
  },
  label: {
    type: 'string',
    title: 'Label',
    minLength: 1,
    maxLength: 255,
    default: ''
  },
  requests: {
    type: 'integer',
    title: 'Requests',
    href: '#/get/requests/{id}'
  },
  method: {
    title: 'Method',
    type: 'string',
    enum: [
      'GET',
      'POST',
      'DELETE',
      'PUT',
      'PATCH',
      'HEAD',
      'OPTIONS'
    ],
    default: 'GET'
  },
  url: {
    title: 'URL',
    type: 'string',
    default: '',
    minLength: 1
  },
  params: {
    title: 'Params',
    type: 'string',
    default: '',
    format: 'text'
  },
  tests: {
    title: 'Tests',
    type: 'integer'
  },
  vars: {
    title: 'Vars',
    type: 'string',
    default: '',
    format: 'text'
  }
}

const GlobalActions = {
  post: {
    type: 'success',
    icon: 'pencil-alt',
    title: 'Insert'
  }
}

const RowActions = {
  delete: {
    type: 'danger',
    icon: 'trash',
    title: 'Delete',
    batch: href => href.replace('{id}', '{_ids}')
  },
  put: {
    type: 'warning',
    icon: 'edit',
    title: 'Edit'
  }
}

var Tests = []
try {
  Tests = JSON.parse(window.localStorage.getItem('API_REST_TESTS')) || []
} catch (err) {}
const update = () => window.localStorage.setItem(
  'API_REST_TESTS', JSON.stringify(Tests)
)
console.log(Tests)
const back = () => {history.back()}
const fromStr = str => query(str.split('\n').join('&'))
const toStr = X => query(X).split('&').join('\n')

const genSchema = (title, required) => ({
  type: 'object',
  title: title,
  properties: required.reduce((P, key) => {
    P[key] = {...D[key]}
    return P
  }, {}),
  required: required
})

const addProp = (prop, Schema, X) => Object.keys(X).reduce((S, key) => {
  const P = S.properties
  if (P[key] != null) {
    P[key] = {...P[key]}
    P[key][prop] = X[key]
  }
  return S
}, {...Schema})

const getTable = ({
  name,
  Fields,
  Links,
  data
}) => ({
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
      ...genSchema('', ['index'].concat(Fields)),
      links: Object.keys(Links)
        .filter(key => RowActions[key] != null)
        .map(key => ({
          ...RowActions[key],
          href: Links[key]
        }))
        .map(X => !X.batch ? X : {
          ...X,
          batch: X.batch(X.href)
        })
    },
    links: Object.keys(Links)
      .filter(key => GlobalActions[key] != null)
      .map(key => ({
        ...GlobalActions[key],
        href: Links[key]
      }))
  },
  data: data.map((row, i) => ({
    id: i,
    index: i+1,
    ...row
  }))
})

const postForm = ({
  name,
  Fields,
  getInfo,
  submit
}) => ({
  schema: genSchema(`Insert ${name}`, Fields),
  back: back,
  submit: M => {
    submit(M)
    update()
    return {
      schema: {
        type: 'object',
        title: `Insert ${name}`,
        description: `${name}: ${getInfo(M)} added!`
      },
      back: back,
      alert: 'success'
    }
  }
})

const putForm = ({
  name,
  Fields,
  Row,
  getInfo,
  submit
}) => ({
  schema: addProp('default', genSchema(`Edit ${name}`, ['label']), Row),
  back: back,
  submit: M => {
    submit(M)
    update()
    return {
      schema: {
        title: `Edit ${name}`,
        description: `Test: ${getInfo(Row)} updated!`
      },
      back: back,
      alert: 'success'
    }
  }
})

const deleteForm = ({
  name,
  ids,
  max,
  getInfo,
  submit
}) => {
  const title = 'Delete '+name
  const Ids = ids.split(',')
    .map(id => parseInt(id))
    .filter(id => typeof id == 'number' && id >= 0 && id < max)
  Ids.sort((a, b) => a - b)
  const info = '\n - '+Ids.map(getInfo).join('\n - ')+'\n'

  if (!Ids.length) {
    return {
      schema: {
        title: title,
        description: 'Nothing selected!'
      },
      alert: 'danger',
      back: back
    }
  } else {
    return {
      schema: {
        title: title,
        description: `Are you sure do you want to exclude: ${info}?`+
          ` This action cannot be undone!`
      },
      alert: 'info',
      back: back,
      submit: () => {
        submit(Ids)
        update()
        return {
          schema: {
            title: title,
            description: `${name}: ${info} Removed!`
          },
          back: back,
          alert: 'success'
        }
      }
    }
  }
}

const Routes = [
  {
    route: '/',
    comp: table,
    mount: () => getTable({
      name: 'Tests',
      Fields: ['label', 'requests'],
      Links: {
        delete: '#/delete/tests/{id}',
        put: '#/put/tests/{id}',
        post: '#/post/tests'
      },
      data: Tests.map(row => ({
        label: row.label,
        requests: row.requests.length
      }))
    })
  }, {
    route: '/post/tests',
    comp: form,
    mount: () => postForm({
      name: 'Test',
      Fields: ['label'],
      getInfo: M => M.label,
      submit: M => Tests.push({
        label: M.label,
        requests: [],
        env: {}
      })
    })
  }, {
    route: '/put/tests/:id',
    comp: form,
    mount: ({id}) => putForm({
      name: 'Test',
      Fields: ['label'],
      Row: Tests[id],
      getInfo: M => M.label,
      submit: M => {
        Tests[id] = {
          ...Tests[id],
          ...M
        }
      }
    })
  }, {
    route: '/delete/tests/:ids',
    comp: form,
    mount: ({ids}) => deleteForm({
      name: 'Test',
      ids,
      max: Tests.length,
      getInfo: id => Tests[id].label,
      submit: Ids => {
        Ids.reverse()
        Ids.forEach(id => {
          Tests.splice(id, 1)
        })
      } 
    })
  }, {
    route: '/get/requests/:id',
    comp: table,
    mount: ({id}) => ({
      ...D.table,
      schema: {
        type: 'array',
        title: 'Requests: '+Tests[id].label,
        items: {
          type: 'object',
          properties: {
            method: D.method,
            url: D.url,
            params: D.params,
            tests: {
              ...D.tests,
              href: `#/get/tests/${id}/{id}`
            },
            vars: D.vars
          },
          links: [
            {
              ...D.delete,
              href: `#/delete/requests/${id}/{id}`
            }, {
              ...D.put,
              href: `#/put/requests/${id}/{id}`
            }
          ]
        },
        links: [
          {
            ...D.post,
            href: `#/post/requests/${id}`
          }
        ]
      },
      back: back,
      data: Tests[id].requests.map((r, id) => ({
        id: id,
        index: id + 1,
        method: r.method,
        url: r.url,
        params: toStr(r.params),
        tests: (r.tests || []).length,
        vars: toStr(r.vars)
      }))
    })
  }, {
    route: '/post/requests/:id',
    comp: form,
    mount: ({id}) => ({
      schema: genSchema('Insert Request: '+Tests[id].label, [
        'method',
        'url',
        'params',
        'vars'
      ]),
      back: back,
      submit: M => {
        const P = fromStr(M.params)
        Tests[id].requests.push({
          method: M.method,
          url: M.url,
          params: P,
          vars: fromStr(M.vars),
          tests: []
        })
        update()
        return {
          schema: {
            title: 'Insert Request: '+Tests[id].label,
            description: `New request insert: ${M.method} ${M.url}?${query(P)}`
          },
          back: back
        }
      }
    })
  }, {
    route: '/put/requests/:id/:rid',
    comp: form,
    mount: ({
      id,
      rid
    }) => {
      const title = `Update Request: ${Tests[id].label}: ${rid + 1}`
      return {
        schema: addProp('default', genSchema(title, [
          'method',
          'url',
          'params',
          'vars'
        ]), Tests[id].requests[rid]),
        back: back,
        submit: M => {
          const P = fromStr(M.params)
          Tests[id].requests.push({
            method: M.method,
            url: M.url,
            params: P,
            vars: fromStr(M.vars)
          })
          update()
          return {
            schema: {
              title: title,
              description: `New request insert: ${M.method} ${M.url}?${query(P)}`
            },
            back: back
          }
        }
      }
    }
  }, {
    route: '/delele/requests/:id/:rid',
    comp: form,
    mount: ({
      id,
      rid
    }) => {

    }
  }
]

window.addEventListener('load', () => {
  const router = spa(document.body, {
    routes: Routes,
    view: document.body.innerHTML
  })
  const tick = () => {
    router(location.hash.substr(1))
  }
  window.addEventListener('hashchange', tick)
  tick()
})

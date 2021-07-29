import axios from
  'https://cdn.jsdelivr.net/npm/redaxios@0.4.1/dist/redaxios.module.js'
import spa from 'https://cdn.jsdelivr.net/gh/marcodpt/spa@0.0.1/index.js'
import {form} from 'https://cdn.jsdelivr.net/gh/marcodpt/form@0.0.5/index.js'
import {table} from 'https://cdn.jsdelivr.net/gh/marcodpt/table@0.0.9/index.js'
import D from './definitions.js'

var Tests = []
try {
  Tests = JSON.parse(window.localStorage.getItem('API_REST_TESTS')) || []
} catch (err) {}
const update = () => window.localStorage.setItem(
  'API_REST_TESTS', JSON.stringify(Tests)
)
const back = () => {history.back()}

const Routes = [
  {
    route: '/',
    comp: table,
    mount: () => ({
      ...D.table,
      schema: {
        type: 'array',
        title: 'API REST Tests',
        items: {
          type: 'object',
          properties: {
            index: D.index,
            label: D.label,
            requests: {
              ...D.requests,
              href: '#/get/tests/{id}'
            }
          },
          links: [
            {
              ...D.delete,
              href: '#/delete/tests/{id}',
              batch: '#/delete/tests/{_ids}'
            }, {
              ...D.put
              href: '#/put/tests/{id}'
            }
          ]
        },
        links: [
          {
            ...D.post,
            href: '#/post/tests'
          }
        ]
      },
      data: Tests.map((row, i) => ({
        id: i,
        index: i+1,
        label: row.label,
        requests: row.requests.length
      }))
    })
  }, {
    route: '/post/tests',
    comp: form,
    mount: () => ({
      schema: {
        type: 'object',
        title: 'Insert Test',
        properties: {
          label: D.label
        },
        required: ['label']
      },
      back: back,
      submit: M => {
        Tests.push({
          label: M.label,
          requests: [],
          env: {}
        })
        update()
        return {
          schema: {
            type: 'object',
            title: 'Insert Test',
            description: 'New test: '+M.label+' added!'
          },
          back: back,
          alert: 'success'
        }
      }
    })
  }, {
    route: '/delete/tests/:ids',
    comp: form,
    mount: ({ids}) => {
      const l = Tests.length
      const Ids = ids.split(',')
        .map(id => parseInt(id))
        .filter(id => typeof id == 'number' && id >= 0 && id < l)
      Ids.sort((a, b) => a - b)
      const info = '\n - '+Ids.map(
        id => Tests[id].label
      ).join('\n - ')+'\n'

      if (!Ids.length) {
        return {
          schema: {
            title: 'Delete test',
            description: 'No test selected!'
          },
          alert: 'danger',
          back: back
        }
      } else {
        return {
          schema: {
            title: 'Delete test',
            description: `Are you sure do you want to exclude: ${info}?`+
              ` This action cannot be undone!`
          },
          alert: 'info',
          back: back,
          submit: () => {
            Ids.reverse()
            Ids.forEach(id => {
              Tests.splice(id, 1)
            })
            update()
            return {
              schema: {
                title: 'Delete test',
                description: `Test(s): ${info} Removed!`
              },
              back: back,
              alert: 'success'
            }
          }
        }
      }
    }
  }, {
    route: '/put/tests/:id',
    comp: form,
    mount: ({id}) => ({
      schema: {
        type: 'object',
        title: 'Edit test',
        properties: {
          label: {
            ...D.label,
            default: Tests[id].label
          }
        }
      },
      back: back,
      submit: M => {
        Tests[id] = {
          ...Tests[id],
          ...M
        }
        update()
        return {
          schema: {
            title: 'Edit test',
            description: `Test: ${Tests[id].label} updated!`
          },
          back: back,
          alert: 'success'
        }
      }
    })
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

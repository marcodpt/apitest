import {form} from 'https://cdn.jsdelivr.net/gh/marcodpt/form@0.0.5/index.js'
import {table} from 'https://cdn.jsdelivr.net/gh/marcodpt/table@0.0.9/index.js'

const back = () => {history.back()}

export default ({
  route,
  name,
  item,
  source,
  label,
  Fields,
  Services
}, Data, service, reload) => ({
  route: route,
  comp: service == 'get' ? table : form,
  mount: params => {
    if (method == 'get') {
      const P = Fields.reduce((P, F) => {

      }, {
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
            properties: {
            }
            ...genSchema('', ['index'].concat(Fields), context),
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
      }
    } else if (method == 'post') {
      return {
        schema: genSchema(`Insert ${name}`, Fields, context),
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
      }
    } else if (method == 'put') {
      return {
        schema: addProp('default',
          genSchema(`Edit ${name}`, ['label'], context)
        , Row),
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
      }
    } else if (method == 'delete') {
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
    } else {
      return params
    }
  }
})

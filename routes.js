import query from 'https://cdn.jsdelivr.net/gh/marcodpt/query@0.0.2/index.js'

const fromStr = str => query(str.split('\n').join('&'))
const toStr = X => query(X).split('&').join('\n')

export default [
  {
    route: '#/tests',
    name: 'Tests',
    item: 'Test',
    source: Data => Data,
    label: Row => Row.name,
    Fields: [
      {
        key: 'name',
        type: 'string',
        title: 'Name',
        default: '',
        minLength: 1,
        maxLength: 255
      }, {
        key: 'requests',
        type: 'integer',
        title: 'Requests',
        href: () => '#/tests/{id}/requests',
        get: X => X.length,
        post: []
      }, {
        key: 'env',
        type: 'string',
        title: 'Env',
        get: X => JSON.stringify(X, undefined, 2),
        post: {}
      }
    ],
    Services: [
      'post',
      'save',
      'import',
      'clear',
      'delete',
      'put'
    ]
  }, {
    route: '#/tests/:test_id/requests',
    context: (Data, {test_id}) => [[0, Data[test_id]]],
    name: 'Requests',
    item: 'Request',
    source: (Data, {test_id}) => Data[test_id].requests,
    label: Row => Row.method+' '+Row.url+'?'+query(Row.params),
    Fields: [
      {
        key: 'method',
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
      }, {
        key: 'url',
        title: 'URL',
        type: 'string',
        default: '',
        minLength: 1
      }, {
        key: 'params',
        title: 'Params',
        type: 'string',
        default: '',
        format: 'text',
        parser: X => fromStr(X),
        formatter: X => toStr(X)
      }, {
        key: 'assertions',
        title: 'Assertions',
        type: 'integer',
        href: ({test_id}) => `#/tests/${test_id}/requests/{id}/assertions`,
        get: X => X.length,
        post: []
      }, {
        key: 'vars',
        title: 'Vars',
        type: 'string',
        default: '',
        format: 'text',
        parser: X => fromStr(X),
        formatter: X => toStr(X)
      }
    ],
    Services: [
      'post',
      'delete',
      'put',
      'run'
    ]
  }, {
    route: '#/tests/:test_id/requests/:req_id/assertions',
    context: (Data, {
      test_id,
      req_id
    }) => [
      [0, Data[test_id]],
      [1, Data[test_id].requests[req_id]]
    ],
    name: 'Assertions',
    item: 'Assertion',
    source: (Data, {
      test_id,
      req_id
    }) => Data[test_id].requests[req_id].assertions,
    label: Row => Row.expression+' '+Row.operator+' '+Row.value,
    Fields: [
      {
        key: 'expression',
        title: 'Expression',
        type: 'string',
        default: 'data'
      }, {
        key: 'operator',
        title: 'Operator',
        type: 'string',
        enum: ['eq', 'ne', 'gt'],
        default: 'eq'
      }, {
        key: 'value',
        title: 'Value',
        type: 'string',
        default: '',
        format: 'text',
        parser: X => {
          try {
            return JSON.parse(X)
          } catch (err) {
            return X
          }
        },
        formatter: X => JSON.stringify(X, undefined, 2)
      }
    ],
    Services: [
      'post',
      'delete',
      'put'
    ]
  }
]

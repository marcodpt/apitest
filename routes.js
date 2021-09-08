import query from 'https://cdn.jsdelivr.net/gh/marcodpt/query@0.0.2/index.js'

const fromStr = (str, force) => {
  try {
    return JSON.parse(str)
  } catch (err) {
    return force ? str : {}
  }
}
const toStr = X => JSON.stringify(X, undefined, 2)

export default [
  {
    route: '#/tests',
    name: 'Tests',
    item: 'Test',
    source: Data => Data,
    label: Row => Row.name,
    totals: Data => Data.reduce((T, row) => {
      T.index += 1
      T.requests += row.requests
      return T
    }, {
      index: 0,
      requests: 0
    }),
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
        format: 'text',
        title: 'Env',
        get: toStr,
        post: {}
      }
    ],
    Services: [
      'post',
      'save',
      'import',
      'clear',
      'delete',
      'put',
      'runTest',
      'runAll',
      'cors',
      'github',
      'copy'
    ]
  }, {
    route: '#/tests/:test_id/requests',
    context: (Data, {test_id}) => [[0, Data[test_id]]],
    name: 'Requests',
    item: 'Request',
    source: (Data, {test_id}) => Data[test_id].requests,
    extra: (Data, {test_id}) => ({
      $: Data[test_id].env
    }),
    label: Row => Row.method+' '+Row.url+'?'+query(Row.params),
    totals: Data => Data.reduce((T, row) => {
      T.index += 1
      T.assertions += row.assertions
      return T
    }, {
      index: 0,
      assertions: 0
    }),
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
        title: 'Params (json)',
        type: 'string',
        default: '{}',
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
        title: 'Vars (json)',
        type: 'string',
        default: '{}',
        format: 'text',
        parser: X => fromStr(X),
        formatter: X => toStr(X)
      }
    ],
    Services: [
      'post',
      'delete',
      'put',
      'copy',
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
    totals: Data => Data.reduce((T, row) => {
      T.index += 1
      return T
    }, {
      index: 0
    }),
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
        enum: ['eq', 'ne', 'gt', 'ct', 'nc'],
        default: 'eq'
      }, {
        key: 'value',
        title: 'Value',
        type: 'string',
        default: '',
        format: 'text',
        parser: X => fromStr(X, true),
        formatter: X => toStr(X)
      }
    ],
    Services: [
      'post',
      'delete',
      'put'
    ]
  }
]

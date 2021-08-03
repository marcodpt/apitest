const fromStr = str => query(str.split('\n').join('&'))
const toStr = X => query(X).split('&').join('\n')

export default [
  {
    route: '#/files',
    name: 'Files',
    item: 'File',
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
        key: 'tests',
        type: 'integer',
        title: 'Tests',
        href: () => '#/files/{id}/tests',
        get: Row => Row.tests.length,
        post: Row => []
      }
    ],
    Services: [
      'post',
      'delete',
      'put'
    ]
  }, {
    route: '#/files/:file_id/tests',
    name: 'Tests',
    item: 'Test',
    source: (Data, {file_id}) => Data[file_id].tests,
    label: Row => Row.label,
    Fields: [
      {
        key: 'label',
        type: 'string',
        title: 'Label',
        minLength: 1,
        maxLength: 255,
        default: ''
      }, {
        key: 'requests',
        type: 'integer',
        title: 'Requests',
        href: ({file_id}) => `#/files/${file_id}/tests/{id}/requests`,
        get: Row => Row.requests.length,
        post: Row => []
      }, {
        key: 'env',
        type: 'string',
        title: 'Env',
        get: Row => Row.requests.length,
        post: Row => ({})
      }
    ],
    Services: [
      'post',
      'delete',
      'put'
    ]
  }, {
    route: '#/files/:file_id/tests/:test_id/requests',
    name: 'Requests',
    item: 'Request',
    source: (Data, {
      file_id,
      test_id
    }) => Data[file_id].tests[test_id].requests,
    label: Row => Row.method+' '+Row.url+'?'+query(Row.query),
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
        href: ({
          file_id,
          test_id
        }) => `#/files/${file_id}/tests/${test_id}/requests/{id}/assertions`,
        get: Row => Row.assertions.length,
        post: Row => []
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
      'put'
    ]
  }, {
    route: '#/files/:file_id/tests/:test_id/requests/:req_id/assertions',
    name: 'Assertions',
    item: 'Assertion',
    source: (Data, {
      file_id,
      test_id,
      req_id
    }) => Data[file_id].tests[test_id].requests[req_id].assertions,
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
        parser: X => JSON.parse(X),
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

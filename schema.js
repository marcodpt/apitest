const file = {
  type: 'array',
  items: {
    type: 'object',
    properties: {
      label: {
        type: 'string'
      },
      requests: {
        type: 'array',
        items: {
          type: 'object',
          properties: {
            method: {
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
              type: 'string',
              default: ''
            },
            params: {
              type: 'object',
              default: {}
            },
            tests: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  exp: {
                    type: 'string',
                    default: ''
                  },
                  op: {
                    type: 'string',
                    default: 'eq'
                  },
                  value: {}
                },
                required: [
                  'exp',
                  'op',
                  'value'
                ]
              }
            },
            vars: {
              type: 'object'
            }
          },
          required: [
            'method',
            'url',
            'params',
            'tests',
            'vars'
          ]
        }
      },
      env: {
        type: 'object'
      }
    },
    required: [
      'label',
      'requests',
      'env'
    ]
  }
}

const table = {

}

export {file}

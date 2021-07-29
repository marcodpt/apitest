export default {
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
    title: 'Requests'
  },
  post: {
    type: 'success',
    icon: 'pencil-alt',
    title: 'Insert'
  },
  delete: {
    type: 'danger',
    icon: 'trash',
    title: 'Delete'
  },
  put: {
    type: 'warning',
    icon: 'edit',
    title: 'Edit'
  },
  table: {
    sort: true,
    search: true,
    filter: true,
    group: true,
    check: true,
    limit: 10
  }
}

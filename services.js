export default {
  post: {
    type: 'success',
    icon: 'pencil-alt',
    title: 'Insert',
    finish: 'added',
    submit: (V, M) => {
      V.push(Fields.reduce((R, F) => {
        if (F.get) {
          if (F.post) {
            R[F.key] = F.post(M)
          }
        } else if (F.parser) {
          R[F.key] = F.parser(M[F.key])
        }
        return R
      }, {...M}))
    }
  },
  put: {
    type: 'warning',
    icon: 'edit',
    title: 'Edit',
    finish: 'updated',
    batch: false,
    submit: (V, M, id) => {
      V[id] = Fields.reduce((R, F) => {
        if (F.get) {
          if (F.put && R[F.key] == null) {
            R[F.key] = F.put(M)
          }
        } else if (F.parser) {
          R[F.key] = F.parser(M[F.key])
        }
        return R
      }, {
        ...V[id],
        ...M
      })
    }
  },
  delete: {
    type: 'danger',
    icon: 'trash',
    title: 'Delete',
    description: info => 
      `Are you sure do you want to exclude: ${info}?`+
      ` This action cannot be undone!`,
    finish: 'removed',
    batch: true,
    submit: (V, id) => {
      V.splice(id, 1)
    }
  }
}

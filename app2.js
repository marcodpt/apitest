var X = null

const reload = () => {
  if (X != null) {
    localStorage.clear()
    localStorage.setItem('DATA', JSON.stringify(X))
  }
  try {
    X = JSON.parse(localStorage.getItem('DATA'))
  } catch (err) {
    X = []
  }
}

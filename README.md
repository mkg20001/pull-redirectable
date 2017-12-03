# pull-redirectable

Redirectable pull-streams

# API

 - `.source()`: Creates a redirectable source
 - `.sink()`: Creates a redirectable sink
 - `.duplex()`: Creates a redirectable duplex

## Stream API

`.changeDest(to)`: Changes the destination to `a` or `b`

Every stream exposes an `a` and `b` stream.

The main stream is an inverse of the type (e.g sink => source)

# Example

```js
it('moves half the data from a to o and the other half from b', cb => {
  const s = redir.sink()
  let i = 0

  pull(
    pull.values(v.slice(0, 2)),
    pull.map(v => {
      i++
      if (i === 2) s.changeDest('b')
      return v
    }),
    s.a.sink
  )

  pull(
    pull.values(v.slice(2)),
    s.b.sink
  )

  pull(
    s.source,
    pullCompare(v, cb)
  )
})
```

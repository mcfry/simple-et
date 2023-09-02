import { Link } from 'react-router-dom'

function NotFound() {
  return (
    <section className="flex flex-col grow items-center justify-center space-y-4">
      <p className="text-9xl text-accent">404</p>
      <p className="text-2xl">Oops! Page not found!</p>
      <p>Here are some helpful links:</p>
      <Link className="z-20" to="/">
        Home
      </Link>
    </section>
  )
}

export default NotFound

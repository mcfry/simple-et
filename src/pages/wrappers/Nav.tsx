// External
import { useContext } from 'react'
import { signInWithPopup, signOut } from 'firebase/auth'
import { Outlet } from 'react-router-dom'

// Internal
import { AuthContext } from '../../utils/Auth'
import { auth, provider } from '../../utils/firebase'

export default function Nav() {
  const userData = useContext(AuthContext)

  const handleSignIn = () => {
    signInWithPopup(auth, provider)
      .then(() => {
        // todo: display alert
      })
      .catch(e => {
        console.log(e)
      })
  }

  const handleSignOut = () => {
    signOut(auth)
      .then(() => {
        // todo: display alert
      })
      .catch(e => {
        console.log(e)
      })
  }

  return (
    <div className="flex flex-col w-full">
      <nav className="flex flex-row justify-center items-center w-full space-x-10 sticky p-4">
        {!userData.currentUser && (
          <span
            className="text-xl font-bold bg-gradient-to-r from-black to-gray-800 
            bg-clip-text text-transparent drop-shadow-md cursor-pointer"
            onClick={handleSignIn}
          >
            LOGIN
          </span>
        )}
        {userData.currentUser && (
          <span
            className="flex items-center justify-center space-x-2 text-xl font-bold bg-gradient-to-r from-black to-gray-800 
            bg-clip-text text-transparent drop-shadow cursor-pointer"
            onClick={handleSignOut}
          >
            <span>LOGOUT</span>
            <span className="text-lg">({userData.currentUser.email})</span>
          </span>
        )}
      </nav>

      <Outlet />
    </div>
  )
}

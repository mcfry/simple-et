import { initializeApp } from 'firebase/app'
import { GoogleAuthProvider, getAuth } from 'firebase/auth'
import { getAnalytics } from 'firebase/analytics'

// TODO: env variables
const firebaseConfig = {
  apiKey: 'AIzaSyBtAJvFejF4nhyPPgzX8eUh9Eq8Wn0qSQE',
  authDomain: 'simple-et.firebaseapp.com',
  projectId: 'simple-et',
  storageBucket: 'simple-et.appspot.com',
  messagingSenderId: '371842689762',
  appId: '1:371842689762:web:728566fc4261e388384cbb',
  measurementId: 'G-41CNPY2L3C',
}

// https://www.googleapis.com/service_accounts/v1/jwk/firebase-adminsdk-7rs0n@simple-et.iam.gserviceaccount.com

const provider = new GoogleAuthProvider()

// Initialize Firebase
const app = initializeApp(firebaseConfig)
const auth = getAuth(app)
const analytics = getAnalytics(app)
auth.useDeviceLanguage()

export { auth, provider, analytics }

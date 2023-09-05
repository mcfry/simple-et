// External
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom'

// Internal
import { AuthProvider } from './utils/Auth'
import pages from './pages'

function App() {
  return (
    <div className="flex min-h-screen w-full">
      <AuthProvider>
        <Router>
          <Routes>
            <Route element={<pages.Nav />}>
              <Route path="/" element={<pages.Home />} />
              <Route path="/results/:setRecordId" element={<pages.Results />} />

              <Route path="*" element={<pages.NotFound />} />
            </Route>
          </Routes>
        </Router>
      </AuthProvider>
    </div>
  )
}

export default App

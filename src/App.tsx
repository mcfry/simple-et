// External
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom'

// Internal
import pages from './pages'

function App() {
  return (
    <div className="flex min-h-screen w-full">
      <Router>
        <Routes>
          <Route path="/" element={<pages.Home />} />
          <Route path="*" element={<pages.NotFound />} />
        </Routes>
      </Router>
    </div>
  )
}

export default App

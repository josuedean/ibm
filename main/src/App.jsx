import { Routes, Route, Navigate } from 'react-router-dom'
import Landing from './pages/Landing'
import Course from './pages/Course'

function App() {
  return (
    <Routes>
      <Route path="/" element={<Landing />} />
      <Route path="/digital-literacy" element={<Course courseId="digital-literacy" />} />
      <Route path="/accounting" element={<Course courseId="accounting" />} />
      <Route path="/data-analysis" element={<Course courseId="data-analysis" />} />
      <Route path="/intro-programming" element={<Course courseId="intro-programming" />} />
      <Route path="/global-logistics" element={<Course courseId="global-logistics" />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}

export default App

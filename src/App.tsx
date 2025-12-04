import { Routes, Route } from 'react-router-dom'
import Home from './pages/home'
import Search from './pages/search'
import Report from './pages/report'

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Home />} />
      <Route path="/search" element={<Search />} />
      <Route path="/report" element={<Report />} />
    </Routes>
  )
}

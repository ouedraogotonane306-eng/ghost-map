import { BrowserRouter, Routes, Route } from 'react-router-dom'
import MapPage from './pages/MapPage'
import PlaceDetails from './pages/PlaceDetails'

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<MapPage />} />
        <Route path="/place/:id" element={<PlaceDetails />} />
      </Routes>
    </BrowserRouter>
  )
}

export default App

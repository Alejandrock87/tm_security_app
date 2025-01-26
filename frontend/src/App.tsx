
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import Layout from './components/Layout';
import Home from './components/Home';
import Statistics from './components/Statistics';
import IncidentMap from './components/IncidentMap';

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Layout />}>
          <Route index element={<Home />} />
          <Route path="/statistics" element={<Statistics />} />
          <Route path="/incident-map" element={<IncidentMap />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}

export default App;

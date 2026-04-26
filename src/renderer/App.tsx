import { HashRouter, Routes, Route } from 'react-router-dom';
import Settings from './Settings';
import Display from './Display';
import './App.css';

export default function App() {
  return (
    <HashRouter>
      <Routes>
        <Route path="/" element={<Settings />} />
        <Route path="/display" element={<Display />} />
      </Routes>
    </HashRouter>
  );
}

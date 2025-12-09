import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import SecretHitlerGame from './Game'; // or whatever you named the component file

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<SecretHitlerGame />} />
        <Route path="/room/:roomCode" element={<SecretHitlerGame />} />
        <Route path="/game/:roomCode" element={<SecretHitlerGame />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Router>
  );
}

export default App;
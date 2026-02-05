import React from 'react';
import { BrowserRouter as Router, Routes, Route, Link } from 'react-router-dom';
import LiveStreams from './components/LiveStreams';
import Recordings from './components/Recordings';
import StreamPlayer from './components/StreamPlayer';
import { Video } from 'lucide-react';

function App() {
  return (
    <Router>
      <div className="container">
        <div className="header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <Video size={40} color="#667eea" />
            <div>
              <h1>RTMP Streaming Platform</h1>
              <p>Live streaming and video on demand</p>
            </div>
          </div>
        </div>

        <div className="nav">
          <Link to="/" className="nav-link">Live Streams</Link>
          <Link to="/recordings" className="nav-link">Recordings</Link>
        </div>

        <Routes>
          <Route path="/" element={<LiveStreams />} />
          <Route path="/recordings" element={<Recordings />} />
          <Route path="/watch/:streamId" element={<StreamPlayer />} />
        </Routes>
      </div>
    </Router>
  );
}

export default App;

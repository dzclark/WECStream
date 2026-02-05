import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { io } from 'socket.io-client';
import axios from 'axios';
import { Radio, Eye, Clock } from 'lucide-react';

const socket = io('http://localhost:8000');

function LiveStreams() {
  const [liveStreams, setLiveStreams] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    fetchLiveStreams();

    socket.on('stream_started', (data) => {
      console.log('New stream started:', data);
      fetchLiveStreams();
    });

    socket.on('stream_ended', (data) => {
      console.log('Stream ended:', data);
      fetchLiveStreams();
    });

    return () => {
      socket.off('stream_started');
      socket.off('stream_ended');
    };
  }, []);

  const fetchLiveStreams = async () => {
    try {
      const response = await axios.get('/api/streams/live');
      setLiveStreams(response.data.streams || []);
      setLoading(false);
    } catch (err) {
      console.error('Error fetching live streams:', err);
      setError('Failed to load live streams');
      setLoading(false);
    }
  };

  const handleStreamClick = (stream) => {
    navigate(`/watch/${stream.streamId}`);
  };

  if (loading) {
    return <div className="loading">Loading live streams...</div>;
  }

  if (error) {
    return <div className="error">{error}</div>;
  }

  return (
    <div>
      <div className="card">
        <h2 style={{ marginBottom: '16px', color: '#2d3748' }}>
          Live Streams {liveStreams.length > 0 && `(${liveStreams.length})`}
        </h2>
        
        {liveStreams.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '40px', color: '#718096' }}>
            <Radio size={48} style={{ margin: '0 auto 16px' }} />
            <p>No live streams at the moment</p>
            <p style={{ fontSize: '14px', marginTop: '8px' }}>
              Start streaming with: rtmp://localhost:1935/live/YOUR_STREAM_KEY
            </p>
          </div>
        ) : (
          <div className="grid">
            {liveStreams.map((stream) => (
              <div
                key={stream.streamId}
                className="stream-card"
                onClick={() => handleStreamClick(stream)}
              >
                <div className="stream-thumbnail">
                  <Radio size={64} />
                </div>
                <div className="stream-info">
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', marginBottom: '8px' }}>
                    <h3 className="stream-title">{stream.title}</h3>
                    <span className="badge badge-live">LIVE</span>
                  </div>
                  <div className="stream-meta">
                    <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <Eye size={16} />
                      {stream.viewCount || 0}
                    </span>
                    <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <Clock size={16} />
                      {new Date(stream.startTime).toLocaleTimeString()}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="card">
        <h3 style={{ marginBottom: '12px', color: '#2d3748' }}>How to Stream</h3>
        <ol style={{ paddingLeft: '20px', color: '#4a5568', lineHeight: '1.8' }}>
          <li>Use OBS Studio or any RTMP-compatible streaming software</li>
          <li>Set the RTMP URL to: <code style={{ background: '#f7fafc', padding: '2px 8px', borderRadius: '4px' }}>rtmp://localhost:1935/live</code></li>
          <li>Set your stream key (any unique identifier)</li>
          <li>Start streaming and your stream will appear here automatically</li>
        </ol>
      </div>
    </div>
  );
}

export default LiveStreams;

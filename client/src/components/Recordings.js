import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { Video, Clock, Calendar } from 'lucide-react';

function Recordings() {
  const [recordings, setRecordings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    fetchRecordings();
  }, []);

  const fetchRecordings = async () => {
    try {
      const response = await axios.get('/api/streams/recorded');
      setRecordings(response.data.recordings || []);
      setLoading(false);
    } catch (err) {
      console.error('Error fetching recordings:', err);
      setError('Failed to load recordings');
      setLoading(false);
    }
  };

  const handleRecordingClick = (recording) => {
    navigate(`/watch/${recording.streamId}`);
  };

  const formatDuration = (seconds) => {
    if (!seconds) return 'N/A';
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    
    if (hours > 0) {
      return `${hours}h ${minutes}m ${secs}s`;
    }
    return `${minutes}m ${secs}s`;
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    return date.toLocaleDateString() + ' ' + date.toLocaleTimeString();
  };

  if (loading) {
    return <div className="loading">Loading recordings...</div>;
  }

  if (error) {
    return <div className="error">{error}</div>;
  }

  return (
    <div>
      <div className="card">
        <h2 style={{ marginBottom: '16px', color: '#2d3748' }}>
          Recorded Streams {recordings.length > 0 && `(${recordings.length})`}
        </h2>
        
        {recordings.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '40px', color: '#718096' }}>
            <Video size={48} style={{ margin: '0 auto 16px' }} />
            <p>No recordings available yet</p>
            <p style={{ fontSize: '14px', marginTop: '8px' }}>
              Recordings will appear here after streams end
            </p>
          </div>
        ) : (
          <div className="grid">
            {recordings.map((recording) => (
              <div
                key={recording.id}
                className="stream-card"
                onClick={() => handleRecordingClick(recording)}
              >
                <div className="stream-thumbnail">
                  <Video size={64} />
                </div>
                <div className="stream-info">
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', marginBottom: '8px' }}>
                    <h3 className="stream-title">{recording.title}</h3>
                    <span className="badge badge-recorded">RECORDED</span>
                  </div>
                  <div className="stream-meta" style={{ flexDirection: 'column', alignItems: 'flex-start', gap: '6px' }}>
                    <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <Clock size={16} />
                      {formatDuration(recording.duration)}
                    </span>
                    <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <Calendar size={16} />
                      {formatDate(recording.startTime)}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export default Recordings;

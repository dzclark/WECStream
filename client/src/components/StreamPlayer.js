import React, { useState, useEffect, useRef } from 'react';
import { useParams } from 'react-router-dom';
import axios from 'axios';
import videojs from 'video.js';
import 'video.js/dist/video-js.css';
import { Share2, Copy, Check } from 'lucide-react';

function StreamPlayer() {
  const { streamId } = useParams();
  const [streamData, setStreamData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [shareUrl, setShareUrl] = useState('');
  const [copied, setCopied] = useState(false);
  const videoRef = useRef(null);
  const playerRef = useRef(null);

  useEffect(() => {
    fetchStreamData();
    generateShareUrl();

    return () => {
      if (playerRef.current) {
        playerRef.current.dispose();
        playerRef.current = null;
      }
    };
  }, [streamId]);

  useEffect(() => {
    if (streamData && videoRef.current && !playerRef.current) {
      initializePlayer();
    }
  }, [streamData]);

  const fetchStreamData = async () => {
    try {
      const response = await axios.get(`/api/streams/${streamId}`);
      setStreamData(response.data.stream);
      setLoading(false);
    } catch (err) {
      console.error('Error fetching stream data:', err);
      setError('Failed to load stream');
      setLoading(false);
    }
  };

  const generateShareUrl = async () => {
    try {
      const response = await axios.post(`/api/streams/${streamId}/share`);
      setShareUrl(response.data.shareUrl);
    } catch (err) {
      console.error('Error generating share URL:', err);
    }
  };

  const initializePlayer = () => {
    if (!videoRef.current) return;

    const videoSrc = streamData.status === 'live'
      ? `http://localhost:8000/live/${streamData.streamKey}/index.m3u8`
      : streamData.recordingUrl;

    playerRef.current = videojs(videoRef.current, {
      controls: true,
      autoplay: false,
      preload: 'auto',
      fluid: true,
      sources: [{
        src: videoSrc,
        type: streamData.status === 'live' ? 'application/x-mpegURL' : 'video/mp4'
      }]
    });

    playerRef.current.on('error', (e) => {
      console.error('Video player error:', e);
    });
  };

  const copyShareUrl = () => {
    navigator.clipboard.writeText(shareUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (loading) {
    return <div className="loading">Loading stream...</div>;
  }

  if (error || !streamData) {
    return <div className="error">{error || 'Stream not found'}</div>;
  }

  return (
    <div>
      <div className="card">
        <div className="video-container">
          <video
            ref={videoRef}
            className="video-js vjs-big-play-centered"
          />
        </div>

        <div style={{ marginTop: '20px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', marginBottom: '12px' }}>
            <h2 style={{ color: '#2d3748' }}>{streamData.title}</h2>
            {streamData.status === 'live' && (
              <span className="badge badge-live">LIVE</span>
            )}
            {streamData.status === 'completed' && (
              <span className="badge badge-recorded">RECORDED</span>
            )}
          </div>

          <p style={{ color: '#718096', marginBottom: '8px' }}>{streamData.description}</p>

          <div style={{ display: 'flex', gap: '20px', color: '#718096', fontSize: '14px' }}>
            <span>Views: {streamData.viewCount || 0}</span>
            {streamData.duration && (
              <span>Duration: {Math.floor(streamData.duration / 60)}m {streamData.duration % 60}s</span>
            )}
            {streamData.startTime && (
              <span>Started: {new Date(streamData.startTime).toLocaleString()}</span>
            )}
          </div>
        </div>

        {shareUrl && (
          <div className="share-section">
            <h3 style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px', color: '#2d3748' }}>
              <Share2 size={20} />
              Share this stream
            </h3>
            <div className="share-url">
              <input
                type="text"
                value={shareUrl}
                readOnly
                onClick={(e) => e.target.select()}
              />
              <button
                className={copied ? 'btn btn-secondary' : 'btn btn-primary'}
                onClick={copyShareUrl}
                style={{ display: 'flex', alignItems: 'center', gap: '8px' }}
              >
                {copied ? (
                  <>
                    <Check size={18} />
                    Copied!
                  </>
                ) : (
                  <>
                    <Copy size={18} />
                    Copy
                  </>
                )}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default StreamPlayer;

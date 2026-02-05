module.exports = {
  apps: [{
    name: 'rtmp-server',
    script: 'server/index.js',
    instances: 1,
    autorestart: true,
    watch: false,
    max_memory_restart: '500M',
    env: {
      NODE_ENV: 'production',
      PORT: 8000,
      RTMP_PORT: 1935,
      HTTP_PORT: 8000
    },
    error_file: '~/.pm2/logs/rtmp-server-error.log',
    out_file: '~/.pm2/logs/rtmp-server-out.log',
    log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
    merge_logs: true,
    min_uptime: '10s',
    max_restarts: 10,
    restart_delay: 4000
  }]
};

module.exports = {
  apps: [
    {
      name: 'aalap-api',
      script: 'node_modules/next/dist/bin/next',
      args: 'start',
      cwd: '/home/ubuntu/aalap-vma/project',
      instances: 1,
      exec_mode: 'cluster',
      env: {
        NODE_ENV: 'production',
        PORT: 3000
      },
      error_file: '/home/ubuntu/logs/aalap-api-error.log',
      out_file: '/home/ubuntu/logs/aalap-api-out.log',
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
      merge_logs: true,
      max_memory_restart: '1G',
      autorestart: true,
      watch: false,
      max_restarts: 10,
      min_uptime: '10s'
    },
    {
      name: 'aalap-worker',
      script: 'worker.js',
      cwd: '/home/ubuntu/aalap-vma/project',
      instances: 1,
      exec_mode: 'fork',
      env: {
        NODE_ENV: 'production'
      },
      error_file: '/home/ubuntu/logs/aalap-worker-error.log',
      out_file: '/home/ubuntu/logs/aalap-worker-out.log',
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
      merge_logs: true,
      max_memory_restart: '2G',
      autorestart: true,
      watch: false,
      max_restarts: 10,
      min_uptime: '10s',
      restart_delay: 5000
    }
  ]
};

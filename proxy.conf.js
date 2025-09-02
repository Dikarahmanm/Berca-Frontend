const PROXY_CONFIG = [
  {
    context: ['/api/**'],
    target: 'http://localhost:5171',
    secure: false,
    changeOrigin: true,
    logLevel: 'debug'
  },
  {
    context: ['/auth/**'],
    target: 'http://localhost:5171',
    secure: false,
    changeOrigin: true,
    logLevel: 'debug'
  },
  {
    context: ['/admin/**'],
    target: 'http://localhost:5171',
    secure: false,
    changeOrigin: true,
    logLevel: 'debug'
  },
  {
    context: ['/hubs/**'],
    target: 'http://localhost:5171',
    secure: false,
    changeOrigin: true,
    logLevel: 'debug'
  }
];

module.exports = PROXY_CONFIG;
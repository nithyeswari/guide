/**
 * Bundle Size Budget Configuration
 * 
 * Uses size-limit to enforce maximum bundle sizes.
 * Fails CI if any bundle exceeds its budget.
 * 
 * Installation:
 * npm install --save-dev size-limit @size-limit/preset-app
 * 
 * Add to package.json scripts:
 * "size": "size-limit",
 * "size:why": "size-limit --why"
 */

module.exports = [
  // Main bundle - most critical
  {
    name: 'Main Bundle (Initial JS)',
    path: 'build/static/js/main.*.js',
    limit: '150 KB',
    gzip: true,
    running: false,
  },
  
  // Vendor/framework bundle
  {
    name: 'Vendor Bundle (React + Dependencies)',
    path: 'build/static/js/vendor.*.js',
    limit: '100 KB',
    gzip: true,
  },
  
  // Total initial load
  {
    name: 'Total Initial Load (All JS)',
    path: 'build/static/js/*.js',
    limit: '300 KB',
    gzip: true,
  },
  
  // CSS bundle
  {
    name: 'CSS Bundle',
    path: 'build/static/css/*.css',
    limit: '50 KB',
    gzip: true,
  },
  
  // Specific route chunks (add your routes)
  {
    name: 'Dashboard Route',
    path: 'build/static/js/dashboard.*.js',
    limit: '80 KB',
    gzip: true,
  },
  
  {
    name: 'Reports Route',
    path: 'build/static/js/reports.*.js',
    limit: '100 KB',
    gzip: true,
  },
  
  // Time to Interactive budget
  {
    name: 'Time to Interactive',
    path: 'build/static/js/main.*.js',
    limit: '3 s',
    running: true,
  }
];

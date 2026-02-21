/**
 * Lighthouse CI Configuration
 * 
 * Runs Lighthouse audits in CI and fails builds on performance regressions.
 * 
 * Installation:
 * npm install --save-dev @lhci/cli
 * 
 * Add to package.json scripts:
 * "lhci:healthcheck": "lhci healthcheck",
 * "lhci:autorun": "lhci autorun"
 */

module.exports = {
  ci: {
    collect: {
      // Start server command (adjust for your setup)
      startServerCommand: 'npm run start:ci',
      startServerReadyPattern: 'Compiled successfully',
      startServerReadyTimeout: 30000,
      
      // URLs to test (add your critical paths)
      url: [
        'http://localhost:3000/',
        'http://localhost:3000/dashboard',
        'http://localhost:3000/reports',
        'http://localhost:3000/transactions',
      ],
      
      // Number of runs per URL (more runs = more stable results)
      numberOfRuns: 3,
      
      // Puppeteer settings
      settings: {
        preset: 'desktop', // or 'mobile'
        throttling: {
          // Simulate slower connection for realistic testing
          cpuSlowdownMultiplier: 4,
          downloadThroughputKbps: 1638.4, // Fast 3G
          uploadThroughputKbps: 675,
          rttMs: 150,
        },
      },
    },
    
    assert: {
      // Assertions that will fail the build
      assertions: {
        // ========================================
        // CORE WEB VITALS - CRITICAL METRICS
        // ========================================
        
        // Largest Contentful Paint (should be < 2.5s)
        'largest-contentful-paint': ['error', { maxNumericValue: 2500 }],
        
        // First Input Delay (should be < 100ms)
        'max-potential-fid': ['error', { maxNumericValue: 100 }],
        
        // Cumulative Layout Shift (should be < 0.1)
        'cumulative-layout-shift': ['error', { maxNumericValue: 0.1 }],
        
        // ========================================
        // PERFORMANCE SCORES
        // ========================================
        
        // Overall performance score (0-1, we want > 0.9)
        'categories:performance': ['error', { minScore: 0.85 }],
        
        // Accessibility (important for financial services)
        'categories:accessibility': ['error', { minScore: 0.9 }],
        
        // Best practices
        'categories:best-practices': ['error', { minScore: 0.9 }],
        
        // SEO (if applicable)
        'categories:seo': ['warn', { minScore: 0.8 }],
        
        // ========================================
        // SPECIFIC PERFORMANCE METRICS
        // ========================================
        
        // First Contentful Paint
        'first-contentful-paint': ['error', { maxNumericValue: 1800 }],
        
        // Time to Interactive
        'interactive': ['error', { maxNumericValue: 3500 }],
        
        // Speed Index
        'speed-index': ['error', { maxNumericValue: 3000 }],
        
        // Total Blocking Time
        'total-blocking-time': ['error', { maxNumericValue: 200 }],
        
        // ========================================
        // RESOURCE OPTIMIZATION
        // ========================================
        
        // JavaScript bundle size
        'total-byte-weight': ['error', { maxNumericValue: 1500000 }], // 1.5MB total
        
        // Unused JavaScript
        'unused-javascript': ['warn', { maxLength: 1 }],
        
        // Unused CSS
        'unused-css-rules': ['warn', { maxLength: 1 }],
        
        // Render-blocking resources
        'render-blocking-resources': ['warn', { maxLength: 2 }],
        
        // ========================================
        // BEST PRACTICES FOR FINANCE APPS
        // ========================================
        
        // No vulnerabilities in JS libraries
        'no-vulnerable-libraries': 'error',
        
        // HTTPS usage
        'is-on-https': 'error',
        
        // No mixed content
        'is-crawlable': 'warn',
        
        // Proper error handling
        'errors-in-console': ['warn', { maxLength: 0 }],
      },
      
      // Preset to use as baseline
      preset: 'lighthouse:recommended',
    },
    
    upload: {
      // Where to store results
      target: 'temporary-public-storage', // or 'lhci' for self-hosted server
      
      // For GitHub status checks (optional)
      // token: process.env.LHCI_GITHUB_APP_TOKEN,
      
      // Server URL if using LHCI server
      // serverBaseUrl: 'https://your-lhci-server.example.com',
    },
  },
};

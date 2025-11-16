/**
 * ESLint Configuration for React Performance
 * 
 * This configuration extends your existing ESLint setup with performance-focused rules.
 * It catches common performance anti-patterns at development time.
 * 
 * Installation:
 * npm install --save-dev eslint-plugin-react-hooks eslint-plugin-react-perf @typescript-eslint/eslint-plugin
 */

module.exports = {
  plugins: [
    'react-hooks',
    'react-perf',
    '@typescript-eslint'
  ],
  
  rules: {
    // ========================================
    // REACT HOOKS - CRITICAL FOR PERFORMANCE
    // ========================================
    'react-hooks/rules-of-hooks': 'error',
    'react-hooks/exhaustive-deps': 'warn', // Catches missing dependencies in useEffect/useMemo/useCallback
    
    // ========================================
    // REACT PERFORMANCE ANTI-PATTERNS
    // ========================================
    
    // Prevent inline objects in JSX (causes unnecessary re-renders)
    'react-perf/jsx-no-new-object-as-prop': 'error',
    
    // Prevent inline arrays in JSX
    'react-perf/jsx-no-new-array-as-prop': 'error',
    
    // Prevent inline functions in JSX (should use useCallback)
    'react-perf/jsx-no-new-function-as-prop': 'warn',
    
    // Prevent JSX in component props (creates new elements each render)
    'react-perf/jsx-no-jsx-as-prop': 'warn',
    
    // ========================================
    // GENERAL JAVASCRIPT PERFORMANCE
    // ========================================
    
    // Prefer const to avoid accidental mutations
    'prefer-const': 'error',
    
    // No console.log in production (performance and security)
    'no-console': ['error', { allow: ['warn', 'error'] }],
    
    // Avoid debugger statements
    'no-debugger': 'error',
    
    // Prefer arrow functions (slightly more performant, cleaner)
    'prefer-arrow-callback': 'warn',
    
    // ========================================
    // IMPORT OPTIMIZATION
    // ========================================
    
    // Ensure no duplicate imports
    'no-duplicate-imports': 'error',
    
    // ========================================
    // TYPESCRIPT SPECIFIC (if using TS)
    // ========================================
    
    // Prefer explicit return types (helps with memoization)
    '@typescript-eslint/explicit-function-return-type': 'off', // Enable if you want stricter typing
    
    // No floating promises (ensures async operations are handled)
    '@typescript-eslint/no-floating-promises': 'warn',
    
    // No misused promises
    '@typescript-eslint/no-misused-promises': 'warn',
  },
  
  overrides: [
    {
      // Stricter rules for performance-critical paths
      files: ['**/components/critical/**/*.{js,jsx,ts,tsx}'],
      rules: {
        'react-perf/jsx-no-new-function-as-prop': 'error',
        'react-perf/jsx-no-jsx-as-prop': 'error',
      }
    },
    {
      // Allow console in development scripts
      files: ['scripts/**/*.js', '*.config.js'],
      rules: {
        'no-console': 'off'
      }
    }
  ]
};

/**
 * Lint-Staged Configuration
 * 
 * Runs linters only on staged files for fast pre-commit checks.
 * 
 * Installation:
 * npm install --save-dev lint-staged
 * 
 * Add this to package.json or use this config file
 */

module.exports = {
  // TypeScript and JavaScript files
  '*.{ts,tsx,js,jsx}': [
    // Performance-focused ESLint
    'eslint --config .eslintrc.performance.js --fix --max-warnings 0',
    
    // Check for common performance issues
    (filenames) => {
      const checks = [];
      
      // Check for inline objects/arrays in JSX
      checks.push(`grep -l "={{" ${filenames.join(' ')} || true`);
      
      return checks;
    },
    
    // Type checking for TypeScript
    () => 'tsc --noEmit',
  ],
  
  // CSS/SCSS files
  '*.{css,scss}': [
    'stylelint --fix',
  ],
  
  // JSON files (including package.json)
  'package.json': [
    // Check for unnecessary dependencies
    (filenames) => {
      return [
        'echo "⚠️  package.json modified - review dependency changes"',
        'npm ls --depth=0',
      ];
    },
  ],
  
  // Image files
  '*.{png,jpg,jpeg,gif,webp}': [
    (filenames) => {
      const commands = filenames.map(file => {
        return `echo "📸 Image added: ${file} - ensure it's optimized"`;
      });
      return commands;
    },
  ],
  
  // All staged files
  '*': [
    // Check file size
    (filenames) => {
      return filenames.map(file => 
        `test $(wc -c < "${file}") -lt 500000 || (echo "❌ ${file} exceeds 500KB" && exit 1)`
      );
    },
  ],
};

#!/bin/bash

# List all JavaScript files in the src directory
echo "Listing all JavaScript files..."
find ./src -type f -iname "*.js" > all_js_files.txt

# Initialize referenced_js_files.txt
> referenced_js_files.txt

# Get the total number of JavaScript files
total_files=$(wc -l < all_js_files.txt)

# Initialize current file counter
current_file=0

# Loop through each JavaScript file and search for references in the src directory
echo "Searching for references to JavaScript files in the codebase..."
while IFS= read -r js_file; do
  current_file=$((current_file + 1))
  echo "Processing file $current_file of $total_files: $js_file"
  basename=$(basename "$js_file")
  if grep -qr "$basename" ./src --exclude-dir=node_modules; then
    echo "$js_file" >> referenced_js_files.txt
  fi
done < all_js_files.txt

# Identify unused JavaScript files
echo "Identifying unused JavaScript files..."
grep -v -f referenced_js_files.txt all_js_files.txt > unused_js_files.txt

# Output the list of unused JavaScript files
echo "Scan complete. Unused JavaScript files:"
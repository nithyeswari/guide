#!/bin/bash

# List all image files (assuming common image file extensions) in the src directory
echo "Listing all image files..."
find ./src -type f \( -iname "*.png" -o -iname "*.jpg" -o -iname "*.jpeg" -o -iname "*.gif" -o -iname "*.svg" \) > all_images.txt

# Initialize referenced_images.txt
> referenced_images.txt

# Get the total number of image files
total_files=$(wc -l < all_images.txt)

# Initialize current file counter
current_file=0

# Loop through each image file and search for references in the src directory
echo "Searching for references to image files in the codebase..."
while IFS= read -r image_file; do
  current_file=$((current_file + 1))
  echo "Processing file $current_file of $total_files: $image_file"
  basename=$(basename "$image_file")
  if grep -qr "$basename" ./src --exclude-dir=node_modules; then
    echo "$image_file" >> referenced_images.txt
  fi
done < all_images.txt

# Identify unused image files
echo "Identifying unused image files..."
grep -v -f referenced_images.txt all_images.txt > unused_images.txt

echo "Removing unused image files..."
while IFS= read -r unused_image; do
  echo "Deleting $unused_image"
  rm "$unused_image"
done < unused_images.txt

# Output the list of unused image files
echo "Scan complete. Unused image files:"
cat unused_images.txt
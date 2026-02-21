#!/bin/bash

# List all video files (assuming common video file extensions) in the src directory
echo "Listing all video files..."
find ./src -type f \( -iname "*.mp4" -o -iname "*.mov" -o -iname "*.avi" -o -iname "*.mkv" \) > all_videos.txt

# Initialize referenced_videos.txt
> referenced_videos.txt

# Get the total number of video files
total_files=$(wc -l < all_videos.txt)

# Initialize current file counter
current_file=0

# Loop through each video file and search for references in the src directory
echo "Searching for references to video files in the codebase..."
while IFS= read -r video_file; do
  current_file=$((current_file + 1))
  echo "Processing file $current_file of $total_files: $video_file"
  basename=$(basename "$video_file")
  if grep -qr "$basename" ./src --exclude-dir=node_modules; then
    echo "$video_file" >> referenced_videos.txt
  fi
done < all_videos.txt

# Identify unused video files
echo "Identifying unused video files..."
grep -v -f referenced_videos.txt all_videos.txt > unused_videos.txt

# Output the list of unused video files
echo "Scan complete. Unused video files:"
cat unused_videos.txt
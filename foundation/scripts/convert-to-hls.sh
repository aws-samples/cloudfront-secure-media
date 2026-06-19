#!/bin/bash

# Convert a source video to the HLS demo asset that CDK uploads to S3.
# Paths are anchored to the foundation/ root so this runs from any CWD.
set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
FOUNDATION_DIR="$(dirname "$SCRIPT_DIR")"

INPUT_FILE="${FOUNDATION_DIR}/assets/demo/source/big_buck_bunny_480p_surround-fix.avi"
OUTPUT_DIR="${FOUNDATION_DIR}/assets/demo/hls"
OUTPUT_NAME="big_buck_bunny"

echo "🎬 Converting video to HLS format..."

# Check if input file exists
if [ ! -f "$INPUT_FILE" ]; then
    echo "❌ Input file not found: $INPUT_FILE"
    echo "Please place your source video in foundation/assets/demo/source/"
    exit 1
fi

# Empty and create output directory
rm -rf "$OUTPUT_DIR"
mkdir -p "$OUTPUT_DIR"

# Convert to HLS with single bitrate (1 minute only)
ffmpeg -i "$INPUT_FILE" \
    -t 60 \
    -c:v libx264 \
    -an \
    -b:v 1000k \
    -vf "scale=854:480" \
    -f hls \
    -hls_time 10 \
    -hls_list_size 0 \
    -hls_allow_cache 1 \
    -hls_segment_type mpegts \
    -start_number 0 \
    -hls_segment_filename "$OUTPUT_DIR/${OUTPUT_NAME}_%03d.ts" \
    -hls_playlist_type vod \
    "$OUTPUT_DIR/${OUTPUT_NAME}.m3u8"

echo "✅ HLS conversion completed!"
echo "📁 Output files in: $OUTPUT_DIR"
echo "🎯 Playlist file: $OUTPUT_DIR/${OUTPUT_NAME}.m3u8"

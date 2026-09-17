#!/usr/bin/env bash
# Chuyển các video .mov gốc (1 rep / video) thành MP4 web-friendly cho khung "TV" trong WheyStation.
# Cách dùng:  bash scripts/process-videos.sh <thư-mục-chứa-.mov>
# Yêu cầu: ffmpeg trong PATH.
set -euo pipefail
SRC="${1:-..}"
OUT="$(dirname "$0")/../public/videos"
mkdir -p "$OUT"

# Video gốc có color metadata "reserved" khiến swscale lỗi -> ép về bt709 trước khi filter.
FIX="setparams=color_primaries=bt709:color_trc=bt709:colorspace=bt709"

declare -A MAP=( [nguc]="Ngực" [vai]="Vai" [lung]="Lưng" [tay]="Tay" [bung]="Bụng" [chan]="Chân" )
declare -A CROP=( [nguc]="crop=iw:ih-24:0:24" )   # video Ngực có thanh URL trình duyệt ở mép trên

for key in "${!MAP[@]}"; do
  in="$SRC/${MAP[$key]}.mov"
  extra="${CROP[$key]:-null}"
  echo "-> $in  =>  $OUT/$key.mp4"
  ffmpeg -v error -y -i "$in" \
    -vf "$FIX,$extra,scale=-2:360,format=yuv420p" \
    -an -c:v libx264 -profile:v baseline -level 3.0 -crf 24 -preset slow \
    -movflags +faststart "$OUT/$key.mp4"
  # Poster PNG (frame đầu) để hiển thị khi video chưa tải xong.
  ffmpeg -v error -y -i "$in" -vf "$FIX,$extra,scale=-2:360" -frames:v 1 "$OUT/$key.jpg"
done
echo "Done. Output in $OUT"

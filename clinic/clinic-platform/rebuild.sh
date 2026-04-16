#!/bin/bash
export BUILD_VERSION=$(date +%Y.%m.%d.%H%M)
echo "Build version: $BUILD_VERSION"

# Belirli servis verilmişse sadece onu, yoksa hepsini build et
if [ -n "$1" ]; then
  docker compose up --build -d "$1"
else
  docker compose up --build -d
fi

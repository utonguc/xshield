#!/bin/bash
# Her çalıştırmada BUILD_VERSION'ı otomatik olarak tarih+saat ile set eder
export BUILD_VERSION=$(date +%Y.%m.%d.%H%M)
echo "Build version: $BUILD_VERSION"
sudo -E docker-compose up --build -d "$@"

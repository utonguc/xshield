#!/bin/bash
# Generates a self-signed SSL certificate for xShield e-Clinic
# Usage: ./scripts/gen-ssl.sh [domain]
# Default domain: eclinic.xshield.com.tr

set -e

DOMAIN="${1:-eclinic.xshield.com.tr}"
SSL_DIR="$(dirname "$0")/../nginx/ssl"

mkdir -p "$SSL_DIR"

echo "Generating self-signed certificate for: $DOMAIN"

openssl req -x509 -nodes -days 3650 -newkey rsa:2048 \
  -keyout "$SSL_DIR/selfsigned.key" \
  -out    "$SSL_DIR/selfsigned.crt" \
  -subj "/C=TR/ST=Istanbul/L=Istanbul/O=xShield/OU=e-Clinic/CN=$DOMAIN" \
  -addext "subjectAltName=DNS:$DOMAIN,DNS:www.$DOMAIN,DNS:localhost"

echo ""
echo "Certificate files created:"
echo "  $SSL_DIR/selfsigned.crt"
echo "  $SSL_DIR/selfsigned.key"
echo ""
echo "Certificate is valid for 10 years."
echo "NOTE: Browsers will show a security warning for self-signed certs."
echo "      Add the .crt to your browser/OS trust store to suppress warnings."

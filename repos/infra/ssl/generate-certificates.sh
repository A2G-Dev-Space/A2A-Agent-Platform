#!/bin/bash

# SSL 인증서 디렉토리 생성
SSL_DIR="$(dirname "$0")"
cd "$SSL_DIR"

# 기존 인증서 백업
if [ -f "server.crt" ] || [ -f "server.key" ]; then
    echo "Backing up existing certificates..."
    mkdir -p backup
    mv server.* backup/ 2>/dev/null
fi

# OpenSSL 설정 파일 생성
cat > openssl.cnf <<EOF
[req]
distinguished_name = req_distinguished_name
x509_extensions = v3_req
prompt = no

[req_distinguished_name]
C = KR
ST = Seoul
L = Seoul
O = Company
OU = IT
CN = localhost

[v3_req]
keyUsage = digitalSignature, keyEncipherment
extendedKeyUsage = serverAuth
subjectAltName = @alt_names
basicConstraints = CA:FALSE

[alt_names]
DNS.1 = localhost
DNS.2 = *.localhost
DNS.3 = api-gateway
IP.1 = 127.0.0.1
IP.2 = ${HOST_IP:-172.26.110.192}
EOF

# 개발용 self-signed 인증서 생성
echo "Generating self-signed certificate for development..."
openssl req \
    -x509 \
    -nodes \
    -days 365 \
    -newkey rsa:2048 \
    -keyout server.key \
    -out server.crt \
    -config openssl.cnf

# 권한 설정
chmod 600 server.key
chmod 644 server.crt

echo "SSL certificates generated successfully!"
echo "  - Certificate: $SSL_DIR/server.crt"
echo "  - Private Key: $SSL_DIR/server.key"
echo ""
echo "Note: This is a self-signed certificate for development."
echo "For production, use certificates from a trusted CA."
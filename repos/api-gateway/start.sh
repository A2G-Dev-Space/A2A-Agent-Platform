#!/bin/bash

# API Gateway 시작 스크립트
# SSL 활성화 여부에 따라 HTTPS 또는 HTTP로 시작

set -e

# 환경변수 읽기
SSL_ENABLED=${SSL_ENABLED:-false}
SSL_KEYFILE=${SSL_KEYFILE:-/app/ssl/server.key}
SSL_CERTFILE=${SSL_CERTFILE:-/app/ssl/server.crt}

echo "========================================"
echo "Starting API Gateway"
echo "========================================"
echo "SSL_ENABLED: $SSL_ENABLED"
echo "SSL_KEYFILE: $SSL_KEYFILE"
echo "SSL_CERTFILE: $SSL_CERTFILE"
echo "========================================"

# SSL 활성화 및 인증서 파일 존재 확인
if [ "$SSL_ENABLED" = "true" ] && [ -f "$SSL_KEYFILE" ] && [ -f "$SSL_CERTFILE" ]; then
    echo "✅ Starting with HTTPS (SSL enabled)"
    echo "   Certificate: $SSL_CERTFILE"
    echo "   Private Key: $SSL_KEYFILE"
    echo "========================================"

    exec uv run uvicorn app.main:app \
        --host 0.0.0.0 \
        --port 9050 \
        --reload \
        --ssl-keyfile "$SSL_KEYFILE" \
        --ssl-certfile "$SSL_CERTFILE"
else
    echo "⚠️  Starting with HTTP (SSL disabled or certificates not found)"

    if [ "$SSL_ENABLED" = "true" ]; then
        if [ ! -f "$SSL_KEYFILE" ]; then
            echo "   ❌ SSL key file not found: $SSL_KEYFILE"
        fi
        if [ ! -f "$SSL_CERTFILE" ]; then
            echo "   ❌ SSL certificate file not found: $SSL_CERTFILE"
        fi
    fi

    echo "========================================"

    exec uv run uvicorn app.main:app \
        --host 0.0.0.0 \
        --port 9050 \
        --reload
fi

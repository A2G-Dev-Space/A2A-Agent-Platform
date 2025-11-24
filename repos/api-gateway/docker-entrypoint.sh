#!/bin/bash
set -e

# SSL 설정 확인
if [ "$SSL_ENABLED" = "true" ] && [ -f "$SSL_KEYFILE" ] && [ -f "$SSL_CERTFILE" ]; then
    echo "✅ Starting API Gateway with HTTPS"
    echo "   Certificate: $SSL_CERTFILE"
    echo "   Private Key: $SSL_KEYFILE"
    exec uv run uvicorn app.main:app \
        --host 0.0.0.0 \
        --port 9050 \
        --reload \
        --ssl-keyfile "$SSL_KEYFILE" \
        --ssl-certfile "$SSL_CERTFILE"
else
    echo "⚠️  Starting API Gateway with HTTP"
    [ "$SSL_ENABLED" = "true" ] && [ ! -f "$SSL_KEYFILE" ] && echo "   ❌ SSL key not found: $SSL_KEYFILE"
    [ "$SSL_ENABLED" = "true" ] && [ ! -f "$SSL_CERTFILE" ] && echo "   ❌ SSL cert not found: $SSL_CERTFILE"
    exec uv run uvicorn app.main:app \
        --host 0.0.0.0 \
        --port 9050 \
        --reload
fi

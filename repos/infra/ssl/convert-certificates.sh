#!/bin/bash

# SSL 인증서 변환 스크립트
# .pfx 또는 .p7b 파일을 .crt와 .key 파일로 변환

SSL_DIR="$(dirname "$0")"
cd "$SSL_DIR"

echo "========================================"
echo "SSL Certificate Conversion Script"
echo "========================================"
echo ""

# 사용 방법 출력
print_usage() {
    echo "사용 방법:"
    echo ""
    echo "1. .pfx 파일 변환 (인증서 + 개인키 포함):"
    echo "   ./convert-certificates.sh certificate.pfx"
    echo ""
    echo "2. .p7b 파일 변환 (인증서만, 개인키는 별도 필요):"
    echo "   ./convert-certificates.sh certificate.p7b private.key"
    echo ""
}

# 인자가 없으면 사용 방법 출력
if [ $# -eq 0 ]; then
    print_usage
    exit 1
fi

INPUT_FILE=$1
PRIVATE_KEY_FILE=$2

# 파일 존재 확인
if [ ! -f "$INPUT_FILE" ]; then
    echo "❌ 오류: 파일을 찾을 수 없습니다: $INPUT_FILE"
    exit 1
fi

# 파일 확장자 확인
EXTENSION="${INPUT_FILE##*.}"

case "$EXTENSION" in
    pfx|p12)
        echo "📦 .pfx/.p12 파일 변환 중..."
        echo ""

        # 비밀번호 입력 받기
        echo "인증서 비밀번호를 입력하세요:"
        read -s PFX_PASSWORD
        echo ""

        # 1. 개인키 추출
        echo "1️⃣  개인키 추출 중..."
        openssl pkcs12 -in "$INPUT_FILE" -nocerts -out server.key.encrypted -passin pass:"$PFX_PASSWORD"

        if [ $? -ne 0 ]; then
            echo "❌ 개인키 추출 실패. 비밀번호를 확인하세요."
            rm -f server.key.encrypted
            exit 1
        fi

        # 2. 개인키 복호화 (비밀번호 제거)
        echo "2️⃣  개인키 복호화 중..."
        openssl rsa -in server.key.encrypted -out server.key -passin pass:"$PFX_PASSWORD"
        rm -f server.key.encrypted

        # 3. 인증서 추출
        echo "3️⃣  인증서 추출 중..."
        openssl pkcs12 -in "$INPUT_FILE" -clcerts -nokeys -out server.crt -passin pass:"$PFX_PASSWORD"

        # 4. 중간 인증서 추출 (있는 경우)
        echo "4️⃣  중간 인증서 확인 중..."
        openssl pkcs12 -in "$INPUT_FILE" -cacerts -nokeys -out ca-chain.crt -passin pass:"$PFX_PASSWORD" 2>/dev/null

        if [ -s ca-chain.crt ]; then
            echo "   ✅ 중간 인증서 추출됨: ca-chain.crt"
            # 인증서 체인에 중간 인증서 추가
            cat ca-chain.crt >> server.crt
        else
            rm -f ca-chain.crt
        fi
        ;;

    p7b)
        echo "📦 .p7b 파일 변환 중..."
        echo ""

        # 1. 인증서 추출
        echo "1️⃣  인증서 추출 중..."
        openssl pkcs7 -print_certs -in "$INPUT_FILE" -out server.crt

        if [ $? -ne 0 ]; then
            echo "❌ 인증서 추출 실패"
            exit 1
        fi

        # 2. 개인키 처리
        if [ -n "$PRIVATE_KEY_FILE" ]; then
            if [ -f "$PRIVATE_KEY_FILE" ]; then
                echo "2️⃣  개인키 파일 복사 중..."
                cp "$PRIVATE_KEY_FILE" server.key
            else
                echo "❌ 오류: 개인키 파일을 찾을 수 없습니다: $PRIVATE_KEY_FILE"
                echo ""
                echo "⚠️  .p7b 파일에는 개인키가 포함되어 있지 않습니다."
                echo "   개인키 파일(.key)을 별도로 제공하거나,"
                echo "   CSR 생성 시 사용한 개인키를 사용하세요."
                exit 1
            fi
        else
            echo ""
            echo "⚠️  주의: .p7b 파일에는 개인키가 포함되어 있지 않습니다."
            echo ""
            echo "개인키 파일이 있다면 다음 명령어로 복사하세요:"
            echo "  cp your-private.key $SSL_DIR/server.key"
            echo ""
            echo "개인키가 없다면 새로 생성해야 합니다:"
            echo "  openssl genrsa -out $SSL_DIR/server.key 2048"
            echo ""
        fi
        ;;

    *)
        echo "❌ 지원하지 않는 파일 형식: .$EXTENSION"
        echo ""
        print_usage
        exit 1
        ;;
esac

# 권한 설정
if [ -f server.key ]; then
    chmod 600 server.key
    echo ""
    echo "✅ 개인키 권한 설정: 600 (server.key)"
fi

if [ -f server.crt ]; then
    chmod 644 server.crt
    echo "✅ 인증서 권한 설정: 644 (server.crt)"
fi

echo ""
echo "========================================"
echo "✨ 변환 완료!"
echo "========================================"
echo ""
echo "생성된 파일:"
ls -lh server.crt server.key 2>/dev/null | awk '{print "  " $9 " (" $5 ")"}'
echo ""
echo "인증서 확인:"
echo "  openssl x509 -in server.crt -text -noout"
echo ""
echo "개인키 확인:"
echo "  openssl rsa -in server.key -check"
echo ""
echo "인증서와 개인키 일치 확인:"
echo "  openssl x509 -noout -modulus -in server.crt | openssl md5"
echo "  openssl rsa -noout -modulus -in server.key | openssl md5"
echo "  (두 값이 동일해야 합니다)"
echo ""
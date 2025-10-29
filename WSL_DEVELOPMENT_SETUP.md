# 🖥️ WSL 개발환경 설정 가이드

**작성일**: 2025년 10월 29일
**대상**: A2G Platform 개발팀 전원
**운영체제**: Windows 10/11 WSL2

---

## 📋 목차

1. [WSL2 설치 및 설정](#1-wsl2-설치-및-설정)
2. [기본 개발도구 설치](#2-기본-개발도구-설치)
3. [Node.js 및 Frontend 환경](#3-nodejs-및-frontend-환경)
4. [Python 및 Backend 환경](#4-python-및-backend-환경)
5. [Docker 환경 설정](#5-docker-환경-설정)
6. [데이터베이스 및 Redis](#6-데이터베이스-및-redis)
7. [Git 및 GitHub 설정](#7-git-및-github-설정)
8. [VS Code 설정](#8-vs-code-설정)
9. [프로젝트 시작하기](#9-프로젝트-시작하기)
10. [문제 해결](#10-문제-해결)

---

## 1. WSL2 설치 및 설정

### 1.1 WSL2 활성화 (PowerShell 관리자 권한)

```powershell
# WSL 기능 활성화
wsl --install

# Ubuntu 22.04 설치 (권장)
wsl --install -d Ubuntu-22.04

# WSL2를 기본 버전으로 설정
wsl --set-default-version 2

# 설치 확인
wsl --list --verbose
```

### 1.2 WSL2 초기 설정

```bash
# WSL Ubuntu 터미널에서 실행
# 시스템 업데이트
sudo apt update && sudo apt upgrade -y

# 필수 빌드 도구 설치
sudo apt install -y build-essential curl wget git software-properties-common

# 한국어 설정 (선택사항)
sudo apt install -y language-pack-ko
sudo locale-gen ko_KR.UTF-8
```

### 1.3 WSL2 메모리 설정 (.wslconfig)

Windows 사용자 폴더에 `.wslconfig` 파일 생성:

```ini
# C:\Users\[사용자명]\.wslconfig
[wsl2]
memory=8GB
processors=4
localhostForwarding=true
```

---

## 2. 기본 개발도구 설치

### 2.1 패키지 관리자 및 유틸리티

```bash
# 기본 유틸리티
sudo apt install -y \
    ca-certificates \
    gnupg \
    lsb-release \
    apt-transport-https \
    software-properties-common

# 개발 도구
sudo apt install -y \
    vim \
    nano \
    htop \
    tree \
    jq \
    zip \
    unzip
```

### 2.2 네트워크 도구

```bash
# 네트워크 디버깅 도구
sudo apt install -y \
    net-tools \
    iputils-ping \
    dnsutils \
    telnet \
    netcat
```

---

## 3. Node.js 및 Frontend 환경

### 3.1 NVM(Node Version Manager) 설치

```bash
# NVM 설치
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.0/install.sh | bash

# 환경 변수 적용
source ~/.bashrc

# NVM 설치 확인
nvm --version
```

### 3.2 Node.js 설치

```bash
# Node.js 18 LTS 설치 (권장)
nvm install 18
nvm use 18
nvm alias default 18

# 설치 확인
node --version  # v18.x.x
npm --version   # 9.x.x

# Yarn 설치 (선택사항)
npm install -g yarn

# pnpm 설치 (선택사항)
npm install -g pnpm
```

### 3.3 Frontend 개발도구

```bash
# Vite 전역 설치
npm install -g vite

# 기타 유용한 도구
npm install -g \
    serve \
    http-server \
    json-server \
    concurrently
```

---

## 4. Python 및 Backend 환경

### 4.1 Python 3.11 설치

```bash
# Python 3.11 저장소 추가
sudo add-apt-repository ppa:deadsnakes/ppa
sudo apt update

# Python 3.11 설치
sudo apt install -y python3.11 python3.11-venv python3.11-dev

# pip 설치
curl -sS https://bootstrap.pypa.io/get-pip.py | python3.11

# 기본 Python 버전 설정
sudo update-alternatives --install /usr/bin/python3 python3 /usr/bin/python3.11 1
sudo update-alternatives --config python3
```

### 4.2 UV 패키지 매니저 설치

```bash
# UV 설치 (pip/poetry 대신 사용)
curl -LsSf https://astral.sh/uv/install.sh | sh

# PATH에 추가
echo 'export PATH="$HOME/.cargo/bin:$PATH"' >> ~/.bashrc
source ~/.bashrc

# 설치 확인
uv --version
```

### 4.3 Python 개발도구

```bash
# Python 개발 패키지
pip install --user \
    black \
    flake8 \
    mypy \
    pytest \
    ipython
```

---

## 5. Docker 환경 설정

### 5.1 Docker Desktop for Windows 설치

1. [Docker Desktop](https://www.docker.com/products/docker-desktop) 다운로드
2. WSL2 백엔드 활성화 체크
3. 설치 후 재시작

### 5.2 WSL2에서 Docker 설정

```bash
# Docker가 WSL2에서 실행 중인지 확인
docker --version
docker-compose --version

# Docker 권한 설정 (sudo 없이 사용)
sudo usermod -aG docker $USER
newgrp docker

# Docker 테스트
docker run hello-world
```

### 5.3 Docker Compose 설치 (필요시)

```bash
# Docker Compose 최신 버전 설치
sudo curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
sudo chmod +x /usr/local/bin/docker-compose

# 설치 확인
docker-compose --version
```

---

## 6. 데이터베이스 및 Redis

### 6.1 PostgreSQL 클라이언트

```bash
# PostgreSQL 클라이언트 설치
sudo apt install -y postgresql-client-14

# pgvector 지원을 위한 추가 패키지
sudo apt install -y postgresql-14-pgvector
```

### 6.2 Redis 클라이언트

```bash
# Redis 클라이언트 설치
sudo apt install -y redis-tools

# Redis 연결 테스트
redis-cli ping
```

### 6.3 데이터베이스 GUI 도구 (선택사항)

```bash
# DBeaver 설치 (GUI 도구)
wget -O - https://dbeaver.io/debs/dbeaver.gpg.key | sudo apt-key add -
echo "deb https://dbeaver.io/debs/dbeaver-ce /" | sudo tee /etc/apt/sources.list.d/dbeaver.list
sudo apt update
sudo apt install -y dbeaver-ce
```

---

## 7. Git 및 GitHub 설정

### 7.1 Git 설정

```bash
# Git 최신 버전 설치
sudo add-apt-repository ppa:git-core/ppa
sudo apt update
sudo apt install -y git

# Git 사용자 설정
git config --global user.name "Your Name"
git config --global user.email "your.email@company.com"

# 유용한 Git 별칭 설정
git config --global alias.st status
git config --global alias.co checkout
git config --global alias.br branch
git config --global alias.ci commit
```

### 7.2 GitHub CLI 설치

```bash
# GitHub CLI 설치
curl -fsSL https://cli.github.com/packages/githubcli-archive-keyring.gpg | sudo dd of=/usr/share/keyrings/githubcli-archive-keyring.gpg
echo "deb [arch=$(dpkg --print-architecture) signed-by=/usr/share/keyrings/githubcli-archive-keyring.gpg] https://cli.github.com/packages stable main" | sudo tee /etc/apt/sources.list.d/github-cli.list > /dev/null
sudo apt update
sudo apt install -y gh

# GitHub 인증
gh auth login
```

### 7.3 SSH 키 설정

```bash
# SSH 키 생성
ssh-keygen -t ed25519 -C "your.email@company.com"

# SSH 에이전트 시작
eval "$(ssh-agent -s)"
ssh-add ~/.ssh/id_ed25519

# 공개 키 복사 (GitHub에 등록)
cat ~/.ssh/id_ed25519.pub
```

---

## 8. VS Code 설정

### 8.1 VS Code 설치 및 WSL 연동

Windows에서:
1. [VS Code](https://code.visualstudio.com/) 설치
2. Remote - WSL 확장 설치

WSL에서:
```bash
# WSL에서 VS Code 열기
code .
```

### 8.2 권장 확장 프로그램

```json
{
  "recommendations": [
    "ms-vscode-remote.remote-wsl",
    "ms-python.python",
    "ms-python.vscode-pylance",
    "dbaeumer.vscode-eslint",
    "esbenp.prettier-vscode",
    "bradlc.vscode-tailwindcss",
    "ms-azuretools.vscode-docker",
    "github.copilot",
    "eamodio.gitlens",
    "usernamehw.errorlens"
  ]
}
```

### 8.3 VS Code 설정 (settings.json)

```json
{
  "editor.formatOnSave": true,
  "editor.codeActionsOnSave": {
    "source.fixAll.eslint": true
  },
  "python.linting.enabled": true,
  "python.linting.flake8Enabled": true,
  "python.formatting.provider": "black",
  "[python]": {
    "editor.defaultFormatter": "ms-python.black-formatter"
  },
  "[javascript][typescript][typescriptreact]": {
    "editor.defaultFormatter": "esbenp.prettier-vscode"
  }
}
```

---

## 9. 프로젝트 시작하기

### 9.1 프로젝트 클론 및 설정

```bash
# 작업 디렉토리 생성
mkdir -p ~/projects
cd ~/projects

# 메인 프로젝트 클론
git clone --recursive https://github.com/A2G-Dev-Space/Agent-Platform-Development.git
cd Agent-Platform-Development

# 서브모듈 초기화
git submodule update --init --recursive
```

### 9.2 Docker 서비스 시작

```bash
# PostgreSQL 시작
docker run -d \
  --name a2g-postgres-dev \
  -e POSTGRES_USER=dev_user \
  -e POSTGRES_PASSWORD=dev_password \
  -e POSTGRES_DB=postgres \
  -p 5432:5432 \
  postgres:15-alpine

# Redis 시작
docker run -d \
  --name a2g-redis-dev \
  -p 6379:6379 \
  redis:7-alpine

# 데이터베이스 생성
docker exec -it a2g-postgres-dev psql -U dev_user -d postgres <<EOF
CREATE DATABASE user_service_db;
CREATE DATABASE agent_service_db;
CREATE DATABASE chat_service_db;
CREATE DATABASE tracing_service_db;
CREATE DATABASE admin_service_db;
EOF

# Agent Service용 pgvector 활성화
docker exec -it a2g-postgres-dev psql -U dev_user -d agent_service_db -c "CREATE EXTENSION IF NOT EXISTS vector;"
```

### 9.3 Frontend 실행

```bash
# Frontend 디렉토리로 이동
cd frontend

# 패키지 설치
npm install

# 개발 서버 시작
npm run dev

# 브라우저에서 접속
# http://localhost:9060
```

### 9.4 Backend 서비스 실행 예시

```bash
# User Service 예시
cd repos/user-service

# Python 가상환경 생성
uv venv
source .venv/bin/activate

# 패키지 설치
uv sync

# 환경 변수 설정
cat > .env.local <<EOF
DATABASE_URL=postgresql://dev_user:dev_password@localhost:5432/user_service_db
REDIS_URL=redis://localhost:6379/0
JWT_SECRET_KEY=local-dev-secret-key
SERVICE_PORT=8001
EOF

# 마이그레이션 실행
alembic upgrade head

# 서비스 시작
uvicorn app.main:app --reload --port 8001
```

---

## 10. 문제 해결

### 10.1 WSL2 네트워크 문제

```bash
# WSL2 네트워크 리셋
wsl --shutdown
netsh winsock reset
netsh int ip reset all
netsh winhttp reset proxy
ipconfig /flushdns
```

### 10.2 Docker 연결 문제

```bash
# Docker Desktop 재시작
# Windows 트레이에서 Docker Desktop 재시작

# WSL2에서 Docker 데몬 확인
sudo service docker status
sudo service docker restart
```

### 10.3 포트 접근 문제

```powershell
# Windows PowerShell (관리자)
# Windows Defender 방화벽 규칙 추가
New-NetFirewallRule -DisplayName "WSL2 Ports" -Direction Inbound -LocalPort 3000-9999 -Protocol TCP -Action Allow
```

### 10.4 메모리 부족 문제

```bash
# WSL2 메모리 해제
echo 1 | sudo tee /proc/sys/vm/drop_caches

# 또는 WSL 재시작
wsl --shutdown
wsl
```

### 10.5 파일 권한 문제

```bash
# Windows 파일 시스템 마운트 옵션 설정
# /etc/wsl.conf 파일 생성
sudo nano /etc/wsl.conf

# 다음 내용 추가
[automount]
options = "metadata,umask=22,fmask=11"

# WSL 재시작 필요
wsl --shutdown
```

---

## 📝 개발 팁

### 유용한 별칭 설정 (~/.bashrc)

```bash
# 프로젝트 디렉토리 바로가기
alias a2g='cd ~/projects/Agent-Platform-Development'

# Docker 관련
alias dps='docker ps'
alias dpa='docker ps -a'
alias dl='docker logs'
alias dex='docker exec -it'

# Git 관련
alias gs='git status'
alias gp='git pull'
alias gc='git commit -m'
alias gpo='git push origin'

# Python 관련
alias python=python3.11
alias pip=pip3.11
alias venv='source .venv/bin/activate'
```

### 개발 스크립트 생성

```bash
# ~/start-a2g.sh 생성
#!/bin/bash
echo "🚀 A2G Platform 개발환경 시작..."

# Docker 컨테이너 시작
docker start a2g-postgres-dev a2g-redis-dev

# 프로젝트 디렉토리로 이동
cd ~/projects/Agent-Platform-Development

echo "✅ 개발환경 준비 완료!"
echo "Frontend: cd frontend && npm run dev"
echo "Backend: cd repos/[service-name]"
```

---

## 📞 지원

문제가 발생하면:
1. 이 문서의 문제 해결 섹션 확인
2. Slack #a2g-platform-dev 채널 문의
3. 팀 리더 (syngha.han@company.com) 연락

---

**© 2025 A2G Platform Development Team**
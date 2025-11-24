const { chromium } = require('@playwright/test');

// 테스트 설정
const HOST_IP = process.env.HOST_IP || 'localhost';
const USE_HTTPS = process.env.SSL_ENABLED === 'true';
const PROTOCOL = USE_HTTPS ? 'https' : 'http';
const BASE_URL = `${PROTOCOL}://${HOST_IP}:9050`;

// 색상 코드
const GREEN = '\x1b[32m';
const YELLOW = '\x1b[33m';
const RED = '\x1b[31m';
const BLUE = '\x1b[34m';
const RESET = '\x1b[0m';

// 로그 함수
function log(message, color = RESET) {
    console.log(`${color}${message}${RESET}`);
}

// 테스트 케이스 실행 함수
async function runTest(name, testFn) {
    try {
        log(`\n▶ ${name}`, BLUE);
        await testFn();
        log(`  ✓ ${name} 성공`, GREEN);
        return true;
    } catch (error) {
        log(`  ✗ ${name} 실패: ${error.message}`, RED);
        return false;
    }
}

// 메인 테스트
async function testSSOFlow() {
    log('\n========================================', BLUE);
    log('   A2A Platform SSO Flow 테스트', BLUE);
    log('========================================', BLUE);
    log(`\nBase URL: ${BASE_URL}`, YELLOW);

    const browser = await chromium.launch({
        headless: false,  // 브라우저 화면 표시
        ignoreHTTPSErrors: true,  // 자체 서명 인증서 허용
    });

    const context = await browser.newContext({
        ignoreHTTPSErrors: true
    });

    const page = await context.newPage();
    let testResults = [];

    // 1. API Gateway Health Check
    testResults.push(await runTest('API Gateway Health Check', async () => {
        const response = await page.goto(`${BASE_URL}/health`, { timeout: 10000 });
        if (response.status() !== 200) {
            throw new Error(`Health check failed with status ${response.status()}`);
        }
        const data = await response.json();
        if (data.status !== 'healthy') {
            throw new Error('API Gateway is not healthy');
        }
    }));

    // 2. Mock SSO Health Check
    testResults.push(await runTest('Mock SSO Health Check', async () => {
        const response = await page.goto(`http://${HOST_IP}:9999/health`, { timeout: 10000 });
        if (response.status() !== 200) {
            throw new Error(`Mock SSO health check failed with status ${response.status()}`);
        }
        const data = await response.json();
        if (data.service !== 'mock-sso') {
            throw new Error('Mock SSO is not responding correctly');
        }
    }));

    // 3. SSO Login Flow
    testResults.push(await runTest('SSO Login Redirect', async () => {
        // API Gateway /login endpoint로 이동
        await page.goto(`${BASE_URL}/login`, { timeout: 10000 });

        // Mock SSO 페이지로 리다이렉트되었는지 확인
        await page.waitForURL(/.*9999.*login/, { timeout: 5000 });

        // Mock SSO 로그인 페이지 로드 확인
        const title = await page.textContent('h1');
        if (!title.includes('Mock SSO Login')) {
            throw new Error('Mock SSO login page not loaded');
        }

        log(`    - Mock SSO 로그인 페이지 로드됨`, GREEN);
    }));

    // 4. User Selection and Form Post
    testResults.push(await runTest('User Selection and Callback', async () => {
        // dev1 사용자 선택 (첫 번째 user-card 클릭)
        await page.click('.user-card:first-of-type', { timeout: 5000 });

        // Form post로 /callback 호출되는지 확인
        // Mock SSO가 form_post로 id_token을 전송하면
        // API Gateway의 /callback이 호출되고 HTML 응답을 받음
        await page.waitForURL(/.*9050.*callback/, { timeout: 10000 });

        log(`    - Form post callback 완료`, GREEN);

        // localStorage에 토큰이 저장되었는지 확인
        const authStorage = await page.evaluate(() => {
            return localStorage.getItem('auth-storage');
        });

        if (!authStorage) {
            throw new Error('Auth token not saved in localStorage');
        }

        const authData = JSON.parse(authStorage);
        if (!authData.state || !authData.state.token) {
            throw new Error('Invalid auth data structure');
        }

        log(`    - 토큰이 localStorage에 저장됨`, GREEN);
        log(`    - User: ${authData.state.user?.username || 'Unknown'}`, YELLOW);
    }));

    // 5. Hub Redirect Check
    testResults.push(await runTest('Hub Redirect', async () => {
        // /hub로 리다이렉트되었는지 확인
        await page.waitForURL(/.*\/hub/, { timeout: 5000 });
        log(`    - /hub로 리다이렉트 완료`, GREEN);
    }));

    // 6. Token Verification
    testResults.push(await runTest('Token Verification', async () => {
        // API 호출로 토큰 확인
        const authStorage = await page.evaluate(() => localStorage.getItem('auth-storage'));
        const authData = JSON.parse(authStorage);
        const token = authData?.state?.token;

        if (!token) {
            throw new Error('No token found');
        }

        // /api/users/me로 토큰 확인
        const response = await page.evaluate(async (params) => {
            const res = await fetch(`${params.baseUrl}/api/users/me`, {
                headers: {
                    'Authorization': `Bearer ${params.token}`
                }
            });
            return {
                status: res.status,
                data: await res.json()
            };
        }, { baseUrl: BASE_URL, token });

        if (response.status !== 200) {
            throw new Error(`Token verification failed with status ${response.status}`);
        }

        log(`    - 토큰 검증 성공`, GREEN);
        log(`    - User ID: ${response.data.username}`, YELLOW);
        log(`    - Email: ${response.data.email}`, YELLOW);
    }));

    // 결과 요약
    log('\n========================================', BLUE);
    log('테스트 결과 요약', BLUE);
    log('========================================', BLUE);

    const totalTests = testResults.length;
    const passedTests = testResults.filter(r => r).length;
    const failedTests = totalTests - passedTests;

    log(`\n총 테스트: ${totalTests}`);
    log(`  ✓ 성공: ${passedTests}`, GREEN);
    log(`  ✗ 실패: ${failedTests}`, failedTests > 0 ? RED : GREEN);

    if (USE_HTTPS) {
        log(`\n✓ HTTPS 모드로 테스트 완료`, GREEN);
    } else {
        log(`\n⚠ HTTP 모드로 테스트 완료`, YELLOW);
    }

    await browser.close();

    return failedTests === 0;
}

// 메인 실행
(async () => {
    try {
        const success = await testSSOFlow();
        if (success) {
            log('\n🎉 모든 테스트가 성공했습니다!', GREEN);
            log('\n이제 실제 SSO로 교체할 수 있습니다:', BLUE);
            log('  1. repos/infra/ssl/에 실제 인증서 파일 배치', YELLOW);
            log('  2. repos/infra/.env에서 IDP_ENTITY_ID 업데이트', YELLOW);
            log('  3. ./start.sh 실행', YELLOW);
            process.exit(0);
        } else {
            log('\n❌ 일부 테스트가 실패했습니다', RED);
            process.exit(1);
        }
    } catch (error) {
        log(`\n❌ 테스트 실행 중 오류: ${error.message}`, RED);
        process.exit(1);
    }
})();
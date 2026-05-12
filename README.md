# idRandD License Checker

idRandD IDLive Doc 서버들의 라이선스 만료일을 매일 자동으로 확인하고 Slack으로 알림을 전송하는 Node.js 데몬입니다.

## 기능

- 매일 23:59에 3개 서버의 `/metrics` 엔드포인트를 조회
- Prometheus 포맷에서 `idlivedoc_license_remaining_days` 지표 파싱
- 잔여일에 따라 3단계 상태로 Slack 알림 전송

| 남은 일수 | 상태 | 색상 |
|-----------|------|------|
| 31일 이상 | ✅ 정상 | 초록 |
| 8 ~ 30일  | ⚠️ 경고 | 노랑 |
| 7일 이하  | 🚨 긴급 | 빨강 |

## 모니터링 대상 서버

| 서버 | 엔드포인트 |
|------|-----------|
| ID Check | `http://idLiveDoc-967798788.us-east-1.elb.amazonaws.com/metrics` |
| Verify (Default) | `http://verify-idLiveDoc-225879854.us-east-1.elb.amazonaws.com/metrics` |
| Verify (Upcoming) | `http://verify-new-idLiveDoc-1911579406.us-east-1.elb.amazonaws.com/metrics` |

## 설치

```bash
npm install
```

## 설정

`config/config.json`에서 Slack Webhook URL을 실제 값으로 교체합니다.

```json
{
  "slack": {
    "webhookUrl": "https://hooks.slack.com/services/YOUR/WEBHOOK/URL"
  },
  "licenseCheck": {
    "thresholdDays": 30
  }
}
```

## 실행

```bash
npm start
```

서버 시작 시 즉시 1회 실행되고, 이후 매일 23:59에 자동 실행됩니다.

## 테스트

Slack 알림 없이 잔여일 조회만 확인합니다.

```bash
node test-check.js
```

출력 예시:

```
[ID Check] 라이선스 잔여일 = 76일
[Verify (Default)] 라이선스 잔여일 = 76일
[Verify (Upcoming)] 라이선스 잔여일 = 76일
--- 테스트 완료 ---
```

## 파일 구조

```
├── bin/www               # 엔트리포인트 (클러스터 마스터/워커)
├── worker.js             # 스케줄러 및 작업 실행
├── license-checker.js    # 라이선스 체크 및 Slack 알림 핵심 로직
├── test-check.js         # Slack 없이 잔여일만 확인하는 테스트 스크립트
├── common.js             # 공통 유틸
├── logger.js             # 로거
└── config/
    ├── config.json       # 설정 (Slack Webhook URL, 엔드포인트, 임계값)
    └── index.js          # 설정 로더
```

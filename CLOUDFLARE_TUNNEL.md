# Cloudflare Tunnel 사용 매뉴얼

포스코스틸리온 구매 입찰 지원 시스템을 **PC에서 실행한 채** 외부에서 HTTPS로 접속하기 위한 안내입니다.

공유기 포트포워드나 방화벽 인바운드 개방은 필요 없습니다. `cloudflared`가 밖으로 터널만 엽니다.

---

## 1. 이 프로젝트에서 터널을 여는 방식

개발(`npm run dev`)은 포트가 둘입니다.

| 구분 | 주소 |
| :--- | :--- |
| 프론트 (Vite) | `http://127.0.0.1:5173` |
| API (Express) | `http://127.0.0.1:3001` |

외부 공유는 **한 주소**가 맞습니다. 아래 순서로 **3001 하나**에 화면과 API를 같이 올립니다.

1. `npm run build` — 프론트를 `dist/`에 빌드
2. `npm start` — Express가 3001에서 `/api`와 `dist` 화면을 함께 제공
3. 터널 대상: `http://127.0.0.1:3001`

`dist/`가 없으면 3001은 API만 되고 화면은 나오지 않습니다. 프론트를 수정한 뒤에는 `npm run build`를 다시 해야 터널로 보이는 화면이 바뀝니다.

---

## 2. 준비

- Node.js가 설치되어 있을 것
- 프로세스 환경변수 **`DATABASE_URL`** 이 설정되어 있을 것 (`.env`에 두지 않음)
- [Cloudflare](https://dash.cloudflare.com/) 계정 (무료 가능)
- [cloudflared](https://developers.cloudflare.com/cloudflare-one/connections/connect-networks/downloads/) Windows용 설치

설치 확인:

```bash
cloudflared --version
```

외부에 열기 전에 관리자 비밀번호를 기본값(`admin123`)에서 바꾸는 것을 권장합니다.

```powershell
$env:ADMIN_PASSWORD = "사용할-비밀번호"
```

`DATABASE_URL`과 `ADMIN_PASSWORD`는 **`npm start`를 실행하는 그 터미널**에 있어야 합니다.

---

## 3. 방법 A — 임시 URL (테스트·빠른 공유)

계정에 터널을 등록하지 않습니다. 켤 때마다 주소가 바뀌고, 끄면 사라집니다.

### 3-1. 앱 빌드와 기동

프로젝트 폴더에서:

```bash
npm run build
npm start
```

다음 로그가 나와야 합니다.

```text
API server listening on http://127.0.0.1:3001
```

이 터미널은 끄지 않습니다.

### 3-2. 터널 열기

**다른 터미널**에서:

```bash
cloudflared tunnel --url http://127.0.0.1:3001
```

로그에 비슷한 주소가 나옵니다.

```text
https://xxxx.trycloudflare.com
```

이 URL을 외부 브라우저에서 엽니다. 화면과 API가 같은 호스트에서 동작합니다.

### 3-3. 종료

1. `cloudflared` 터미널에서 `Ctrl+C`
2. `npm start` 터미널에서 `Ctrl+C`

PC가 꺼지거나 둘 중 하나를 끄면 외부 접속이 끊깁니다.

---

## 4. 방법 B — 고정 도메인 (같은 주소를 계속 쓸 때)

본인 도메인이 Cloudflare에 연결되어 있어야 합니다. 도메인이 없으면 방법 A만 사용합니다.

### 4-1. 로그인과 터널 생성

```bash
cloudflared tunnel login
cloudflared tunnel create bid-assistant
```

브라우저에서 Cloudflare 로그인을 마치면 터널 ID와 자격 증명 파일이 생깁니다.

- 자격 증명 예: `C:\Users\msi\.cloudflared\<터널ID>.json`

터널 목록 확인:

```bash
cloudflared tunnel list
```

### 4-2. 설정 파일

`C:\Users\msi\.cloudflared\config.yml` 을 만들고 값을 본인 환경에 맞게 수정합니다.

```yaml
tunnel: <터널ID>
credentials-file: C:\Users\msi\.cloudflared\<터널ID>.json

ingress:
  - hostname: bid.example.com
    service: http://127.0.0.1:3001
  - service: http_status:404
```

마지막 `http_status:404` 규칙은 그대로 둡니다.

### 4-3. DNS 연결

```bash
cloudflared tunnel route dns bid-assistant bid.example.com
```

`bid.example.com`과 터널 이름 `bid-assistant`는 본인이 정한 값으로 바꿉니다.

### 4-4. 앱과 터널 실행

터미널 1:

```bash
npm run build
npm start
```

터미널 2:

```bash
cloudflared tunnel run bid-assistant
```

외부에서는 `https://bid.example.com` 으로 접속합니다.

Windows 시작 시 터널만 자동으로 켜려면:

```bash
cloudflared service install
```

그래도 **앱(`npm start`)은 PC에서 실행 중**이어야 화면이 나갑니다.

---

## 5. 이 프로젝트에서 꼭 지킬 것

| 항목 | 내용 |
| :--- | :--- |
| 터널 대상 | `http://127.0.0.1:3001` (`npm start` 후) |
| 빌드 | 터널 열기 전에 `npm run build` |
| DB | `DATABASE_URL`은 프로세스 환경변수. 터널과 무관 |
| 첨부파일 | `server/data/help-uploads/`는 이 PC 디스크. PC가 꺼지면 파일도 안 보임 |
| 관리자 | 공개 URL이면 `ADMIN_PASSWORD`를 기본값에서 변경 |

개발용 `npm run dev`(5173)로 터널을 열지 마세요. Vite는 localhost 전제인 경우가 많고, API와 호스트가 갈라질 수 있습니다.

---

## 6. 권장 실행 순서 (방법 A)

1. `DATABASE_URL`이 있는 PowerShell을 연다.
2. 프로젝트 폴더로 이동한다.
3. `npm run build`
4. `npm start` — 3001 기동 확인
5. 새 터미널에서 `cloudflared tunnel --url http://127.0.0.1:3001`
6. 로그의 `https://....trycloudflare.com` 으로 접속한다.

---

## 7. 접속이 안 될 때

| 증상 | 확인 |
| :--- | :--- |
| 터널 URL이 연결 거부 / 502 | `npm start`가 꺼져 있거나 3001이 아님 |
| API만 되고 화면이 하얗다 | `npm run build`를 하지 않았거나 `dist/`가 없음 |
| 서버가 바로 종료 | 그 터미널에 `DATABASE_URL`이 없음 |
| 관리자 로그인이 안 됨 | `ADMIN_PASSWORD`가 start한 터미널과 다름 |
| 예전에 쓰던 trycloudflare 주소가 안 됨 | 방법 A는 실행할 때마다 URL이 바뀜 |
| 첨부 다운로드 실패 | 파일이 이 PC `server/data/help-uploads/`에 있는지 |

`cloudflared`는 **PC → Cloudflare 방향(아웃바운드)** 만 있으면 됩니다. 공유기에서 80/443을 열 필요는 없습니다.

---

## 8. 보안 참고

- trycloudflare URL을 아는 사람은 앱에 들어올 수 있습니다.
- 관리자 기본 비밀번호를 쓰지 마세요.
- 사내 자료·첨부파일을 올릴 경우, 가능하면 Cloudflare Access로 이메일/SSO 제한을 검토하세요.
- 터널은 이 PC가 켜져 있고 `npm start`와 `cloudflared`가 살아 있을 때만 동작합니다. 24시간 공개가 필요하면 Render 등 서버 배포가 더 맞습니다.

---

## 9. 관련 명령 요약

```bash
# 프론트 빌드 + API/화면 3001
npm run build
npm start

# 임시 터널
cloudflared tunnel --url http://127.0.0.1:3001

# 고정 터널
cloudflared tunnel login
cloudflared tunnel create bid-assistant
cloudflared tunnel route dns bid-assistant bid.example.com
cloudflared tunnel run bid-assistant
cloudflared tunnel list
```

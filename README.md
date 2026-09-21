# 오밥추 (Obabchu) 🍚

> 오늘 밥 뭐 먹지? 고민은 오밥추에게.

현재 위치를 기준으로 **실시간으로 주변 식당을 불러와** 랜덤 또는 예산·카테고리 맞춤으로 메뉴를 추천해주는 웹 애플리케이션입니다. 기존 정적 HTML 사이트를 **Node.js + Express + SQLite 풀스택 앱**으로 완전히 새로 개발했습니다.

## ✨ 주요 기능

- **🎲 랜덤 추천** — 내 주변 식당 중 하나를 무작위로 추천
- **🍽️ 카테고리·예산 추천** — 원하는 음식 종류와 1인 예산에 맞는 식당·메뉴만 필터링해 추천
- **🕘 추천 기록** — 로그인 시 추천받은 식당이 자동 저장 (조회/삭제)
- **👤 회원가입 / 로그인** — bcrypt 비밀번호 해싱 + JWT(httpOnly 쿠키) 세션
- **🗺️ 지도 표시** — Leaflet + OpenStreetMap으로 추천 식당 위치를 지도에 표시 (API 키 불필요, 어디서나 렌더링). 카카오맵 상세 링크도 함께 제공

## 🔴 실시간 데이터

식당 데이터는 정적 파일을 클라이언트에 그대로 내려주지 않고, **매 요청마다 서버가 사용자의 현재 좌표를 기준으로 거리·카테고리·예산 조건에 맞춰 실시간으로 계산·필터링**해서 반환합니다.

데이터 제공자(provider)는 교체 가능하도록 설계되어 있습니다.

| Provider | 사용 조건 | 설명 |
| --- | --- | --- |
| **Kakao Local API** | `KAKAO_REST_API_KEY` 환경변수 설정 시 | 카카오 로컬 REST API로 현재 위치 주변 식당을 실시간 검색해 병합 |
| **Local dataset** (기본값) | 항상 | 실제 서울(용산 일대) 식당 387곳 데이터셋. 메뉴·가격·평점 포함 |

> 카카오 카테고리 검색 API는 메뉴/가격 정보를 제공하지 않기 때문에, 메뉴·예산 기반 추천은 로컬 데이터셋을 기반으로 동작합니다. `KAKAO_REST_API_KEY`가 있으면 실시간 카카오 검색 결과가 추가로 병합됩니다.

## 🚀 실행 방법

```bash
npm install
npm start
# http://localhost:3000
```

### 환경변수 (선택)

| 변수 | 기본값 | 설명 |
| --- | --- | --- |
| `PORT` | `3000` | 서버 포트 |
| `KAKAO_REST_API_KEY` | (없음) | 설정 시 카카오 로컬 API 실시간 검색 활성화 |
| `JWT_SECRET` | 개발용 기본값 | 프로덕션에서는 반드시 설정 |
| `OBABCHU_DB_PATH` | `data/obabchu.db` | SQLite DB 파일 경로 |

## 🧱 기술 스택 & 구조

- **Backend**: Node.js 20+, Express 4, better-sqlite3, bcryptjs, jsonwebtoken
- **Frontend**: Vanilla JS (프레임워크 없음), 모던 다크 UI, Leaflet(OpenStreetMap) 지도
- **DB**: SQLite (`users`, `history`)

```
server/
  index.js         Express 앱 + API 라우팅
  db.js            SQLite 초기화 & 스키마
  auth.js          회원가입/로그인 (JWT + bcrypt)
  restaurants.js   실시간 식당 provider (Kakao + 로컬 데이터셋)
public/
  index.html       랜딩
  recommend.html   추천 페이지 (지도 포함)
  history.html     추천 기록
  login.html / register.html
  css/  js/  images/
data/
  restaurants.seed.json   서울 식당 시드 데이터
```

## 🔌 API 요약

| Method | Path | 설명 |
| --- | --- | --- |
| `GET` | `/api/config` | 카테고리, 중심 좌표, 카카오 키 등 클라이언트 설정 |
| `GET` | `/api/restaurants` | 조건에 맞는 식당 목록 (실시간 거리 계산) |
| `GET` | `/api/recommend` | 랜덤/맞춤 추천 1건 |
| `POST` | `/api/auth/register` · `/login` · `/logout` | 인증 |
| `GET` | `/api/auth/me` | 현재 로그인 사용자 |
| `GET/POST/DELETE` | `/api/history` | 추천 기록 (로그인 필요) |

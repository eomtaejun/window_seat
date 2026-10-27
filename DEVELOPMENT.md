# 개발 및 로컬 실행

이 저장소는 Three.js와 Vite로 만든 웹게임입니다. `게임 실행.bat`은 이전 로컬 데모에서 개발 서버를 켜는 편의 파일이었으며, 웹게임 실행에 필요한 형식은 아닙니다. 공개 게임은 [GitHub Pages](https://eomtaejun.github.io/window_seat/)에서 브라우저로 바로 열 수 있습니다.

## 로컬 실행

Node.js 20.19+ 또는 22.12+를 설치한 뒤:

```powershell
npm ci
npm run dev
```

`http://localhost:5173/window_seat/`에 접속합니다. 배포 빌드는 `npm run build`, 배포 결과의 로컬 미리보기는 `npm run preview`입니다.

## 폴더 구성

| 경로 | 역할 |
| --- | --- |
| `src/main.js` | 객실, 카메라, 조작, 설정, 날씨, 오디오 |
| `src/world.js` | 9개 풍경 청크의 순환과 지형·식생 배치 |
| `src/style.css` | 화면 구성과 반응형 스타일 |
| `public/models/*.glb` | 직접 생성한 객실·좌석·풍경 소품 8개 |
| `scripts/generate-assets.mjs` | GLB 모델 재생성 (`npm run assets`) |
| `.github/workflows/deploy.yml` | `main` 변경 시 Pages 자동 배포 |

모델과 UI는 이 프로젝트를 위해 직접 제작했습니다. 화면 글꼴은 Google Fonts에 연결되지 않을 때 시스템 글꼴로 대체됩니다. WebGL 2가 지원되는 데스크톱 브라우저를 권장합니다.

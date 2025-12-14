# MD Cleaner

**Markdown Cleaner WebApp** - RichText를 Markdown으로 변환하고 한국어 띄어쓰기를 교정하는 웹 앱입니다.

![License](https://img.shields.io/badge/license-MIT-blue.svg)
![GitHub Pages](https://img.shields.io/badge/GitHub-Pages-blue.svg)
![CI/CD](https://github.com/9bow/mdcleaner/actions/workflows/gh-pages.yml/badge.svg)

## 주요 기능

1. **RichText → Markdown 변환**: Google Docs, MS Word, 웹 페이지 등에서 복사한 서식 있는 텍스트(RichText)를 붙여넣으면 자동으로 Markdown으로 변환됩니다.
   - **Bold**, *Italic*, ~~Strikethrough~~ 등 서식 보존
   - 링크, 리스트, 테이블 등 구조 유지
   - [Turndown.js](https://github.com/mixmark-io/turndown) 기반

2. **한국어 Markdown 띄어쓰기 교정**: Markdown에서 Bold/Italic 등의 서식 마커 뒤에 한글이 바로 오면 렌더링이 제대로 되지 않는 문제를 자동으로 교정합니다.
   * **변환 예시:**
     ```diff
     - **행동 입력(예: 카메라 이동)**을 정확히 반영하기 위해
     + **행동 입력(예: 카메라 이동)** 을 정확히 반영하기 위해
     ```

   * **지원하는 패턴:**
     - `**텍스트**한글` → `**텍스트** 한글` (Bold)
     - `*텍스트*한글` → `*텍스트* 한글` (Italic)
     - `~~텍스트~~한글` → `~~텍스트~~ 한글` (Strikethrough)
     - `` `코드`한글 `` → `` `코드` 한글 `` (Inline code)
     - `(괄호)한글` → `(괄호) 한글` (Parentheses)
     - `[대괄호]한글` → `[대괄호] 한글` (Brackets)
     - `"따옴표"한글` → `"따옴표" 한글` (Quotes)

## GitHub Pages 배포

MD Cleaner 프로젝트는 **GitHub Pages**를 통해 배포됩니다:
1. GitHub 저장소의 **Settings** 탭으로 이동
2. 좌측 메뉴에서 **Pages** 선택
3. **Build and deployment** > **Source**를 **GitHub Actions**로 설정

이후 `main` 브랜치에 코드가 푸시되면 자동으로 GitHub Actions (`.github/workflows/gh-pages.yml`)이 실행되어 배포가 진행됩니다.

## 프로젝트 구조

```
mdcleaner/
├── src/
│   ├── index.html          # 메인 HTML
│   ├── index.css           # 스타일시트
│   ├── index.js            # 메인 진입점
│   └── lib/
│       ├── richtext-converter.js  # HTML → Markdown 변환
│       └── korean-sanitizer.js    # 한국어 띄어쓰기 교정
├── package.json
└── README.md
```

## CLI 명령어

| 명령어 | 설명 |
|--------|------|
| `npm run dev` | 로컬 개발 서버 실행 (Vite, 포트 3000) |
| `npm run build` | 프로덕션 빌드 생성 (`dist` 폴더) |
| `npm run preview` | 빌드된 결과물 로컬 미리보기 |
| `npm test` | 테스트 실행 |

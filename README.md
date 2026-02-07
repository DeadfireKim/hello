# hello

> [프로젝트 한 줄 설명을 여기에 작성하세요]

[![GitHub](https://img.shields.io/badge/github-DeadfireKim/hello-blue?logo=github)](https://github.com/DeadfireKim/hello)

## 📋 프로젝트 소개

이 프로젝트는 PDCA (Plan-Do-Check-Act) 방법론을 적용한 AI 네이티브 개발 프로젝트입니다.

## 🚀 기술 스택

<!-- 사용하는 기술 스택을 추가하세요 -->
- **Frontend**: [예: Next.js, React, TypeScript]
- **Backend**: [예: Node.js, Express, PostgreSQL]
- **Infrastructure**: [예: Vercel, AWS, Docker]
- **Development**: Claude Code, bkit plugin

## 📁 프로젝트 구조

```
hello/
├── docs/                    # PDCA 문서
│   ├── 01-plan/            # 계획 문서
│   ├── 02-design/          # 설계 문서
│   ├── 03-analysis/        # 분석 결과
│   └── 04-report/          # 완료 보고서
├── CLAUDE.md               # Claude Code 프로젝트 가이드
├── .gitignore              # Git 제외 파일
└── README.md               # 프로젝트 문서 (이 파일)
```

## 🔧 시작하기

### 사전 요구사항

- Node.js (버전 명시)
- [기타 필요한 도구]

### 설치

```bash
# 저장소 클론
git clone https://github.com/DeadfireKim/hello.git
cd hello

# 의존성 설치
[패키지 매니저] install

# 개발 서버 실행
[패키지 매니저] dev
```

## 📚 PDCA 방법론

이 프로젝트는 문서 기반 개발 방법론인 PDCA를 따릅니다:

1. **Plan (계획)** - 기능 요구사항 정의 및 계획 수립
2. **Design (설계)** - 상세 설계 문서 작성
3. **Do (실행)** - 설계에 따른 구현
4. **Check (검증)** - 갭 분석으로 설계-구현 일치도 확인
5. **Act (개선)** - 피드백 반영 및 개선

자세한 내용은 [CLAUDE.md](./CLAUDE.md)를 참고하세요.

## 📖 개발 가이드

### 코딩 컨벤션

프로젝트의 코딩 규칙은 [CLAUDE.md](./CLAUDE.md)에 정의되어 있습니다.

### 커밋 메시지

Conventional Commits 형식을 따릅니다:

```
type(scope): subject

예시:
feat(auth): add login button
fix(api): resolve user data fetch error
docs(readme): update installation guide
```

### 브랜치 전략

- `main` - 프로덕션 브랜치
- `feature/*` - 새로운 기능 개발
- `fix/*` - 버그 수정
- `refactor/*` - 리팩토링

## 🤝 기여하기

1. 이 저장소를 Fork합니다
2. 새 브랜치를 생성합니다 (`git checkout -b feature/amazing-feature`)
3. 변경사항을 커밋합니다 (`git commit -m 'feat: add amazing feature'`)
4. 브랜치에 Push합니다 (`git push origin feature/amazing-feature`)
5. Pull Request를 생성합니다

## 📝 라이선스

[라이선스 종류를 명시하세요 - 예: MIT, Apache 2.0]

## 👥 팀

- **DeadfireKim** - [GitHub](https://github.com/DeadfireKim)

## 🔗 관련 링크

- [프로젝트 문서](./CLAUDE.md)
- [PDCA 문서](./docs/)
- [이슈 트래커](https://github.com/DeadfireKim/hello/issues)

---

Built with ❤️ using [Claude Code](https://claude.com/claude-code) and [bkit](https://github.com/bkit-dev)

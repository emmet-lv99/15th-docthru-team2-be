# syntax=docker/dockerfile:1
#
# backend — 프로덕션 이미지 (Prisma 8)
#
# 멀티스테이지로 나눈 이유
#   · bcrypt 은 네이티브 모듈이라 빌드에 python/make/g++ 가 필요하다.
#     이를 빌드 스테이지에만 두고 런타임에는 싣지 않는다.
#   · devDependency 는 빌드에만 필요하므로 최종 이미지에서 제거한다.
#
# Prisma 8 에서 달라진 점 (Prisma 7 → 8)
#   · v7: prisma/schema.prisma + `prisma generate` 로 클라이언트 코드를 만들었다.
#   · v8: src/prisma/contract.prisma(원본) + `prisma contract emit` 으로
#         src/prisma/contract.json·contract.d.ts 를 만든다.
#   · 런타임은 생성된 클라이언트 대신 contract.json 을 그대로 읽는다
#     (@prisma/orm-postgres/runtime). 그래서 이미지 안에서 generate 를 돌리지 않아요.
#   · contract.json 은 저장소에 함께 커밋해 두므로(정판과 동일) COPY src 로 실린다.
#
# ⚠️ 환경변수는 이미지에 넣지 않는다. 실행 시 주입한다.
#    로컬:  docker run -e DATABASE_URL=... -e JWT_ACCESS_SECRET=... ...
#    운영:  Cloud Run 환경변수 / Secret Manager
#    이유:  이미지에 박은 값은 히스토리에 남는다.

# ══ 1. 의존성 설치 ══════════════════════════════════════════
FROM node:24-slim AS deps
WORKDIR /app

RUN corepack enable && corepack prepare pnpm@12.5.1 --activate

# ⚠️ pnpm-workspace.yaml 도 함께 복사해요 — 그 안의 allowBuilds 가 없으면
#    pnpm 12 가 설치 스크립트를 건너뛰어 ERR_PNPM_IGNORED_BUILDS 로 실패합니다.
#    (bcrypt 처럼 네이티브 빌드가 필요한 패키지가 있어 꼭 필요해요)
COPY package.json pnpm-lock.yaml* pnpm-workspace.yaml ./

RUN pnpm install --frozen-lockfile --ignore-scripts=false

# ══ 2. 빌드 (devDependency 필요) ══════════════════════════════
FROM node:24-slim AS build
WORKDIR /app

RUN corepack enable && corepack prepare pnpm@12.5.1 --activate \
    && apt-get update \
    && apt-get install -y --no-install-recommends python3 make g++ ca-certificates \
    && rm -rf /var/lib/apt/lists/*

COPY package.json pnpm-lock.yaml* pnpm-workspace.yaml ./
COPY src ./src

RUN pnpm install --frozen-lockfile

# ══ 3. 런타임 ════════════════════════════════════════════════
FROM node:24-slim AS runtime
WORKDIR /app

RUN corepack enable && corepack prepare pnpm@12.5.1 --activate

ENV NODE_ENV=production \
    PORT=8080

# 프로덕션 의존성만 다시 설치 (devDependency 제거)
COPY package.json pnpm-lock.yaml* pnpm-workspace.yaml ./

RUN pnpm install --prod --frozen-lockfile

COPY src ./src
COPY scripts ./scripts

# Prisma 클라이언트가 사용하는 OpenSSL
RUN apt-get update \
    && apt-get install -y --no-install-recommends openssl \
    && rm -rf /var/lib/apt/lists/*

# ⚠️ root 로 실행하지 않는다
USER node

EXPOSE 8080

# 클라우드 플랫폼은 이 경로로 생존 확인한다.
# 이 엔드포인트는 DB 를 조회하지 않는다.
HEALTHCHECK --interval=30s --timeout=3s --start-period=20s --retries=3 \
  CMD node -e "fetch('http://127.0.0.1:'+(process.env.PORT||8080)+'/api/v1/ping').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"

# 마이그레이션은 이미지 안에서 돌리지 않는다.
#   배포 파이프라인에서 `prisma db migrate` 를 별도 단계로 실행한다 (Prisma 8).
#   (여러 인스턴스가 동시에 마이그레이션 하는 것을 막기 위해)
CMD ["node", "src/main.js"]

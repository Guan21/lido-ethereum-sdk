# build env
FROM node:20-alpine AS build

WORKDIR /app

# 必要なツールをインストール
RUN apk add --no-cache git=2.47.1-r0 python3 make g++

# Pythonシンボリックリンク
RUN ln -sf /usr/bin/python3 /usr/bin/python

# 環境変数 PYTHON を設定
ENV PYTHON=/usr/bin/python3

RUN apk add --no-cache git=2.47.1-r0
COPY package.json ./

# # Install specific version of @types/react
RUN yarn add -D @types/react@18.2.0
RUN yarn add @lidofinance/lido-ui@latest

# RUN yarn install --frozen-lockfile --non-interactive --ignore-scripts && yarn cache clean
RUN yarn install --non-interactive --ignore-scripts && yarn upgrade && yarn cache clean

COPY . .
RUN NODE_NO_BUILD_DYNAMICS=true yarn build
# public/runtime is used to inject runtime vars; it should exist and user node should have write access there for it
RUN rm -rf /app/public/runtime && mkdir /app/public/runtime && chown node /app/public/runtime

# final image
FROM node:20-alpine AS base

ENV NEXT_TELEMETRY_DISABLED=1

WORKDIR /app
RUN apk add --no-cache curl=8.11.1-r0
COPY --from=build /app /app

USER node
EXPOSE 3000

HEALTHCHECK --interval=10s --timeout=3s \
  CMD curl -f http://localhost:3000/api/health || exit 1

CMD ["yarn", "start"]

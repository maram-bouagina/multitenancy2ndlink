# syntax=docker/dockerfile:1
# Étape 1: build
FROM golang:1.25-alpine AS builder

WORKDIR /app

COPY . .

RUN --mount=type=cache,target=/go/pkg/mod \
    --mount=type=cache,target=/root/.cache/go-build \
    sh -c 'for i in 1 2 3; do CGO_ENABLED=0 GOOS=linux GOARCH=amd64 go build -mod=vendor -o /app/api ./main.go && exit 0; echo "go build failed, retry $i/3"; sleep 3; done; exit 1'

# Étape 2: runtime léger
FROM alpine:3.22

WORKDIR /app

RUN apk add --no-cache ca-certificates

COPY --from=builder /app/api /app/api

EXPOSE 8000

CMD ["/app/api"]
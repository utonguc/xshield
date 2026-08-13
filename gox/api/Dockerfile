# goX API — çok aşamalı, yalın statik binary.
FROM golang:1.26-alpine AS build
WORKDIR /src
COPY go.mod go.sum ./
RUN go mod download
COPY . .
ARG VERSION=dev
RUN CGO_ENABLED=0 GOOS=linux go build -ldflags="-s -w -X main.version=${VERSION}" -o /gox-api .

FROM alpine:3.20
RUN apk add --no-cache ca-certificates tzdata && adduser -D -u 10001 gox
USER gox
COPY --from=build /gox-api /usr/local/bin/gox-api
EXPOSE 8080
ENTRYPOINT ["/usr/local/bin/gox-api"]

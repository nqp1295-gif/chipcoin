FROM golang:1.26.4-alpine AS build

WORKDIR /src

COPY services/api/go.mod services/api/go.sum ./

RUN go mod download

COPY services/api/ ./

RUN CGO_ENABLED=0 GOOS=linux go build -o /api ./cmd/api

FROM alpine:3.21

WORKDIR /app

COPY --from=build /api /api

EXPOSE 8080

CMD ["/api"]

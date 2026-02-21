# Go (Golang) — Full Stack Engineer's Guide

> Modern systems programming language for cloud-native backends, CLI tools, and high-performance services

## Table of Contents

- [Why Go for Full Stack Engineers](#why-go-for-full-stack-engineers)
- [Core Language](#core-language)
- [Best Practices & Standards](#best-practices--standards)
- [Web Frameworks & Libraries](#web-frameworks--libraries)
- [Cloud Native Go](#cloud-native-go)
- [Testing](#testing)
- [Anti-Patterns](#anti-patterns)
- [Learning Resources](#learning-resources)
- [Podcasts & YouTube](#podcasts--youtube)
- [Conferences](#conferences)
- [Essential Links](#essential-links)

---

## Why Go for Full Stack Engineers

Go is the backbone of modern infrastructure — Kubernetes, Docker, Terraform, and most CNCF projects are written in Go. As a full stack engineer, Go knowledge unlocks:

- **Cloud-native backend services** with low memory footprint
- **CLI tooling** (kubectl, gh, terraform)
- **High-concurrency APIs** with goroutines and channels
- **Infrastructure automation** and platform engineering
- **gRPC microservices** with native protobuf support

## Core Language

### Fundamentals

- Goroutines and channels (CSP concurrency model)
- Interfaces and structural typing
- Error handling (explicit error returns, no exceptions)
- Slices, maps, and structs
- Pointers (no pointer arithmetic)
- Embedding and composition over inheritance
- `defer`, `panic`, `recover`

### Modern Go (1.18+)

- **Generics** (type parameters) — Go 1.18
- **Structured logging** (`log/slog`) — Go 1.21
- **Range over integers** — Go 1.22
- **Enhanced routing** in `net/http` — Go 1.22
- **Iterator functions** (range over func) — Go 1.23
- **Toolchain management** with `GOTOOLCHAIN`
- **Workspace mode** (`go work`) for multi-module projects

## Best Practices & Standards

### Code Organization

```
project/
├── cmd/                    # Application entry points
│   └── api/
│       └── main.go
├── internal/               # Private application code
│   ├── handler/            # HTTP/gRPC handlers
│   ├── service/            # Business logic
│   ├── repository/         # Data access
│   └── model/              # Domain models
├── pkg/                    # Public reusable packages
├── api/                    # API definitions (proto, OpenAPI)
├── configs/                # Configuration files
├── deployments/            # Docker, K8s manifests
├── go.mod
└── go.sum
```

### ✅ DO

- Use `gofmt` / `goimports` — non-negotiable formatting
- Return errors explicitly — `if err != nil { return err }`
- Use `context.Context` for cancellation and timeouts
- Keep interfaces small (1-3 methods)
- Define interfaces at the consumer side, not the producer
- Use table-driven tests
- Lint with `golangci-lint` (includes 50+ linters)
- Use `go vet` and `staticcheck`
- Prefer stdlib (`net/http`, `encoding/json`, `database/sql`)

### ❌ DON'T

- Don't use `init()` functions unless absolutely necessary
- Don't ignore errors with `_`
- Don't use global mutable state
- Don't create deep package hierarchies
- Don't overuse goroutines — profile first
- Don't return `interface{}` / `any` when a concrete type works
- Don't panic in library code

### Effective Error Handling

```go
// ✅ Wrap errors with context
if err != nil {
    return fmt.Errorf("failed to fetch user %d: %w", id, err)
}

// ✅ Use sentinel errors for expected conditions
var ErrNotFound = errors.New("not found")

// ✅ Use custom error types for rich context
type ValidationError struct {
    Field   string
    Message string
}
func (e *ValidationError) Error() string {
    return fmt.Sprintf("validation failed on %s: %s", e.Field, e.Message)
}
```

## Web Frameworks & Libraries

| Framework | Use Case | Notes |
|-----------|----------|-------|
| **net/http** (stdlib) | Simple APIs | Go 1.22 added method-based routing |
| **Chi** | REST APIs | Lightweight, idiomatic, stdlib-compatible |
| **Gin** | High-performance APIs | Most popular, Martini-like |
| **Echo** | REST APIs | High performance, extensible middleware |
| **Fiber** | Express-like APIs | Built on fasthttp, very fast |
| **Connect** | gRPC + HTTP | Buf's modern gRPC alternative |
| **gRPC-Go** | Microservices | Native protobuf, streaming |

### Key Libraries

- **sqlx** — extensions to `database/sql`
- **GORM** — ORM (use with caution in large projects)
- **sqlc** — generates type-safe Go from SQL
- **Wire** — compile-time dependency injection (Google)
- **Viper** — configuration management
- **Cobra** — CLI framework
- **zerolog / zap** — structured logging
- **otel** — OpenTelemetry instrumentation
- **testify** — test assertions and mocks

## Cloud Native Go

### Kubernetes Ecosystem

Most CNCF tools are Go — understanding Go gives you the ability to extend:

- **client-go** — Kubernetes client library
- **controller-runtime** — build K8s operators
- **Kubebuilder** — scaffold K8s operators
- **Operator SDK** — Red Hat's operator framework

### Building Microservices

```go
// Production-ready HTTP server pattern
srv := &http.Server{
    Addr:         ":8080",
    Handler:      router,
    ReadTimeout:  5 * time.Second,
    WriteTimeout: 10 * time.Second,
    IdleTimeout:  120 * time.Second,
}

// Graceful shutdown
go func() {
    sigCh := make(chan os.Signal, 1)
    signal.Notify(sigCh, syscall.SIGINT, syscall.SIGTERM)
    <-sigCh
    ctx, cancel := context.WithTimeout(context.Background(), 30*time.Second)
    defer cancel()
    srv.Shutdown(ctx)
}()
```

### Docker Best Practice

```dockerfile
# Multi-stage build — ~10MB final image
FROM golang:1.23-alpine AS builder
WORKDIR /app
COPY go.mod go.sum ./
RUN go mod download
COPY . .
RUN CGO_ENABLED=0 GOOS=linux go build -o /server ./cmd/api

FROM scratch
COPY --from=builder /server /server
COPY --from=builder /etc/ssl/certs/ca-certificates.crt /etc/ssl/certs/
EXPOSE 8080
ENTRYPOINT ["/server"]
```

## Testing

### Table-Driven Tests

```go
func TestAdd(t *testing.T) {
    tests := []struct {
        name     string
        a, b     int
        expected int
    }{
        {"positive", 2, 3, 5},
        {"negative", -1, -1, -2},
        {"zero", 0, 0, 0},
    }
    for _, tt := range tests {
        t.Run(tt.name, func(t *testing.T) {
            got := Add(tt.a, tt.b)
            if got != tt.expected {
                t.Errorf("Add(%d, %d) = %d, want %d", tt.a, tt.b, got, tt.expected)
            }
        })
    }
}
```

### Testing Tools

- `go test` — built-in test runner with coverage
- `testify` — assertions, mocks, suites
- `gomock` — interface mocking (Google)
- `httptest` — HTTP handler testing (stdlib)
- `testcontainers-go` — integration tests with real databases
- `goleak` — goroutine leak detection (Uber)

## Anti-Patterns

| Anti-Pattern | Problem | Solution |
|-------------|---------|----------|
| **God package** | Everything in one package | Split by domain/responsibility |
| **Interface pollution** | Premature interface abstractions | Define interfaces where consumed |
| **Goroutine leak** | Goroutines never terminate | Use `context.Context` with cancellation |
| **Shared mutable state** | Race conditions | Use channels or `sync.Mutex` |
| **Error swallowing** | `_ = someFunc()` | Always handle or log errors |
| **Over-engineering** | Java-style patterns in Go | Embrace Go's simplicity |
| **Package `util`** | Grab-bag of unrelated functions | Name packages by what they provide |
| **Premature optimization** | Skipping profiling | Use `pprof` before optimizing |

---

## Learning Resources

### Books

- **"The Go Programming Language"** — Donovan & Kernighan (the Go bible)
- **"Concurrency in Go"** — Katherine Cox-Buday
- **"100 Go Mistakes and How to Avoid Them"** — Teiva Harsanyi
- **"Let's Go" / "Let's Go Further"** — Alex Edwards (web development)
- **"Learning Go"** — Jon Bodner (O'Reilly, 2nd edition)
- **"Cloud Native Go"** — Matthew Titmus

### Online Courses

- [Go by Example](https://gobyexample.com/) — Learn by annotated examples
- [Effective Go](https://go.dev/doc/effective_go) — Official best practices
- [Go Tour](https://go.dev/tour/) — Interactive tutorial
- [Ardan Labs Ultimate Go](https://www.ardanlabs.com/training/) — Advanced Go training
- [Boot.dev — Learn Go](https://boot.dev/) — Backend-focused Go courses
- [Gophercises](https://gophercises.com/) — Coding exercises in Go

### Community

- [Go Forum](https://forum.golangbridge.org/)
- [Gophers Slack](https://gophers.slack.com/) — 70,000+ members
- [r/golang](https://www.reddit.com/r/golang/)
- [Go Wiki](https://go.dev/wiki/)

---

## Podcasts & YouTube

### Podcasts

| Podcast | Focus | Frequency |
|---------|-------|-----------|
| [Go Time](https://changelog.com/gotime) | Go ecosystem deep dives | Weekly |
| [Cup o' Go](https://cupogo.dev/) | Go news and discussions | Weekly |
| [Ardan Labs Podcast](https://www.ardanlabs.com/podcast/) | Advanced Go engineering | Biweekly |
| [Changelog](https://changelog.com/podcast) | Open source (frequent Go episodes) | Weekly |
| [Software Engineering Daily](https://softwareengineeringdaily.com/) | Infra & Go episodes | Daily |

### YouTube Channels

| Channel | Content |
|---------|---------|
| [GopherCon](https://www.youtube.com/@GopherAcademy) | Conference talks archive |
| [justforfunc](https://www.youtube.com/@JustForFunc) | Go tutorials by Francesc Campoy |
| [Melkey](https://www.youtube.com/@MelkeyDev) | Go backend projects |
| [Anthony GG](https://www.youtube.com/@anthonygg_) | Go systems programming |
| [Dreams of Code](https://www.youtube.com/@dreamsofcode) | Go tooling and projects |
| [NerdCademy](https://www.youtube.com/@NerdCademyDev) | Go fundamentals |
| [Boot.dev](https://www.youtube.com/@bootdotdev) | Go backend tutorials |
| [Golang Dojo](https://www.youtube.com/@GolangDojo) | Go tutorials and tips |

### Must-Watch Talks

- "Concurrency Is Not Parallelism" — Rob Pike
- "Go Proverbs" — Rob Pike
- "Advanced Testing with Go" — Mitchell Hashimoto
- "Understanding Channels" — Kavya Joshi
- "GopherCon 2024 Keynote" — latest Go direction

---

## Conferences

| Conference | Location | Notes |
|-----------|----------|-------|
| **GopherCon** | USA (Chicago) | Largest Go conference, all talks on YouTube |
| **GopherCon EU** | Europe (Berlin) | European Go community |
| **GopherCon UK** | London | UK Go community |
| **GopherCon India** | India | Growing Go community |
| **GoLab** | Florence, Italy | Go conference in Italy |
| **dotGo** | Paris | European Go conference |
| **FOSDEM — Go devroom** | Brussels | Open source, free |

---

## Essential Links

### Official

- [go.dev](https://go.dev/) — Official Go website
- [Go Playground](https://go.dev/play/) — Online Go editor
- [Go Blog](https://go.dev/blog/) — Official blog
- [Go Release Notes](https://go.dev/doc/devel/release) — Version history
- [Go Standard Library](https://pkg.go.dev/std) — Stdlib documentation
- [pkg.go.dev](https://pkg.go.dev/) — Package discovery

### Style & Standards

- [Effective Go](https://go.dev/doc/effective_go)
- [Go Code Review Comments](https://go.dev/wiki/CodeReviewComments)
- [Uber Go Style Guide](https://github.com/uber-go/guide/blob/master/style.md)
- [Google Go Style Guide](https://google.github.io/styleguide/go/)
- [Go Proverbs](https://go-proverbs.github.io/)

### Curated Repositories

- [awesome-go](https://github.com/avelino/awesome-go) — Curated list of Go libraries
- [go-patterns](https://github.com/tmrts/go-patterns) — Design patterns in Go
- [golang-standards/project-layout](https://github.com/golang-standards/project-layout) — Standard project layout
- [go-clean-arch](https://github.com/bxcodec/go-clean-arch) — Clean architecture example
- [wild-workouts-go-ddd](https://github.com/ThreeDotsLabs/wild-workouts-go-ddd-example) — DDD in Go

---

*Go's philosophy: "Clear is better than clever." Keep it simple, write readable code, and let the compiler do the heavy lifting.*

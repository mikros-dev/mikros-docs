# Quickstart

This guide helps you stand up a native mikros service in Go — an application
with no HTTP/gRPC surface that runs background work (pollers, schedulers, queue
consumers) under the mikros runtime.

You’ll declare the service kind via service.toml, implement a tiny Start/Stop
pair, and run it with clean, cooperative shutdown.

> Choose this kind of service for long-running jobs that don’t expose endpoints: cron-like
> loops, message consumers, ETL pipelines, or watchdogs that coordinate

## Scaffold the module

```bash
mkdir go-quickstart-example && cd go-quickstart-example
go mod init quickstart-example
```

## Create the definitions file (service.toml)

Create `service.toml` file in the project root:

```toml
name = "quickstart-example"
types = ["native"]
version = "v1.0.0"
language = "go"
product = "Matrix"
```

## Implement the service

Paste this into `main.go` file.

```go
package main

import (
	"context"
	"sync"
	"time"

	"github.com/mikros-dev/mikros"
	logger_api "github.com/mikros-dev/mikros/apis/features/logger"
	"github.com/mikros-dev/mikros/components/options"
)

type service struct {
	// Feature injected by mikros
	Logger logger_api.LoggerAPI `mikros:"feature"`

	// Runtime state
	mu     sync.Mutex         `mikros:"skip"`
	cancel context.CancelFunc `mikros:"skip"`
	wg     sync.WaitGroup     `mikros:"skip"`
}

// Start is invoked by the native server. Do NOT block here — spawn work and return.
func (s *service) Start(ctx context.Context) error {
	s.Logger.Info(ctx, "native service starting")

	wctx, cancel := context.WithCancel(ctx)
	s.mu.Lock()
	s.cancel = cancel
	s.mu.Unlock()

	s.wg.Add(1)
	go func() {
		defer s.wg.Done()
		s.Logger.Info(wctx, "worker loop started")
		t := time.NewTicker(1 * time.Second)
		defer t.Stop()

		for {
			select {
			case <-wctx.Done():
				s.Logger.Info(context.Background(), "worker loop stopping")
				return

			case <-t.C:
				// Put your business logic here (poll queue, call APIs, etc.)

				s.Logger.Info(context.Background(), "tick")
			}
		}

		s.Logger.Info(wctx, "worker loop finished")
	}()

	s.Logger.Info(ctx, "native service started (returning control)")
	return nil
}

// Stop is called on shutdown. It MUST stop everything started in Start and wait.
func (s *service) Stop(ctx context.Context) error {
	s.Logger.Info(ctx, "native service stopping...")

	s.mu.Lock()
	if s.cancel != nil {
		s.cancel()
	}
	s.mu.Unlock()

	done := make(chan struct{})
	go func() {
		s.wg.Wait()
		close(done)
	}()

	select {
	case <-done:
		s.Logger.Info(ctx, "native service stopped")
	case <-time.After(5 * time.Second):
		s.Logger.Warn(ctx, "timeout waiting worker to stop; exiting anyway")
	}

	return nil
}

func (s *service) OnStart(ctx context.Context) error {
	// Initialize custom resources here
    return nil
}

func main() {
	svc := mikros.NewService(&options.NewServiceOptions{
		Service: map[string]options.ServiceOptions{
			"native": &options.NativeServiceOptions{},
		},
	})

	svc.Start(&service{})
}
```

## Run it

```bash
go mod tidy
go build
./quickstart-example
```

# New service type

Mikros supports four built-ins (`grpc`, `http`, `native`, `script`).

When your runtime model doesn’t fit those shapes, you can add a **custom service
type** that behaves like a first-class citizen: it participates in the same lifecycle,
uses the same logging/error/env APIs, validates configuration early, and shuts down
gracefully.

This page explains the process and provides a minimal, production-quality example.


## What it means to add a service type

A custom service kind is a Go type that implements the `plugin.Service` interface
and (optionally) `plugin.ServiceSettings` to load its own `[services.<kind>]`
configuration from `service.toml`.

```go
// Required
type Service interface {
    Name() string
    Info() []flogger.Attribute
    Initialize(ctx context.Context, opt *ServiceOptions) error
    Run(ctx context.Context, srv interface{}) error
    Stop(ctx context.Context) error
}

// Optional
type ServiceSettings interface {
    Definitions(path string) (definition.ExternalServiceEntry, error)
}
```

Mikros passes a fully-populated `ServiceOptions` to your implementation:

```go
type ServiceOptions struct {
    Port           service.ServerPort         // If your kind binds a port (servers)
    Type           definition.ServiceType     // The declared type (e.g., "cronjob")
    Name           service.Name               // Logical service name (from service.toml)
    Product        string
    Logger         flogger.LoggerAPI          // Structured logger
    Errors         ferrors.ErrorAPI           // Standardized error API
    ServiceContext *mcontext.ServiceContext   // Shared runtime context
    Tags           map[string]string          // Runtime tags
    Service        options.ServiceOptions     // Framework-level knobs
    Definitions    *definition.Definitions    // Parsed service.toml
    Features       *FeatureSet                // Resolved features
    ServiceHandler interface{}                // Your handler/root object (if any)
    Env            fenv.EnvAPI                // Env loader/validator
}
```

The `Run` method receives an `interface{}` object which points to the service
main structure, so the service implementation can deal with somehow, if needed.

## Configuration shape

Declare your kind in `types` and place your settings under `[services.<kind>]`.
(If your kind is not a server, omit the `:port` suffix; Go supports `type:port` for
server kinds.)

```toml
name     = "jobs"
language = "go"
product  = "SDS"
version  = "0.1.0"

types = ["cronjob"]

[services.cronjob]
frequency       = "weekly"
scheduled_times = ["02:00", "14:00"]
days            = ["monday"]
```

> Internally, Mikros validates that your type is supported. If you’re adding a
> brand-new string (e.g., `"cronjob"`), make sure your bootstrap path adds it
> to supported types before validation (see your application entrypoint).

## Logging, errors, and validation

* Use `opt.Logger` for structured logs. Prefer attributes (key/value) over
ad-hoc strings for better searchability.
* Use `opt.Errors` to wrap unexpected failures into framework errors (`Internal`,
`NotFound`, etc.) with attributes.
* Validate vigorously in `Definitions.Validate()` and `Initialize`; fail fast
rather than letting bad config reach the hot path.

## Health & readiness

* If your kind binds sockets or depends on downstreams, only report readiness
after the dependency graph is up.
* Native kinds that do background work should expose internal health signals
(counters, last success timestamp) via your observability features.
* Scripts don’t need liveness; exit codes suffice.

## Common patterns

* **Server kinds (websocket, custom TCP):** respect `ServiceOptions.Port`. Bind
listeners in `Initialize` or `Run`, and **block** `Run` while serving; `Stop`
should close listeners and drain.
* **Background kinds (schedulers, consumers):** keep `Run` non-blocking with a
cancelable loop; `Stop` should cancel and drain quickly.
* **Hybrid:** if your service also has `http` in `types`, put shared resources
in `Initialize` and coordinate shutdown via the provided context.

## Example: cronjob service type

A small service type that runs scheduled tasks at configured times. Here we
demonstrate:

* Implementing `plugin.Service`
* Loading typed config with `plugin.ServiceSettings`
* Graceful start/stop using `context.Context`
* Logging and error APIs

### Define typed settings

Implement `definition.ExternalServiceEntry` so Mikros can validate your
block.

```go
package cronjob

import (
	"fmt"
)

// Config under: [services.cronjob]
type Defs struct {
	Frequency      string   `toml:"frequency"`
	ScheduledTimes []string `toml:"scheduled_times"` // "HH:MM" (24h)
	Days           []string `toml:"days"`            // ["monday", ...]
}

func (d *Defs) Name() string {
	return "cronjob"
}

// Validate is called by Mikros after decoding.
func (d *Defs) Validate() error {
	if d.Frequency == "" {
		return fmt.Errorf("frequency is required")
	}

	if len(d.ScheduledTimes) == 0 {
		return fmt.Errorf("at least one scheduled time is required")
	}

	if len(d.Days) == 0 {
		return fmt.Errorf("at least one day is required")
	}

	return nil
}
```

### Implement the service type

```go
package cronjob

import (
    "context"
    "time"
	"strings"

    merrors "github.com/mikros-dev/mikros/apis/features/errors"
    logger_api "github.com/mikros-dev/mikros/apis/features/logger"
    "github.com/mikros-dev/mikros/components/definition"
    "github.com/mikros-dev/mikros/components/logger"
    "github.com/mikros-dev/mikros/components/plugin"
)

// An options structure example to be used the service is being created.
type Options struct {}

func (o *Options) Kind() definition.ServiceType {
	t := definition.CreateServiceType("cronjob")
	return t
}

type Service struct {
    defs  Defs
    log   logger_api.LoggerAPI
    errs  merrors.ErrorAPI

    // internal state for shutdown
    cancel context.CancelFunc
}

// Ensure interface compliance.
var _ plugin.Service = (*Service)(nil)
var _ plugin.ServiceSettings = (*Service)(nil)

func New() *Service {
	return &Service{}
}

func (s *Service) Name() string {
	return "cronjob"
}

func (s *Service) Info() []logger_api.Attribute {
    return []logger_api.Attribute{
        logger.String("service.kind", s.Name()),
        logger.String("frequency", s.defs.Frequency),
    }
}

// Load [services.cronjob] into s.defs as typed configuration.
func (s *Service) Definitions(path string) (definition.ExternalServiceEntry, error) {
	type definitions struct {
		Services struct {
			Config Defs `toml:"cronjob"`
		} `toml:"services"`
	}

	var defs definitions
	if err := definition.ParseExternalDefinitions(path, &defs); err != nil {
		return nil, err
	}

	s.defs = defs.Services.Config
    return &s.defs, nil
}

func (s *Service) Initialize(ctx context.Context, opt *plugin.ServiceOptions) error {
    s.log = opt.Logger
    s.errs = opt.Errors

    s.log.Info(ctx, "cronjob initialize",
        logger.String("frequency", s.defs.Frequency),
        logger.Any("times", len(s.defs.ScheduledTimes)),
        logger.Any("days", len(s.defs.Days)),
    )
    return nil
}

func (s *Service) Run(ctx context.Context, _ interface{}) error {
    // Create a child context we can cancel from Stop()
    runCtx, cancel := context.WithCancel(ctx)
    s.cancel = cancel

    // Start scheduler loop (non-blocking example; adjust as needed)
    go s.scheduler(runCtx)

    // Block until parent context is done (Mikros handles signals)
    <-runCtx.Done()
    return nil
}

func (s *Service) Stop(ctx context.Context) error {
    s.log.Info(ctx, "cronjob stopping")
    if s.cancel != nil {
        s.cancel()
    }

	// Drain/cleanup here if you hold resources
    return nil
}

// --- internals ---

func (s *Service) scheduler(ctx context.Context) {
    // A minimal loop. In real code, compute next fire time precisely.
    ticker := time.NewTicker(1 * time.Minute)
    defer ticker.Stop()

    s.log.Info(ctx, "cronjob scheduler started")

    for {
        select {
        case <-ctx.Done():
            s.log.Info(ctx, "cronjob scheduler stopped")
            return
        case <-ticker.C:
            // Decide if "now" matches one of the configured times/days, then run the job.
            if s.shouldRun(time.Now()) {
                s.runJob(ctx)
            }
        }
    }
}

func (s *Service) shouldRun(now time.Time) bool {
    // Simplified: check weekday and HH:MM matches any configured time.
    // Implement exact matching and time zone handling for production.
    var (
		weekday = strings.ToLower(now.Weekday().String()) // e.g., "monday"
	    hhmm 	= now.Format("15:04")
    	dayOK, timeOK bool
	)

	for _, d := range s.defs.Days {
        if d == weekday {
            dayOK = true
            break
        }
    }

	for _, t := range s.defs.ScheduledTimes {
        if t == hhmm {
            timeOK = true
            break
        }
    }

	return dayOK && timeOK
}

func (s *Service) runJob(ctx context.Context) {
    // Your job logic here. Always honor ctx and bound latencies.
    s.log.Info(ctx, "cronjob tick fired")

	// On unexpected errors, wrap with the framework error API:
    // err := doWork(ctx)
    // if err != nil {
    //     _ = s.errs.Internal(err).Submit(ctx)
    // }
}

// Register a set containing the custom service type to be registered inside
// mikros.
func Register() *plugin.ServiceSet {
	services := plugin.NewServiceSet()
	services.Register(New())
	return services
}
```

> Notes
> * `Run` may block (servers) or run non-blocking and return immediately while
> workers run in the background. Choose the model that makes sense for your kind;
> always honor `ctx.Done()`.
> * Keep `Stop` idempotent and lightweight—cancel, then let loops finish quickly.
> Use timeouts where appropriate.

### Using the new service type

Using Mikros’ extension injection, add the new service type to your service:

```go
package myservice

import (
    "context"

	"github.com/mikros-dev/mikros"
	"github.com/mikros-dev/mikros/components/options"

    "github.com/your-org/your-repo/cronjob" // import your service package
)

type Service struct {}

func main() {
    svc := mikros.NewService(&options.NewServiceOptions{
		Service: map[string]options.ServiceOptions{
			"cronjob": &cronjob.Options{},
		},
    }).WithExternalServices(cronjob.Register()) // Register the new service

    svc.Start(&service{})
}
```

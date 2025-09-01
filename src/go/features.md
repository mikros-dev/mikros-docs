# Features

Mikros features are modular, reusable units of cross-cutting behavior—logging,
error handling, env validation, and more. They integrate cleanly into the service
lifecycle without bloating your business code.

##  Built-in Features

Mikros ships with several default features designed to cover common concerns. They
are already ready to use, i.e., don't need to be enabled in `service.toml`

- **logger** – Structured logging with leveled messages and attributes. Available via `LoggerAPI` and accessed in code with `s.Logger().Info(...)`.
- **errors** – Rich, standardized error handling. Provides error constructors such as `Internal()`, `NotFound()`, and `PermissionDenied()`, supporting structured logging and custom codes.
- **env** – Environment variable loading and validation.
- **http** – Provides methods to interact with the current HTTP response within a request handler.
- **definition** – Provides access to service metadata loaded from the `service.toml` file.

##  Why Use Features

- **Decoupled concerns** — Enable only what you need, keeping your service lean.
- **Safe defaults** — Disabled by default; features only activate when explicitly opted in.
- **Lifecycle-aware** — Features attach at the right phase: during Build, wrap Start/Run, and clean up during Shutdown.
- **Uniform APIs** — Logger and Error APIs are consistent across all services, improving onboarding and maintenance.

##  Using Features in your Service

You can inject the feature into your `Service` struct using the
`mikros:"feature"` tag:

```go
type MyService struct {
    Logger logger_api.LoggerAPI `mikros:"feature"`
    Errors errors_api.ErrorAPI `mikros:"feature"`
}
```

Then, within your service methods, call:

```go
s.Logger.Info(ctx, "Starting operation", logger.String("kind", "startup"))
return s.Errors.Internal(err).WithAttributes(logger.String("op", "Init")).Submit(ctx)
```

This ensures structured logs and consistent error wrapping.

## Hooking into the lifecycle

Features follow the Mikros lifecycle:

| Phase    | What happens, examples                                                                              |
|----------|-----------------------------------------------------------------------------------------------------|
| Build    | Feature checks config via `CanBeInitialized(...)`, then runs `Initialize(...)` to create resources. |
| Run      | Features may wrap handlers or schedule background tasks                                             |
| Shutdown | Features run `Cleanup(...)` to release resources and stop loops                                     |

If disabled, features are no-ops and incur minimal overhead.

## Creating a new feature

Custom features allow you to add cross-cutting capabilities that are specific
to your services or organization.  

To be supported by Mikros, a feature must implement the `Feature` interface
from the `plugin` package.

### Required interface

Every feature must implement:

```go
type Feature interface {
    // Checks if the feature should be used in this service.
    CanBeInitialized(options *CanBeInitializedOptions) bool

    // Initializes resources needed by the feature.
    Initialize(ctx context.Context, options *InitializeOptions) error

    // Informative fields to be logged at startup.
    Fields() []flogger.Attribute

    // Provides name, enabled state, and internal info.
    FeatureEntry
}
```

The embedded FeatureEntry requires:

```go
type FeatureEntry interface {
    UpdateInfo(info UpdateInfoEntry)
    IsEnabled() bool
    Name() string
}
```

> Mikros provides a ready-to-use plugin.Entry struct that implements FeatureEntry.
> Embedding it into your feature struct is the recommended way to get logging,
> error helpers, and state management "for free."

### Example service.toml

```toml
[features.myfeature]
enabled = true
max_connections = 50
endpoint = "https://example.com"
```

### Initialization options

The `InitializeOptions` struct gives your feature everything it needs:

* `Logger`, `Errors`, `Env` – core Mikros APIs. 
* `Definitions` – parsed service.toml. 
* `ServiceContext` – shared runtime context. 
* `Dependencies` – other features your feature depends on. 
* `RunTimeFeatures` – hooks into runtime wiring.

Use these to configure your feature consistently with the rest of the service.

### Optional interfaces

Mikros features can opt into extra behaviors by implementing the following
interfaces. Use them **only if** your feature actually needs the capability—keep
features small and composable.

#### `FeatureController`

Run tasks alongside the service and clean them up on shutdown.

- **Why:** background loops, caches, periodic jobs, or wiring into the service's root object.
- **Lifecycle:** Mikros calls `Start(ctx, srv)` after service initialization; `Cleanup(ctx)` during shutdown.
- **Do:** honor context cancellation; make `Cleanup` idempotent; bound goroutines with backoff/timeouts.
- **Don't:** block `Start` indefinitely; spin unbounded workers.

```go
type FeatureController interface {
    Start(ctx context.Context, srv interface{}) error
    Cleanup(ctx context.Context) error
}
```

#### `FeatureSettings`

Load feature-specific configuration from `service.toml`.

* **Why:** typed config under [features.\<name\>] with validation and defaults.
* **Lifecycle:** called before Initialize; Mikros decodes into your struct. 
* **Config shape:**
  ```toml
  [features.myfeature]
  enabled = true
  # ... your keys here
  ```
* **Tip:** validate eagerly; fail fast on bad config.

```go
type FeatureSettings interface {
    Definitions(path string) (definition.ExternalFeatureEntry, error)
}
```

#### `FeatureExternalAPI`

Integrate with Mikros’ test harness.

* **Why:** flip internal knobs for tests, set up fakes/mocks, and run feature-specific checks.
* **Lifecycle in tests:** `Setup(ctx, t)` → test runs → `Teardown(ctx, t)`. Use `DoTest` for feature-owned assertions.
* **Tip:** keep test state isolated; reset everything in `Teardown`.

Expose a **typed API** for services to consume (e.g., `GreeterAPI`, `CacheAPI`).

* **Why:** make feature capabilities available to handlers without leaking implementation.
* **Lifecycle:** Mikros calls `ServiceAPI()` after `Initialize`; injected into service fields annotated with `mikros:"feature"`. 
* **Tip:** keep APIs small and stable; prefer interfaces over concrete structs.

```go
type FeatureExternalAPI interface {
    ServiceAPI() interface{}
}
```

#### `FeatureInternalAPI`

Expose an API for **framework or extension internals** (not for services).

* **Why:** allow other Mikros internals or feature-to-feature integration.
* **Audience:** framework/extension code only—not your service handlers.

```go
type FeatureInternalAPI interface {
    FrameworkAPI() interface{}
}
```

#### `FeatureTester`

Integrate with Mikros’ test harness.

* **Why:** flip internal knobs for tests, set up fakes/mocks, and run feature-specific checks.
* **Lifecycle in tests:** Setup(ctx, t) → test runs → Teardown(ctx, t). Use DoTest for feature-owned assertions.
* **Tip:** keep test state isolated; reset everything in Teardown.

```go
type FeatureTester interface {
    Setup(ctx context.Context, t *testing.Testing)
    Teardown(ctx context.Context, t *testing.Testing)
    DoTest(ctx context.Context, t *testing.Testing, serviceName service.Name) error
}
```

#### Choosing what to implement

* Only configuration → `FeatureSettings`
* Only public API to services → `FeatureExternalAPI`
* Needs background jobs → `FeatureController`
* Needs framework integration → `FeatureInternalAPI`
* Needs first-class testing → `FeatureTester`

Use the smallest set of interfaces that does the job.

## Example

This example loads config from `service.toml`, exposes a typed API to services,
logs during init, and cleans up on shutdown.

A tiny feature that greets users and demonstrates the recommended structure.

### Feature definitions

```toml
[features.hello]
enabled = true
prefix  = "👋 "     # optional; defaults to "Hello, "
uppercase = false   # optional
```

### Implementation

```go
package hello

import (
    "context"
    "strings"

    fenv "github.com/mikros-dev/mikros/apis/features/env"
    ferrors "github.com/mikros-dev/mikros/apis/features/errors"
    flogger "github.com/mikros-dev/mikros/apis/features/logger"
    "github.com/mikros-dev/mikros/components/definition"
    "github.com/mikros-dev/mikros/components/plugin"
)

// GreeterAPI is the public, typed API that services will use.
type GreeterAPI interface {
    Greet(ctx context.Context, name string) string
}

// cfg holds the feature settings loaded from [features.hello] in service.toml.
type cfg struct {
    Enabled   bool   `toml:"enabled"`
    Prefix    string `toml:"prefix"`
    Uppercase bool   `toml:"uppercase"`
}

func (c *cfg) defaults() {
    if c.Prefix == "" {
        c.Prefix = "Hello, "
    }
}

// HelloFeature implements plugin.Feature and exposes GreeterAPI.
type HelloFeature struct {
    plugin.Entry              // embeds FeatureEntry: Name/IsEnabled/Error helpers
    log    flogger.LoggerAPI
    errs   ferrors.ErrorAPI
    env    fenv.EnvAPI
    conf   cfg
    api    GreeterAPI
}

// Ensure interface compliance.
var _ plugin.Feature = (*HelloFeature)(nil)
var _ plugin.FeatureSettings = (*HelloFeature)(nil)
var _ plugin.FeatureExternalAPI = (*HelloFeature)(nil)

// New returns a new HelloFeature (disabled until UpdateInfo runs).
func New() *HelloFeature { return &HelloFeature{} }

// --- plugin.Feature ---

func (h *HelloFeature) CanBeInitialized(_ *plugin.CanBeInitializedOptions) bool {
    // If disabled in service.toml, Mikros will not Initialize() it.
    return h.IsEnabled()
}

func (h *HelloFeature) Initialize(ctx context.Context, opt *plugin.InitializeOptions) error {
    h.log = opt.Logger
    h.errs = opt.Errors
    h.env = opt.Env

    h.conf.defaults()
    h.api = &greeter{
        prefix:    h.conf.Prefix,
        uppercase: h.conf.Uppercase,
    }

    h.log.Info(ctx, "hello feature initialized",
        flogger.String("feature", h.Name()),
        flogger.String("prefix", h.conf.Prefix),
        flogger.Bool("uppercase", h.conf.Uppercase),
    )
    return nil
}

func (h *HelloFeature) Fields() []flogger.Attribute {
    return []flogger.Attribute{
        flogger.String("feature", "hello"),
        flogger.Bool("enabled", h.IsEnabled()),
    }
}

// --- plugin.FeatureSettings ---
// Load [features.hello] into our cfg struct. Mikros will call this before Initialize().
func (h *HelloFeature) Definitions(path string) (definition.ExternalFeatureEntry, error) {
    // The framework will decode [features.hello] into this struct.
    return &h.conf, nil
}

// --- plugin.FeatureExternalAPI ---
// Expose a typed API that services can consume via feature injection.
func (h *HelloFeature) ServiceAPI() interface{} { return h.api }

// greeter implements GreeterAPI.
type greeter struct {
    prefix    string
    uppercase bool
}

func (g *greeter) Greet(_ context.Context, name string) string {
    msg := g.prefix + name
    if g.uppercase {
        msg = strings.ToUpper(msg)
    }
    return msg
}
```

### Using the feature in a service

Using Mikros’ feature injection, add the API field to your service:

```go
package myservice

import (
    "context"

    flogger "github.com/mikros-dev/mikros/apis/features/logger"
    "github.com/your-org/your-repo/hello" // import your feature package
)

type Service struct {
    Logger  flogger.LoggerAPI `mikros:"feature"`
    Greeter hello.GreeterAPI  `mikros:"feature"` // resolved from HelloFeature.ServiceAPI()
}

func (s *Service) Handle(ctx context.Context, user string) {
    s.Logger.Info(ctx, "handling request")
    msg := s.Greeter.Greet(ctx, user)
    s.Logger.Info(ctx, "greeted user", flogger.String("message", msg))
}
```

### What Mikros wires for you

* Reads `[features.hello]` from `service.toml` and decodes into `cfg`.
* Calls `UpdateInfo` on your embedded `plugin.Entry`.
* Runs `CanBeInitialized` → `Initialize`.
* Injects your `GreeterAPI` into the service (via `ServiceAPI()`). 
* On shutdown, Mikros calls feature cleanup paths.

# Testing

Mikros aims for **fast, deterministic, service-level tests** that feel like
production without the flakiness.  

The testing style is simple:

- **One test function per handler/RPC** (e.g., `TestChangePassword`).
- **Subtests for scenarios** (validation errors, downstream failures, happy path).
- **In-process service**, in-memory HTTP, and **strict mocks**.

## Bootstrapping the service under test

Use `TestMain` to start the real service once for the package. This ensures wiring (features, env, handlers, clients) matches production.

```go
func TestMain(m *testing.M) {
    os.Exit(func() int {
        // Set env only if the service/feature under test requires it
        _ = os.Setenv("MIKROS_EXT_AUTH_URL", "http://example.com")

        // Construct the service with the type(s) you expose in tests
        svc := mikros.NewService(&options.NewServiceOptions{
            Service: map[string]options.ServiceOptions{
                "http": &options.HttpServiceOptions{ /* ... server wiring ... */ },
                // or "grpc": &options.GrpcServiceOptions{ProtoServiceDescription: &pb.My_ServiceDesc},
            },
        }).WithExternalFeatures(mikros_extensions.Features())

        // Start the service, then build the test handler if HTTP
        svc.Start(srv)
        httpHandler, _ = myresource_testpb.NewHttpServer(/* svc, srv, ... */)

        return m.Run()
    }())
}
```

### Why TestMain?

You exercise the real lifecycle (definitions, features, init, shutdown). Fail-fast
config errors surface immediately, not mid-test.

## The test harness

Import `github.com/mikros-dev/mikros/components/testing` as `mtesting` for
convenience and not to confuse with std testing package.

```go
test := mtesting.New(t, &mtesting.Options{
    Handler: httpHandler.HttpHandler(), // omit for pure gRPC tests
    // MockedFeatures: []interface{}{ /* feature doubles if you use them */ },
    // FeatureOptions: map[string]interface{}{"myfeature": MyFeatureOpts{...}},
})
```

* **HTTP helpers:** `test.Get/Post/Put/Patch/Delete(&mtesting.RequestOptions{ Path, Headers, Body, QueryParams })`
run through an in-memory listener (no ports).
* **Assertions:** `test.Assert()` returns `*assert.Assertions`.
* **gomock:** `test.MockController()` and `test.MockAny()`.
* **CI skip:** `test.SkipCICD()` respects `CICD_TEST`.

> If you don’t pass a handler, HTTP helpers return a clear error (“http testing
> is not enabled”).

## Pattern: one test per handler, subtests for scenarios

Keep the top-level test focused on a single handler/RPC and enumerate scenarios
with `t.Run`.

```go
func TestChangePassword(t *testing.T) {
    test := mtesting.New(t, &mtesting.Options{ Handler: httpHandler.HttpHandler() })

    t.Run("invalid body → 400", func(t *testing.T) {
        res, err := test.Post(&mtesting.RequestOptions{
            Path: "/v1/users/me/change-password",
            Body: nil, // empty
        })
        test.Assert().NoError(err)
        test.Assert().Equal(http.StatusBadRequest, res.StatusCode())
        test.Assert().Contains(string(res.Body()), "cannot handle an empty body")
    })

    t.Run("missing fields → 422", func(t *testing.T) {
        res, _ := test.Post(&mtesting.RequestOptions{
            Path: "/v1/users/me/change-password",
            Body: &resourcepb.ChangePasswordRequest{},
        })
        // Use your response helper to assert per-field errors
        // data := ParseHttpResponse(test, res)
        // data.AssertField("id", "body", "cannot be blank")
        // ...
    })

    t.Run("downstream user error → 500", func(t *testing.T) {
        // Arrange: mock dependency
        u := mocks.New(t, mock_user.NewMockUserServiceClient)
        u.Mock(&mocks.MockOptions{
            Call:  u.Recorder().GetUserByID,
            Times: 1,
            Error: srv.Errors.Internal(errors.New("internal user error")).Submit(ctx),
        })
        srv.UserServiceClient = u.Client()

        res, _ := test.Post(&mtesting.RequestOptions{ /* ... valid request ... */ })
        test.Assert().Equal(http.StatusInternalServerError, res.StatusCode())
        test.Assert().Contains(string(res.Body()), "internal user error")
    })

    t.Run("happy path → 200", func(t *testing.T) {
        // Arrange: downstreams return success
        // u.Mock(... Return: &userpb.GetUserByIDResponse{...})
        // v.Mock(... Return: &vaulttypes.UpdatePasswordOutput{})
        res, _ := test.Post(&mtesting.RequestOptions{ /* ... valid request ... */ })
        test.Assert().Equal(http.StatusOK, res.StatusCode())
    })
}
```

### Why this structure?

* Failures are localized (“change-password / missing fields” tells you exactly what broke).
* You can table-drive inside a subtest if needed, but keep **one top-level test per handler**.

## Mocking dependencies (gomock)

Stub downstream clients before invoking the handler. Enforce call counts with
`Times` and prefer **explicit** returns or errors.

```go
u := mocks.New(t, mock_user.NewMockUserServiceClient)
u.Mock(&mocks.MockOptions{
    Call:  u.Recorder().GetUserByID,
    Times: 1,
    Return: &userpb.GetUserByIDResponse{ /* minimal valid shape */ },
    // or Error: srv.Errors.NotFound().Submit(ctx),
})

srv.UserServiceClient = u.Client()
```

Guidelines:

* **One expectation per scenario:** don’t over-specify calls you don’t care about.
* Return the **minimal** valid object; avoid building full graphs.
* Use the Mikros error API (`srv.Errors.Internal(...)`, `.NotFound()`, ...) so
responses are shaped consistently.

## Feature knobs (optional)

If a scenario depends on feature behavior, prefer **feature options** or
**feature fakes** over global state:

```go
test := mtesting.New(t, &mtesting.Options{
    FeatureOptions: map[string]interface{}{
        "tracing": TracingTestOptions{SampleRate: 1.0},
    },
    // MockedFeatures: []interface{}{ MyFeatureFake{ /* … */ } },
})
```

Keep features disabled by default in `service.toml`; only enable what the test
needs.

## Request helpers (HTTP)

Use `RequestOptions` to express requests clearly:

```go
res, err := test.Post(&mtesting.RequestOptions{
    Path:        "/v1/users/me/change-password",
    Headers:     map[string]string{"app_id": "A", "app_secret": "S"},
    QueryParams: map[string]string{"dry_run": "true"},
    Body:        &resourcepb.ChangePasswordRequest{ /* ... */ },
})
```

* Default `ContentType` is JSON; override only when needed (form/multipart).
* Response exposes `StatusCode()` and `Body()`; keep decoding helpers small and shared.

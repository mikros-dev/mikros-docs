# Quickstart

This guide walks you through creating a native mikros service from scratch: a
long-running worker that starts background jobs and shuts down cleanly.

> In mikros, a native service is a general-purpose app (no HTTP/gRPC surface) that
> initializes, starts background tasks inside start, and cleans up in stop.
> The trait requires start not to block; stop must finish/stop jobs.

## Scaffold a bin crate

```bash
cargo new quickstart-example
cd quickstart-example
```

## Add dependencies

> The example uses mikros 0.3.

```toml
[dependencies]
mikros = "0.3"
```

## Create the definitions file (service.toml)

```toml
name = "quickstart-example"
types = ["native"]
version = "v0.1.0"
language = "rust"
product = "Matrix"
```

## Implement the service

Replace src/main.rs with the following minimal:

```rust
use std::sync::Arc;

use mikros::async_trait::async_trait;
use mikros::errors as merrors;
use mikros::service::builder::ServiceBuilder;
use mikros::service::context::Context;
use mikros::service::lifecycle::Lifecycle;
use mikros::service::native::NativeService;
use mikros::tokio;
use mikros::tokio::sync::{Mutex, watch};
use mikros::tokio::task::JoinHandle;

#[derive(Clone, Default)]
struct MyNative {
    shutdown_tx: Option<watch::Sender<()>>,
    shutdown_rx: Option<watch::Receiver<()>>,
    worker: Arc<Mutex<Option<JoinHandle<()>>>>,
}

#[async_trait]
impl Lifecycle for MyNative {
    // Called once when the service starts up (before/around `start`)
    async fn on_start(&mut self, _ctx: Arc<Context>) -> merrors::Result<()> {
        // Put resource initialization here if needed (DB pools, clients, etc.)
        Ok(())
    }

    // Called when the service is finishing (after `stop`)
    async fn on_finish(&self) -> merrors::Result<()> {
        // Close resources if needed
        Ok(())
    }
}

#[async_trait]
impl NativeService for MyNative {
    // IMPORTANT: start must NOT block; kick off background work and return.
    async fn start(&mut self, ctx: Arc<Context>) -> merrors::Result<()> {
        let (shutdown_tx, shutdown_rx) = watch::channel::<()>(());
        self.shutdown_tx = Some(shutdown_tx);
        self.shutdown_rx = Some(shutdown_rx);

        ctx.logger().info("native service starting");

        // Clone what the task needs
        let mut shutdown_rx = self.shutdown_rx.as_ref().unwrap().clone();
        let ctx_for_worker = ctx.clone();

        // Example background job: a simple ticker
        let handle = tokio::spawn(async move {
            ctx_for_worker.logger().info("worker loop started");

            loop {
                tokio::select! {
                    // Await a shutdown signal
                    res = shutdown_rx.changed() => {
                        match res {
                            Ok(()) => {
                                ctx_for_worker.logger().info("shutdown signal received");
                                break;
                            }
                            Err(_closed) => {
                                // Sender dropped; treat as shutdown
                                ctx_for_worker.logger().info("shutdown sender dropped");
                                break;
                            }
                        }
                    }
                    // Do periodic work
                    _ = mikros::tokio::time::sleep(std::time::Duration::from_secs(1)) => {
                        ctx_for_worker.logger().info("worker loop tick");
                    }
                }
            }

            ctx_for_worker.logger().info("worker loop finished");
        });

        // We save handle here so we can wait for it later.
        *self.worker.lock().await = Some(handle);
        Ok(())
    }

    // Called on shutdown request; must stop previously started jobs. (mikros docs)
    async fn stop(&self, ctx: Arc<Context>) {
        if let Some(tx) = &self.shutdown_tx {
            let _ = tx.send(());
        }

        // Wait for worker to finish so logs / println! flush
        if let Some(handle) = self.worker.lock().await.take()
            && let Err(join_err) = handle.await
        {
            ctx.logger()
                .error(format!("worker join error: {join_err}").as_str());
        }

        ctx.logger().info("native service stopped");
    }
}

#[tokio::main]
async fn main() -> Result<(), Box<dyn std::error::Error>> {
    let mut svc = ServiceBuilder::new()
        .native(Box::new(MyNative::default()))
        .build()?;

    Ok(svc.start().await?)
}
```

## Run it

```bash
cargo run
```

You’ll see JSON logs similar to mikros examples—service start, the worker loop
ticking, and shutdown when you ^C.

## What to customize next

* Multiple workers: spawn more tasks in start with their own stop flags.
* Config: read from ctx.env() or ctx.definitions() (typed config, credentials, etc.).
* Features: if you use mikros features, wire them via ServiceBuilder::with_features(...).

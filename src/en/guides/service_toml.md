# service.toml File

A service configuration file is a text file using the
[TOML](https://toml.io/en/) syntax to adjust various information related to it.

Currently, it must contain at least the following information:

* service name
* service category
* version (in [semver](https://semver.org) format)
* service language
* product to which the service belongs

Example:

```toml
name = "alert"
type = "grpc"
version = "v0.1.0"
language = "go"
product = "SDS"
```

## Environment Variables

Services may need specific environment variables. These
variables must also be declared in this configuration file, and
allow for validation of their existence or not during the
service initialization.

These variables are declared in the `envs` object, as follows:

```toml
name = "alert"
type = "grpc"
version = "v0.1.0"
language = "go"
product = "SDS"
envs = [ "VARIABLE_1", "VARIABLE_2" ]
```

## Initial Log Message Level

It is possible to adjust the initial level of log messages displayed by a
service. The **log_level** object allows you to adjust this information as
follows:

```toml
name = "alert"
type = "grpc"
version = "v0.1.0"
language = "go"
product = "SDS"
log_level = "debug"
```

Currently, the following values are supported:

* debug
* info
* warn
* error

## Custom Service Configurations

A special section with the name **service** is available for adding
custom service configurations, which are accessible only within
it.

These configurations are loaded by **Mikros**, being made available
through the `Service.CustomDefinitions` API, being returned in the format
`map[string]interface{}`.

Example:

```toml
name = "alert"
type = "grpc"
version = "v0.1.0"
language = "go"
product = "SDS"

[service]
custom_definition_1 = "Hello World!"
custom_definition_2 = 42
```

This information will be available to the service as follows:

```go
type server struct {
	*mikros.Service
}

func (s *server) Foo() {
	cfg := s.Service.CustomDefinitions()
	customDefinition1 := cfg["custom_definition_1"].(string)
	customDefinition2 := cfg["custom_definition_2"].(int)
}
```

## Changing Host and Port of Coupled Services

Eventually, there may be a need to have a custom _hostname_ and
port to access a particular service coupled to the service itself.
By default, **Mikros** uses fixed values for this information
(which can be changed via environment variables).

To override these values and allow establishing a connection in a customized way,
the service configuration file provides the **clients** section for this
purpose. Internally, as it is an object of type **map**, it can be
used as follows:

```toml
name = "alert"
type = "grpc"
version = "v0.1.0"
language = "go"
product = "SDS"

[clients.service_name]
host = "localhost"
port = 10942
```

## Features

By default, every _feature_ provided by **Mikros** is initialized as disabled
in the service. This way, they need to be explicitly "turned on"
for use.

Every _feature_ is always accessed by a main object called **features**.
The following example shows how to "turn on" the **tracing** _feature_ of a given
service:

```toml
name = "alert"
type = "grpc"
version = "v0.1.0"
language = "go"
product = "SDS"

[features.tracing]
enabled = true
```

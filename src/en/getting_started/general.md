# General Information

**Mikros** was designed with the aim of standardizing both the code of
applications and services, as well as the API between them and the access method to common resources
such as tracing, database, cache, etc.

Its main characteristic is to provide this standard by requiring that these
applications follow only a few simple rules.

## Feature definitions via configuration file

All characteristics of an application, as well as the functionalities it
uses, must be defined in a configuration file called `service.toml`.

As required information, an application must have at least:

* name
* version
* category(ies)
* product

By default, all functionality provided by Mikros - the `features` -
come disabled and must be enabled when desired also through
configurations in this same file.

For more details, see its own [section](/guides/service_toml.md).

## Definition of the main structure

Every application needs to have at least **one** structure (_struct_) responsible
for receiving the API implementation necessary for its service category.

This structure, usually called the main _struct_ of the service, must
have at least one mandatory member, of type `Service`. Usually, we find
its declaration as follows:

```go
type server struct {
	*mikros.Service
}
```

It is also common to use this same structure when there is coupling
between services and some type of reference to their API must be maintained
(see the 'Service Coupling' section for more details).

Since it is a structure, any type of information can be stored
inside it. However, **Mikros**, in its initialization process, performs
a validation on this _struct_ checking if all its members have been properly
initialized, to avoid unexpected behavior during its execution.

For a field to skip this validation, you can use the `mikros` tag
with a specific option for this. As shown in the example:

```go
type server struct {
	uncheckedField string `mikros:"skip"`
	*mikros.Service
}
```

## Initialize the SDK correctly according to the category

The `NewService` API call requires a mandatory `ServiceOptions` argument
where information needed at runtime is passed to the SDK,
aiming to correctly initialize the application.

Depending on the service category, these options must contain its API definition
(whether gRPC or HTTP). However, this can vary greatly due to support
for service category plugins.

### Service Coupling

Eventually, there is a need for a service to exchange information with
another through its gRPC API. When this happens, we say there is at least
one coupling for that particular service.

Mikros implements an (almost) automatic way to initialize these
dependencies, with the service only responsible for indicating the
following information in the SDK initialization:

* The name of the dependent service.
* The API for creating a new client for this service.

In addition, in the main structure of the service, you must reference the service that
will be initialized with the previous information.

Example:

The main structure of the service must contain fields for the desired clients:
```go
type server struct {
  *mikros.Service
  servicepb.ServiceClient `mikros:"grpc_client=service"`
}
```

The value of the `grpc_client` tag must be the same as the key used in the service initialization,
as shown in the following block:
```go
func main() {
  svc := mikros.NewService(&options.ServiceOptions{
    GrpcClients: map[string]*options.GrpcClient{
      "service": {
        ServiceName: mikros.ServiceName("service"),
        ServiceClient: servicepb.NewServiceClient,
      },
    },
  })

  svc.Start(&server{})
}
```

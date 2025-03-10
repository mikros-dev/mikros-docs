# Plugins

Plugin is an internal Mikros system aimed at building APIs,
**internal** - with visibility only to Mikros, and **external** -
where services have access to them.

Every _feature_ provided by Mikros is implemented through this
format.

## Creating Internal Plugins

## Creating External Plugins

## Features

Features correspond to all functionalities exported by Mikros for
services to use them.

Currently, Mikros has the following features:

| Name    | Description                                                                          |
|---------|--------------------------------------------------------------------------------------|
| HTTP    | Allows access to specific APIs for adjusting HTTP protocol information of a service. | 
| Tracing | Adds various monitoring information to the service via Prometheus.                   |


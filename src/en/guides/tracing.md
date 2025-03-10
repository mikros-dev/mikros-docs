# Tracing

Eventually, services may need to expose information and values counted
during their execution that are not common. This information is called
_tracing collectors_ and also defined in the service's own configuration file.

Each _tracing collector_ must have the following information:
* Name
* Category
* Description

In the service configuration file, this information is arranged as follows:
```toml
name = "alert"
type = "grpc"
version = "v0.1.0"
language = "go"
product = "SDS"

[[features.tracing.collectors]]
name = "a_regular_name"
kind = "counter"
description = "the custom collector description."

[[features.tracing.collectors]]
name = "another_name"
kind = "counter_vec"
description = "a simple description"
labels = [ "one", "two", "three" ]

[[features.tracing.collectors]]
name = "a_histogram"
kind = "histogram"
description = "the custom collector description."
labels = [ "first", "second", "third" ]
buckets = [ 0.05, 0.1, 0.25, 0.5 ]
```

It is important to note that the **name** field must have a term in [snake case](https://en.wikipedia.org/wiki/Snake_case)
in lowercase letters.

The **kind** field supports the following formats:

| Type            | Description                                                                                                                                                                                                                          |
|-----------------|--------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------|
| **counter**     | A common counter, which can only be incremented.                                                                                                                                                                                     |
| **counter_vec** | An array of counters, indexed by labels, capable of being incremented.<br>This category requires the use of the **labels** field allowing you to define the counter labels.                                                         |
| **flag**        | A value of type **true** `true` or **false** `false`.                                                                                                                                                                               | 
| **histogram**   | An array of values also indexed by "_labels_", with the possibility of customized intervals.<br>This category requires the use of the **labels** field. It also allows you to define custom intervals<br>using the **buckets** field. |
| **value**       | A common value, allowing updates without restriction of lower or upper limit.                                                                                                                                                        | 

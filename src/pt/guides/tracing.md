# Tracing

Eventualmente serviços podem precisar expor informações e valores contabilizados
durante a sua execução que não são comuns. Essas informações são denominadas
_tracing collectors_ e definidas também no arquivo de configurações do próprio
serviço.

Cada _tracing collector_ deve possuir as seguintes informações:
* Nome
* Categoria
* Descrição

No arquivo de configurações do serviço, essas informações são dispostas da seguinte
maneira:
```toml
name = "alert"
type = "grpc"
version = "v0.1.0"
language = "go"
product = "SDS"

[[features.tracing.collectors]]
name = "a_regular_name"
kind = "counter"
description = "the custom collector decsription."

[[features.tracing.collectors]]
name = "another_name"
kind = "counter_vec"
description = "a simple description"
labels = [ "one", "two", "three" ]

[[features.tracing.collectors]]
name = "a_histogram"
kind = "histogram"
description = "the custom collector decsription."
labels = [ "first", "second", "third" ]
buckets = [ 0.05, 0.1, 0.25, 0.5 ]
```

É importante ressaltar que o campo **name** deve possuir um termo em [snake case](https://en.wikipedia.org/wiki/Snake_case)
em letras minúsculas.

O campo **kind** suporta os seguintes formatos:

| Tipo            | Descrição                                                                                                                                                                                                                                    |
|-----------------|----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------|
| **counter**     | Um contador comum, que pode ser somente incrementado.                                                                                                                                                                                        |
| **counter_vec** | Um array de contadores, indexados por legendas, capaz de serem incrementados.<br>Esta categoria requer o uso do campo **labels** permitindo definir as legendas dos contadores.                                                              |
| **flag**        | Um valor do tipo **verdadeiro** `true` ou **falso** `false`.                                                                                                                                                                                 | 
| **histogram**   | Um array de valores também indexados por "_labels_", com possibilidade de intervalos customizados.<br>Esta categoria requer o uso do campo **labels**. Ela também permite definir intervalos customizados<br>utilizando o campo **buckets**. |
| **value**       | Um valor comum, permitindo atualização sem restrição de limite inferior ou superior.                                                                                                                                                         | 

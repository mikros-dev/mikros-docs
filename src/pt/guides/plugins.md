# Plugins

Plugin é um sistema interno do Mikros visando a construção de APIs,
**internas** - com visibilidade somente ao Mikros, e **externas** -
onde serviços têm acesso a elas.

Toda _feature_ fornecida pelo Mikros é implementada através deste
formato.

## Criando plugins internos

## Criando plugins externos

## Features

Features correspondem a todas as funcionalidades exportadas pelo Mikros para
que serviços possam utilizá-las.

Atualmente, o Mikros possui as seguintes features:

| Nome    | Descrição                                                                                    |
|---------|----------------------------------------------------------------------------------------------|
| HTTP    | Permite acessar APIs específica para ajustes de informações do protocolo HTTP de um serviço. | 
| Tracing | Adiciona ao serviço diversas informações para monitoramento via Prometheus.                  |


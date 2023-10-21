# EcoGis - Backend

<p align="center">
  <img src="logo.svg" height="175px" />
</p>

Repositório destinado ao armazenamento do código do servoço para a aplicação EcoGis.


## Estrutura do documento

- [EcoGis - Backend](#ecogis---backend)
  - [Estrutura do documento](#estrutura-do-documento)
  - [Funcionalidades](#funcionalidades)
  - [Preparação do ambiente](#preparação-do-ambiente)
  - [Ambiente de desenvolvimento](#ambiente-de-desenvolvimento)
  - [Organização e processamento dos dados](#organização-e-processamento-dos-dados)
  - [Implantação](#implantação)
  - [Autores e histórico](#autores-e-histórico)


## Funcionalidades

Os principais objetivos desse serviço são

- [ ] Processamento automatizado dos dados
- [ ] Armazenamento de históricos
- [ ] Fornecer uma API para consulta dos seguintes dados:
  - [ ] Mapas de municipios
  - [ ] Mapas de estados
  - [ ] Mapeamento de queimadas de municípios
  - [ ] Mapeamento de queimadas de estados


## Preparação do ambiente

Este sistema foi desenvolvido e testado em ambientes Unix (Ubuntu, Manjaro e OSX). Embora os procedimento possam, teoricamente, ser replicados em sistemas Windows, pode ser necessário que alguns dos passos listados a seguir sejam adaptados,

Além disso, é necessário que as seguintes dependências estejam instalados no computador.

- [Docker](https://www.docker.com/) (versão 20+) e [Docker composer](https://docs.docker.com/compose/)
- [Node.js](https://nodejs.org/) (versão 18+)
- [Yarn](https://yarnpkg.com/) (versão 1.22+)
- [PostgreSQL](https://www.postgresql.org/) (versão 16+)
- [GDAL](https://gdal.org/) (versão 3.7+) (Para desenvolvimento local somente)


## Ambiente de desenvolvimento

Esta ferramenta foi configurada para permitir o desenvolvimento independente de plataforma com o Docker. 

O primeiro passo consiste na configuração de variáveis de ambiente a partir da criação de um arquivo contendo variáveis de ambiente. Para isso, basta fazer uma cópia do arquivo `.env.example` e alterar os valores.

```sh
cp .env.example .env
```

A seguir, é necessário o download de imagens (postgis) e a construção da imagem do container de desenvolvimento:

```sh
docker compose pull
docker compose build backend.dev
```

Então, precisamos instalar as dependências de desenvolvimento locais com `yarn`:

```sh
docker compose run --rm backend.dev yarn
```

Por fim, precisamos fazer o download dos *shapefiles*  de estados e municipios usando o script 

```sh
 docker compose run --rm backend.dev yarn scripts:download-mapas
```

## Organização e processamento dos dados

Esta aplicação foi desenvolvida para realizar o processamento de dados de queimadas e, futuramente, quaisquer outros recursos mapeados de forma automatizada.

Para isso, é proposta uma organização dos arquivos de forma que os scripts desenvolvidos detectem e processem automaticamente os arquivos fornecidos.

Arquivos *shapefile* mapeados devem estar em diretórios com nomeação na seguinte forma: `YYYYDD`, onde:

- `YYYY` ano de coleta com quatro dígitos, e.g., 2021
- `MM` mês da coleta com dois digitos, e.g., 01 (janeiro) ou 12 (dezembro)

Esses arquivos devem ser colocados no diretório `shapefiles > queimadas`, assim como ilustrado no trecho abaixo.

```
├── shapefiles
│   │   ...
│   └── queimadas
│       ├── 202101
│       │   ├── _1.cpg
│       │   ├── _1.dbf
│       │   ├── _1.shx
│       │   ├── _2.cpg
│       │   ├── _2.dbf
│       │   ├── _2.shx
│       ...
```


## Implantação

Para implantar essa aplicação podemos usar do docker compose para construção e execução da aplicação. O comando abaixo faz a construção da imagem e execução do serviço, junto ao postgis.

```sh
docker compose up --build backend
```

Esse comando irá executar a aplicação e a mesma estará disponível na porta configurada no arquivo `.env`. Por exemplo, se a porta configurada for a 3001, você pode checar a disponibilidade do serviço com

```sh
curl -Is http://127.0.0.1:3001 | head -n 1
# resposta esperada: HTTP/1.1 200 OK
```

**Importante**: Lembre-se de verificar e configurar todas variáveis com cuidado em ambientes de produção.


## Autores e histórico

Este sistema foi desenvolvido pela seguinte equipe:

- [Hudson Silva Borges](https://github.com/hsborges)
- [Allan Menchik](https://github.com/Menchik)
- [Rafael Nantes](https://github.com/rafael-torres-nantes)
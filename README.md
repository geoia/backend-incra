# <p align="center"> Práticas em Desenvolvimento de Software <br/>  </p>

<p align="center">
  <img src="https://user-images.githubusercontent.com/58231791/237037360-3fb30429-cd73-440d-91b7-ab345081c45f.png" height="175px" />
  <br/>
  <small>Logo WebGIS</small>
</p>


O projeto "WebGIS", é uma iniciativa conjunta de extensão e pesquisa liderada pelo laboratório Geomática e Inteligência Artificial, que tem como objetivo monitorar a e gerenciar áreas de queimadas na região do Pantanal e Amazônia, por meio de ferramentas de geoprocessamento e sensoriamento remoto.

## Estrutura do documento

- [Descrição do projeto](#descri%C3%A7%C3%A3o-do-projeto)
- [Funcionalidades](#funcionalidades)
- [Requisitos](#requisitos)
- [Instalação](#instala%C3%A7%C3%A3o--implanta%C3%A7%C3%A3o)
- [Primeiros passos](#primeiros-passos)
- [Autores e histórico](#autores-e-hist%C3%B3rico)
- [Licença](#licen%C3%A7a)

## Descrição do projeto

O Laboratório de Geomática e Inteligência Artificial é um ambiente dedicado à pesquisa e ao ensino em diversas áreas da geomática, como geoprocessamento, cartografia, sensoriamento remoto, topografia e geodésia. Nesse laboratório, utilizam-se técnicas avançadas e tecnologias da informação para gerenciamento de dados espaciais, com o propósito de identificar padrões, tendências e relações entre esses dados. A partir dessas análises, busca-se oferecer insights e soluções inovadoras para desafios geográficos complexos.

O projeto "WebGIS" nasce da urgência de minimizar os danos à biodiversidade decorrentes das queimadas e incêndios florestais. Os impactos desses eventos podem ser catastróficos para o meio ambiente, resultando na perda da fauna e flora, emissão de gases poluentes na atmosfera e agravamento do aquecimento global. Ademais, as queimadas representam um risco à saúde humana, contribuindo para a piora de doenças crônicas e problemas respiratórios da população local. 

Por meio de técnicas avançadas de geoprocessamento e Inteligência Artificial para identificar áreas afetadas por queimadas em um determinado período de tempo. O projeto permite a elaboração de mapas precisos, auxiliando no planejamento e execução de ações de prevenção e combate a incêndios florestais.

## Funcionalidades

Liste as principais funcionalidades do sistema implementado. Você pode usar de checkbox para indicar aquelas que foram, ou não, implementadas na versão atual. Por exemplo:

- [x] Implementar a visualização de queimadas no Brasil;
- [x] Pesquisas locais por queimadas dentro dos limites Múnicipais e Estaduais;
- [ ] ...

## Requisitos

- [Docker](https://www.docker.com/) (versão 20 ou superior)
- [Node.js](https://nodejs.org/) (versão 18.16.0 LTS) 
- [Yarn](https://classic.yarnpkg.com/en/docs/install#windows-stable) (v1.22.19)
- [WSL](https://learn.microsoft.com/pt-br/windows/wsl/install)
- ...

## Instalação / Implantação

Para utilizar a aplicação em seu computador, é necessário clonar o repositório do GitHub em sua máquina local. Para isso, abra o terminal do seu sistema operacional e navegue até o diretório onde deseja armazenar o repositório da aplicação. Em seguida, execute o seguinte comando:

```sh
git clone https://github.com/geoia/backend
```
Esse comando irá clonar o repositório da aplicação em seu diretório atual.

### Instalação de Requisitos

O Yarn é uma alternativa ao npm (Node Package Manager), utilizado para instalar e gerenciar pacotes _Node.js_ e suas dependências. O próximo comando, ao executa-lo no terminal, é usado para instalar o gerenciador de pacotes Yarn de forma global no seu sistema operacional:
```sh
npm install --global yarn
```

WSL ("Windows Subsystem for Linux") permite ao usuário utilizar ferramentas e aplicativos do Linux sem precisar sair do sistema operacional Windows. Para instala-lo, digite no terminal:
 
```sh
wsl --install
```

### Inicializar um ambiente Docker 
 
Docker Compose é uma ferramenta que permite definir e executar aplicativos containers de maneira fácil e eficiente. Utiliza-se um arquivo YAML para definir os serviços que compõem um aplicativo, e pode ser usado para iniciar, parar e gerenciar vários contêineres Docker como um único aplicativo. Com o Docker Compose, é possível definir todas as dependências do aplicativo em um único arquivo, facilitando a implantação e o gerenciamento. 

Abra o terminal no diretório do projeto, e siga com os seguintes comandos para importar e iniciar o ambiente da aplicação:

```sh
docker compose build backend.dev
```
> Constrói as imagens Docker definidas no arquivo backend.dev

```sh
docker compose run --rm backend.dev yarn
```
> Inicia um container temporário e executa o comando yarn no contexto do container.

```sh
docker compose run --rm backend.dev yarn scripts:municipios
```
> Executa o script definido no arquivo package.json chamado "scripts:municipios".

```sh
docker compose up backend.dev
```
>  Inicia o ambiente de desenvolvimento completo. Desse modo, a aplicação estará pronta para ser usada para fins de desenvolvimento.

A aplicação será executada em http://localhost:3001.

## Primeiros passos

A aplicação atualmente oferece recursos para realizar buscas de Municípios e Estados que apresentam registros de queimadas dentro de seus limites territoriais. A aplicação fornece uma **API** que permite visualizar as regiões dos polígonos de queimadas, acessível através da busca pelo _nome ou ID do Município_. Na imagem abaixo, é possível ver a tela de visualização dos polígonos de queimadas:

<p align="center">
  <img src="" height="175px" />
  <br/>
  <small></small>
</p>

>   A resposta será um texto GeoJSON contendo as informações dos polígonos das áreas queimadas no Município correspondente ao ID informado.

Além disso, na outra sessão da **API**, encontra-se uma sessão de pesquisa de busca por _nome, sigla ou [ID de Estado](https://docs.google.com/spreadsheets/d/1tQB3EUXZrys5tpWlwSLnpINiCo4D6c8WZem821ei9GM/edit?usp=sharing)_, em que também é possível acessar a visualização dos polígonos de queimadas. A figura abaixo mostra a tela de visualização dos polígonos de queimadas disponíveis para um determinado Estado.

<p align="center">
  <img src="" height="175px" />
  <br/>
  <small></small>
</p>

>  A resposta será um texto GeoJSON contendo as informações dos polígonos das áreas queimadas no Estado correspondente ao ID informado.

## Autores e histórico

Este sistema foi desenvolvido pela seguinte equipe:

- [Hudson Silva Borges](https://github.com/hsborges) (hudsonsilbor@gmail.com)
- [Allan Menchik da Cunha](https://github.com/Menchik) (allan.m@ufms.br)
- [Lourdes Oshiro Igarashi](https://github.com/LourdesOshiroIgarashi) (lourdes.oshiro@ufms.br)
- [Marcus Vinícius Borges Gajozo](https://github.com/marcusgajozo) (marcusgajozo@gmail.com)
- [Matheus Nantes Rezende da Silva](https://github.com/matheus-nantes) (nantes.matheus@ufms.br)
- [Rafael Torres Nantes](https://github.com/rafael-torres-nantes) (rafatorresnantes@gmail.com)
- [Thiago Aparecido Alves Corrêa](https://github.com/Tcheagow) (thiago.apalvs@gmail.com)

Orientado pelo professor [Hudson Silva Borges](https://github.com/hsborges) e proposto por XXXX YYYY.

> :warning: Se o projeto for de continuidade, vocẽ deverá mencionar qual e criar um link para o projeto original.

## Licença

Este sistema está disponível sob a licença [XXXX](https://opensource.org/licenses/).

> :warning: Você deve discutir a licença com seu professor orientador!

> :warning: Lembre-se também de criar, ou alterar, o arquivo LICENSE deste repositório para refletir adequadamente a licença atual.

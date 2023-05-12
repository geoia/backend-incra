# <p align="center"> Práticas em Desenvolvimento de Software <br/> (Repositório Modelo) </p>

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

Aqui você deve apresentar todos os requisitos para que sua aplicação funcione corretamente. Você também pode listar dependências opcionais, se houver.

Começe indicando qual, ou quais, sistemas operacionais são suportados. Por exemplo: `Este sistema foi desenvolvido e amplamente testado em ambientes Unix ...`

Para cada uma das dependências do sistema é importatne listar também a versão mínima necessária. Por exemplo:

- [Docker](https://www.docker.com/) (versão 20 ou superior)
  - Se necessário, você pode deixar alguma observação ou instrução necessária.
- [Node.js](https://nodejs.org/) (versão 18.16.0 LTS)
- [WSL](https://learn.microsoft.com/pt-br/windows/wsl/install) 
- [Yarn](https://classic.yarnpkg.com/en/docs/install#windows-stable)
- ...

## Instalação / Implantação

Docker Compose é uma ferramenta que permite definir e executar aplicativos containers de maneira fácil e eficiente. Utiliza-se um arquivo YAML para definir os serviços que compõem um aplicativo, e pode ser usado para iniciar, parar e gerenciar vários contêineres Docker como um único aplicativo. Com o Docker Compose, é possível definir todas as dependências do aplicativo em um único arquivo, facilitando a implantação e o gerenciamento. 

```sh
docker compose build backend.dev
```

```sh
docker compose run --rm backend.dev yarn
```

```sh
docker compose run --rm backend.dev yarn scripts:municipios
```

```sh
docker compose up backend.dev
```

```sh
npm install --global yarn
```

Se o sistema precisa ser implantado manualmente, descreva detalhadamente os passos necessários para a correta instalação. Neste caso, u

1. Abra um terminal no diretório do projeto ....
2. Instale as dependências usando o comando xxxx ...
3. Compile o código fonte com o comando yyyy ...
4. ....

Por fim, lembre-se de destacar quando necessário quais variáveis de ambientes (do inglês _environment variables_) são utilizadas ou necessárias para o processo. Muitas vezes a falta destas variáveis pode causar erros e impedir a correta implantação do sistema.

## Primeiros passos

Use esta seção para mostrar os primeiros passos para usar a aplicação. Lembre-se que esta parte deve ser focada no uso pelos clientes finais da aplicação, portanto, seja objetivo e use _screenshots_ quando necessário.

## Autores e histórico

Este sistema foi desenvolvido pela seguinte equipe:

- [Hudson Silva Borges](https://github.com/hsborges) (hudsonsilbor@gmail.com)
- [Allan Menchik da Cunha](https://github.com/Menchik) (allan.m@ufms.br)
- [Lourdes Oshiro Igarashi](https://github.com/LourdesOshiroIgarashi) (@gmail.com)
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

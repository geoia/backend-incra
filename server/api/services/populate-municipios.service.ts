import knex from '../../common/knex';
import consola from 'consola';
import axios from 'axios';
import { each, mapSeries } from 'bluebird';
import { join } from 'node:path';

import ogr2ogr from '../../common/utils/ogr2ogr';
import { normalizeSRID } from '../../common/utils/normalizeSRID';

interface MunicipiosIBGE {
  'municipio-id': number;
  'municipio-nome': string;
  'microrregiao-id': number;
  'microrregiao-nome': string;
  'mesorregiao-id': number;
  'mesorregiao-nome': string;
  'regiao-imediata-id': number;
  'regiao-imediata-nome': string;
  'regiao-intermediaria-id': number;
  'regiao-intermediaria-nome': string;
  'UF-id': number;
  'UF-sigla': string;
  'UF-nome': string;
  'regiao-id': number;
  'regiao-sigla': string;
  'regiao-nome': string;
}

export async function populateDadosMunicipios(override?: boolean) {
  const hasTable = await knex.schema.withSchema('public').hasTable('dados_municipios');

  if (hasTable && !override) {
    consola.warn('Já existem dados dos municipios no banco!');
    return;
  }

  consola.info('Coletando dados da API do IBGE...');
  const { data } = await axios.get(
    'http://servicodados.ibge.gov.br/api/v1/localidades/municipios?view=nivelado'
  );

  if (!hasTable) {
    consola.info('Criando tabela para organização dos dados...');
    await knex.schema.withSchema('public').createTable('dados_municipios', (table) => {
      table.integer('id').primary();
      table.string('nome');
      table.integer('microrregiao_id');
      table.string('microrregiao_nome');
      table.integer('mesorregiao_id');
      table.string('mesorregiao_nome');
      table.integer('regiao_imediata_id');
      table.string('regiao_imediata_nome');
      table.integer('regiao_intermediaria_id');
      table.string('regiao_intermediaria_nome');
      table.integer('uf_id');
      table.string('uf_sigla');
      table.string('uf_nome');

      table.index('nome');
      table.index('uf_id');
    });
  }

  consola.info('Iterando sobre os resultados...');
  await mapSeries(data, async (mData: MunicipiosIBGE) => {
    consola.info(`Inserindo ${mData['municipio-nome']}-${mData['UF-sigla']}...`);

    await knex
      .insert({
        id: mData['municipio-id'],
        nome: mData['municipio-nome'],
        microrregiao_id: mData['microrregiao-id'],
        microrregiao_nome: mData['microrregiao-nome'],
        mesorregiao_id: mData['mesorregiao-id'],
        mesorregiao_nome: mData['mesorregiao-nome'],
        regiao_imediata_id: mData['regiao-imediata-id'],
        regiao_imediata_nome: mData['regiao-imediata-nome'],
        regiao_intermediaria_id: mData['regiao-intermediaria-id'],
        regiao_intermediaria_nome: mData['regiao-intermediaria-nome'],
        uf_id: mData['UF-id'],
        uf_sigla: mData['UF-sigla'],
        uf_nome: mData['UF-nome'],
      })
      .into('dados_municipios')
      .onConflict('id')
      .ignore();
  });

  consola.success('Dados dos municipios inseridos!');
}

async function populateMapasMunicipios(override?: boolean) {
  const [hasMunicipios, hasEstados, hasBiomas, hasBrasil] = await Promise.all([
    knex.schema.withSchema('shapefiles').hasTable('br_municipios_2021'),
    knex.schema.withSchema('shapefiles').hasTable('br_uf_2021'),
    knex.schema.withSchema('shapefiles').hasTable('biomas'),
    knex.schema.withSchema('shapefiles').hasTable('br_pais_2021'),
  ]);

  if (hasMunicipios && hasEstados && hasBiomas && hasBrasil && !override) {
    consola.warn('Já existem mapas dos municipios, estados e biomas no banco!');
    return;
  }

  consola.info('Carregando shapefiles do ibge no banco de dados...');
  await Promise.all([
    ogr2ogr(join('mapas', 'BR_Municipios_2021', 'BR_Municipios_2021.shp')),
    ogr2ogr(join('mapas', 'BR_UF_2021', 'BR_UF_2021.shp')),
    ogr2ogr(join('mapas', 'Biomas', 'lm_bioma_250.shp')),
    ogr2ogr(join('mapas', 'BR_Pais_2021', 'BR_Pais_2021.shp')),
  ]);

  await knex.transaction(async (trx) => {
    consola.info('Removendo dados antigos...');
    await Promise.all([
      trx.schema.withSchema('public').raw('DROP TABLE IF EXISTS mapas_municipios CASCADE'),
      trx.schema.withSchema('public').raw('DROP TABLE IF EXISTS mapas_estados CASCADE'),
      trx.schema.withSchema('public').raw('DROP TABLE IF EXISTS mapas_biomas CASCADE'),
      trx.schema.withSchema('public').raw('DROP TABLE IF EXISTS mapa_brasil CASCADE'),
    ]);

    consola.info('Copiando dados das tabelas...');
    await Promise.all([
      trx.schema.withSchema('public').raw(`
        CREATE TABLE public.mapas_estados AS 
        SELECT cd_uf::integer AS id, nm_uf AS nome, sigla, nm_regiao AS regiao, cd_uf::integer AS ref_id, wkb_geometry::geometry(polygon)
        FROM shapefiles.br_uf_2021
      `),
      trx.schema.withSchema('public').raw(`
        CREATE TABLE public.mapas_municipios AS 
        SELECT cd_mun::integer AS id, nm_mun AS nome, sigla, area_km2, cd_mun::integer AS ref_id, wkb_geometry::geometry(polygon)
        FROM shapefiles.br_municipios_2021
      `),
      trx.schema.withSchema('public').raw(`
        CREATE TABLE public.mapas_biomas AS 
        SELECT REPLACE(LOWER(UNACCENT(bioma)), ' ', '_') AS id, bioma, cd_bioma::integer AS ref_id, wkb_geometry::geometry(polygon) 
        FROM shapefiles.lm_bioma_250
      `),
      trx.schema.withSchema('public').raw(`
        CREATE TABLE public.mapa_brasil AS 
        SELECT ogc_fid::integer AS id, nm_pais AS nome, area_km2, wkb_geometry::geometry(polygon)
        FROM shapefiles.br_pais_2021 mb 
      `),
    ]);

    consola.info('Normalizando referências...');
    await Promise.all([
      normalizeSRID('public.mapas_estados', 'wkb_geometry', { transaction: trx }),
      normalizeSRID('public.mapas_municipios', 'wkb_geometry', { transaction: trx }),
      normalizeSRID('public.mapas_biomas', 'wkb_geometry', { transaction: trx }),
      normalizeSRID('public.mapa_brasil', 'wkb_geometry', { transaction: trx }),
    ]);

    consola.info('Criando novos indices e chaves...');
    await Promise.all([
      trx.schema.withSchema('public').raw(`ALTER TABLE public.mapas_estados ADD PRIMARY KEY (id)`),
      trx.schema
        .withSchema('public')
        .raw(`ALTER TABLE mapas_municipios ADD constraint municipios_ref_id UNIQUE (ref_id)`),
      trx.schema
        .withSchema('public')
        .raw(`ALTER TABLE mapas_biomas ADD constraint biomas_ref_id UNIQUE (ref_id)`),
      trx.schema
        .withSchema('public')
        .raw(`ALTER TABLE public.mapas_municipios ADD PRIMARY KEY (id)`),
      trx.schema.withSchema('public').raw(`ALTER TABLE public.mapas_biomas ADD PRIMARY KEY (id)`),
      trx.schema
        .withSchema('public')
        .raw(
          `CREATE INDEX IF NOT EXISTS index_municipios on mapas_municipios USING gist (wkb_geometry)`
        ),
    ]);
  });

  consola.success('Mapas dos municipios inseridos!');
}

export async function populateMunicipios(override?: boolean) {
  await each([populateDadosMunicipios, populateMapasMunicipios], (f) => f(override));
  consola.success('Processo concluído com sucesso!');
}

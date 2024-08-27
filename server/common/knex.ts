import knex from 'knex';

const knexConnection = knex({
  client: 'pg',
  connection: {
    host: process.env.PG_HOST || 'localhost',
    port: parseInt(process.env.PG_PORT || '5432'),
    user: process.env.PG_USER || 'geoia',
    password: process.env.PG_PASSWORD || 'geoia',
    database: process.env.PG_DATABASE || 'geoia-db',
  },
  acquireConnectionTimeout: 1000000,
  pool: {
    min: 0,
    max: 10,
    acquireTimeoutMillis: 1000000,
    createTimeoutMillis: 1000000,
    destroyTimeoutMillis: 1000000,
    idleTimeoutMillis: 1000000,
    reapIntervalMillis: 1000000,
    createRetryIntervalMillis: 2000,
  },
  searchPath: ['public', 'shapefiles'],
});

export default knexConnection;

import { Option, program } from 'commander';

import { populateMunicipios } from '../server/api/services/populate-municipios.service';
import knex from '../server/common/knex';

if (require.main === module) {
  program
    .addOption(new Option('--override', 'Override existing information on database.'))
    .action(async (opts: { override?: boolean }) => populateMunicipios(opts.override))
    .parseAsync(process.argv)
    .finally(() => knex.destroy());
}

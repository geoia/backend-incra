import { Option, program } from 'commander';
import { processarEstatisticas } from '../server/api/services/process-estatisticas.service';
import knex from '../server/common/knex';

if (require.main === module) {
  program
    .addOption(new Option('--override', 'Override existing information on database.'))
    .action(async (opts: { override?: boolean }) => {
      processarEstatisticas(opts.override || false);
    })

    .parseAsync(process.argv)
    .finally(() => knex.destroy());
}

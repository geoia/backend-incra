import { Option, program } from 'commander';
import { downloadMapas } from '../server/api/services/download-mapas.service';

if (require.main === module) {
  program
    .addOption(new Option('--override', 'Override existing files'))
    .action(async (opts: { override: boolean }) => {
      downloadMapas(opts.override);
    })
    .parseAsync(process.argv);
}

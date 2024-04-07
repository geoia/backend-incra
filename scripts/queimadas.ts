import knex from '../server/common/knex';
import { Command, Option, program } from 'commander';
import MultiSelect from 'enquirer/lib/prompts/multiselect';
import {
  cronExec,
  exec,
  execDelete,
  getPrefixes,
} from '../server/api/services/process-queimadas.service';

if (require.main === module) {
  program
    .addCommand(
      new Command('exec')
        .addOption(
          new Option('--cron [value]', 'The time to fire off the update in the cron syntax')
        )
        .action(async (opts: { cron?: string }) => {
          if (opts.cron) cronExec(opts.cron);
          else await exec().then(() => knex.destroy());
        }),
      { isDefault: true }
    )
    .addCommand(
      new Command('delete').action(async () => {
        const prefixes: Array<{ prefix: string }> = await getPrefixes();

        const prompt = new MultiSelect({
          message: 'Select prefixes to remove',
          limit: 5,
          choices: prefixes.map(({ prefix }) => prefix),
        });

        return execDelete(await prompt.run()).then(() => knex.destroy());
      })
    )
    .parseAsync(process.argv);
}

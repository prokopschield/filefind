import { default as argv, Flags } from '@prokopschield/argv';
import fs from 'fs';
import path from 'path';
import { cacheFn } from 'ps-std/lib/functions/cacheFn';

export interface Options {
    regex: RegExp;
    logger: (_file: string) => void;
    errHandler: (_file: unknown) => void;
    onlyDirectories?: boolean;
    onlyFiles?: boolean;
}

export const stat_f = cacheFn((file: string) => fs.promises.stat(file));

export async function process(directory: string, options: Options) {
    try {
        for (const filename of await fs.promises.readdir(directory)) {
            const file = path.resolve(directory, filename);
            const stat = await stat_f(file);
            const is_directory = stat.isDirectory();

            if (
                ((is_directory && !options.onlyFiles) ||
                    (!is_directory && !options.onlyDirectories)) &&
                options.regex.test(file)
            ) {
                options.logger(file);
            } else if (is_directory) {
                await process(file, options);
            }
        }
    } catch (error) {
        options.errHandler(error);
    }
}

export async function main(flags: Flags = argv) {
    flags
        .alias('regexp', 'regex', 'reg', 'r')
        .alias('directory', 'dir', 'd', 'file', 'f')
        .alias('files_only', 'files', 'fonly')
        .alias('dirs_only', 'dirs', 'directions', 'donly');

    const cli_options = flags.expect(
        ['regexp', 'directory', 'files_only', 'dirs_only'],
        {
            directory: '/',
        }
    );

    const options: Options = {
        logger: console.log,
        errHandler: console.error,
        regex: new RegExp(cli_options.regexp || ''),
        onlyDirectories: !!cli_options.dirs_only,
        onlyFiles: !!cli_options.files_only,
    };

    process(cli_options.directory || '/', options);
}

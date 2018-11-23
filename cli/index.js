#!/usr/bin/env node
const fs = require('fs');
const path = require('path');
const program = require('commander');
const { prompt } = require('inquirer');

const install = require('./install');

program
    .command('install [dir]')
    .alias('i')
    .description('Add boilerplate files and scripts to your project')
    .action(function(dir = process.cwd()) {
        const pkg = path.resolve(dir, 'package.json');
        if (!fs.existsSync(pkg)) {
            printPackageWarning(pkg);
            process.exit(1);
        }

        prompt(install.questions).then(options => install(dir, options));
    });

program.parse(process.argv);

function printPackageWarning(pkg) {
    console.warn(`\x1b[31m
    ${pkg} not found
 
    Please initialize first using "npm init" or "yarn init".
    `);
}

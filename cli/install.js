const path = require('path');
const fs = require('fs-extra');
const replace = require('replace-in-file');

const supportedFiles = {
    babel: '.babelrc',
    editorconfig: '.editorconfig',
    eslint: '.eslintrc.js',
    esdoc: '.esdoc.js',
    prettier: 'prettier.config.js',
    sublime: 'project.sublime-project'
};

const supportedFilesExtended = {
    babel: '.babelrc',
    eslint: '.eslintrc',
    esdoc: '.esdoc.js',
    prettier: 'prettier.config.js'
};

const supportedScripts = {
    build: 'babel src --out-dir lib --copy-files',
    lint: 'eslint src',
    docs: 'esdoc'
};

const DependencyMode = {
    NONE: 'no',
    INDIRECT: 'yes - using only this package as a dependency',
    DIRECT: 'yes - using all required packages as separate dependencies'
};

const questions = [
    {
        message: 'Choose config files to create',
        type: 'checkbox',
        name: 'files',
        choices: Object.keys(supportedFiles).map(file => ({ name: file, checked: true }))
    },
    {
        message: 'Choose scripts to add to package.json?',
        type: 'checkbox',
        name: 'scripts',
        choices: Object.keys(supportedScripts).map(script => ({ name: script, checked: true }))
    },
    {
        message: 'Add dependencies?',
        type: 'list',
        name: 'dependencies',
        default: DependencyMode.INDIRECT,
        choices: [DependencyMode.NONE, DependencyMode.DIRECT, DependencyMode.INDIRECT]
    }
];

async function install(dir, { files, scripts, dependencies }) {
    console.log('\n[b7] install');

    if (files && files.length) {
        // keys to values
        files = files.map(f => supportedFiles[f]);
        await installFiles(dir, files, dependencies);
    }

    if (scripts && scripts.length) {
        await installScripts(dir, scripts);
    }

    if (dependencies !== DependencyMode.NONE) {
        await installDependencies(dir, dependencies);
    }
}

async function installFiles(dir, files, dependencyMode) {
    for (let file of files) {
        // ---------------------------------------
        // copy file
        // ---------------------------------------
        // the source file
        let source = path.resolve(__dirname, '../files/', file);
        // if user chose indirect mode, we try to keep things simple in the target project
        // if possible, we use a file that just extends a base config instead of using the verbose config
        if (dependencyMode === DependencyMode.INDIRECT) {
            const [key] = Object.entries(supportedFiles).find(([key, value]) => value === file);
            if (supportedFilesExtended[key]) {
                source = path.resolve(__dirname, '../files/extended', supportedFilesExtended[key]);
                file = supportedFilesExtended[key];
            }
        }

        // the target location for the file
        const target = path.resolve(dir, file);

        // perform copy operation
        try {
            console.log(`[b7] copy file - "${source}" -> "${target}"`);
            await fs.copy(source, target);
        } catch (error) {
            console.error(`\nFailed copying file ${source} to ${target}`);
        }

        // ---------------------------------------
        // post-process file
        // ---------------------------------------
        try {
            switch (file) {
                case supportedFiles.esdoc:
                    await replace({
                        files: target,
                        from: /package-name/g,
                        to: getPackage(dir).name
                    });
            }
        } catch (error) {
            console.error(`\nFailed post-processing file ${target}`);
        }
    }
}

async function installScripts(dir, scripts) {
    const pkg = getPackage(dir);
    try {
        pkg.scripts = pkg.scripts || {};
        scripts.forEach(name => {
            console.log(`[b7] add script - "${name}": "${supportedScripts[name]}"`);
            pkg.scripts[name] = supportedScripts[name];
        });
        await fs.writeJson(path.resolve(dir, 'package.json'), pkg, { spaces: 2 });
    } catch (error) {
        console.error('\nFailed installing scripts', error);
    }
}

async function installDependencies(dir, mode) {
    try {
        const ownPackage = getPackage(path.resolve(__dirname, '..'));
        const targetPackage = getPackage(dir);

        const missingDeps = getMissingDependencies(ownPackage, targetPackage, mode);
        if (missingDeps.length > 0) {
            targetPackage.devDependencies = targetPackage.devDependencies || {};
            missingDeps.forEach(({ name, version }) => {
                console.log(`[b7] add dependency - "${name}": "${version}"`);
                targetPackage.devDependencies[name] = version;
            });
            await fs.writeJson(path.resolve(dir, 'package.json'), targetPackage, { spaces: 2 });

            console.log('\nPlease install the dependencies by executing "npm install" or "yarn install"');
        } else {
            console.log('\nNo missing dependencies found');
        }
    } catch (error) {
        console.error('\nFailed adding dependencies', error);
    }
}

function getMissingDependencies(ownPackage, targetPackage, mode) {
    const ownDeps = Object.keys(ownPackage.dependencies || {}).filter(dep => {
        switch (dep) {
            case 'commander':
            case 'fs-extra':
            case 'inquirer':
            case 'replace-in-file':
                return false;
            default:
                return true;
        }
    });

    const targetDeps = []
        .concat(Object.keys(targetPackage.dependencies || {}))
        .concat(Object.keys(targetPackage.devDependencies || {}))
        .concat(Object.keys(targetPackage.peerDependencies || {}));

    switch (mode) {
        case DependencyMode.DIRECT:
            // install each dependency of this package as a dependency of the target package
            return ownDeps.filter(name => targetDeps.indexOf(name) === -1).map(name => ({
                name: name,
                version: ownPackage.dependencies[name]
            }));
        case DependencyMode.INDIRECT:
            // install only this package as a dependency
            if (targetDeps.indexOf(ownPackage.name) > -1) {
                return [];
            }
            return [
                {
                    name: ownPackage.name,
                    version: `^${ownPackage.version}`
                }
            ];
        default:
            throw new Error(`Invalid mode ${mode}`);
    }
}
function getPackage(dir) {
    return require(path.resolve(dir, 'package.json'));
}

module.exports = install;
module.exports.questions = questions;
module.exports.supportedFiles = supportedFiles;
module.exports.supportedScripts = supportedScripts;

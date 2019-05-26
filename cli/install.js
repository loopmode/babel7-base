const path = require('path');
const fs = require('fs-extra');
const replace = require('replace-in-file');

const ownName = require('../package.json').name;

const supportedFiles = {
    babel: '.babelrc',
    eslint: '.eslintrc.js',
    prettier: 'prettier.config.js',
    gitattributes: '.gitattributes',
    editorconfig: '.editorconfig',
    esdoc: '.esdoc.js',
    sublime: 'project.sublime-project'
};

const checkedFiles = [
    supportedFiles.babel,
    supportedFiles.eslint,
    supportedFiles.gitattributes,
    supportedFiles.editorconfig,
    supportedFiles.prettier
];

const supportedFilesExtended = {
    babel: '.babelrc',
    eslint: '.eslintrc',
    esdoc: '.esdoc.js',
    prettier: 'prettier.config.js'
};

const supportedScripts = {
    build: 'babel src --out-dir lib --copy-files',
    watch: 'yarn build --watch',
    lint: 'eslint src',
    docs: 'esdoc'
};
const checkedScripts = [supportedScripts.build, supportedScripts.watch, supportedScripts.lint];

const DependencyMode = {
    NONE: 'no',
    INDIRECT: `yes, indirectly: add only ${ownName} to devDependencies`,
    DIRECT: 'yes, directly - add each required package to devDependencies'
};

const PackageManager = {
    YARN: 'yarn',
    NPM: 'npm'
};
const InstallMode = {
    YES: 'yes',
    NO: 'no'
};

const questions = [
    {
        message: 'Which package manager should we use?',
        type: 'list',
        name: 'manager',
        default: PackageManager.NPM,
        choices: [PackageManager.NPM, PackageManager.YARN]
    },
    {
        message: 'Which config files should we create?',
        type: 'checkbox',
        name: 'files',
        choices: Object.entries(supportedFiles).map(([key, value]) => ({
            name: key,
            checked: checkedFiles.includes(value)
        }))
    },
    {
        message: 'Which scripts should we add to the package.json?',
        type: 'checkbox',
        name: 'scripts',
        choices: Object.entries(supportedScripts).map(([key, value]) => ({
            name: key,
            checked: checkedScripts.includes(value)
        }))
    },
    {
        message: 'Should we add the required devDependencies to the package.json?',
        type: 'list',
        name: 'dependencies',
        default: DependencyMode.INDIRECT,
        choices: [DependencyMode.INDIRECT, DependencyMode.DIRECT, DependencyMode.NONE]
    },
    {
        message: 'Should we install the dependencies after init?',
        type: 'list',
        name: 'installDependencies',
        default: InstallMode.YES,
        choices: [InstallMode.YES, InstallMode.NO]
    }
];

async function install(dir, { manager, files, scripts, dependencies, installDependencies }) {
    console.log('\n[b7] install');

    const pkg = path.resolve(dir, 'package.json');
    if (!fs.existsSync(pkg)) {
        await initializePackage(dir, manager);
    }

    if (files && files.length) {
        // keys to values
        files = files.map(f => supportedFiles[f]);
        await installFiles(dir, files, dependencies);
    }

    if (scripts && scripts.length) {
        await installScripts(dir, scripts, manager);
    }

    if (dependencies !== DependencyMode.NONE) {
        await addDependencies(dir, dependencies);
    }

    if (installDependencies !== InstallMode.NO) {
        await installPackages(dir, manager);
    }
}

async function initializePackage(dir, manager) {
    try {
        console.info('Initialize package');
        await execAsync(`cd ${dir} && ${manager} init -y`);
    } catch (error) {
        console.error('\nFailed initializing package', error);
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
            console.log(`[b7] add file - "${target}"`);
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

async function installScripts(dir, scripts, manager) {
    const pkg = getPackage(dir);
    try {
        pkg.scripts = pkg.scripts || {};
        scripts.forEach(name => {
            let scriptValue = supportedScripts[name];
            console.log(`[b7] add script - "${name}": "${scriptValue}"`);
            if (manager === PackageManager.NPM && scriptValue.includes('yarn')) {
                scriptValue = scriptValue.replace(/yarn/g, 'npm run');
            }
            pkg.scripts[name] = scriptValue;
        });
        await fs.writeJson(path.resolve(dir, 'package.json'), pkg, { spaces: 2 });
    } catch (error) {
        console.error('\nFailed installing scripts', error);
    }
}

async function installPackages(dir, manager) {
    try {
        console.info('Installing packages');
        await execAsync(`cd ${dir} && ${manager} install`);
    } catch (error) {
        console.error('\nFailed installing packages', error);
    }
}

async function addDependencies(dir, mode) {
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
            return ownDeps
                .filter(name => targetDeps.indexOf(name) === -1)
                .map(name => ({
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

/**
 * Executes a shell command and return it as a Promise.
 * @param cmd {string}
 * @return {Promise<string>}
 * @see https://medium.com/@ali.dev/how-to-use-promise-with-exec-in-node-js-a39c4d7bbf77
 */
function execAsync(cmd) {
    const exec = require('child_process').exec;
    return new Promise((resolve, reject) => {
        exec(cmd, (error, stdout, stderr) => {
            if (error) {
                console.error('[execAsync] failed', error);
            }
            resolve(stdout ? stdout : stderr);
        });
    });
}

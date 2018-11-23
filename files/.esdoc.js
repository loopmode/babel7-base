module.exports = {
    source: './src',
    destination: './docs',
    includes: ['\\.js$'],
    excludes: [],
    plugins: [
        {
            name: 'esdoc-standard-plugin',
            option: {
                title: 'package-name',
                lint: { enable: true },
                coverage: { enable: true },
                accessor: { access: ['public', 'protected', 'private'], autoPrivate: true },
                undocumentIdentifier: { enable: false },
                unexportedIdentifier: { enable: false }
            }
        },
        {
            name: 'esdoc-ecmascript-proposal-plugin',
            option: {
                classProperties: true,
                objectRestSpread: true,
                doExpressions: true,
                functionBind: true,
                functionSent: true,
                asyncGenerators: true,
                decorators: true,
                exportExtensions: true,
                dynamicImport: true
            }
        },
        { name: 'esdoc-jsx-plugin' }
    ]
};

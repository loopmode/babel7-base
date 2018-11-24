# babel7-base

Common dependencies and configs for developing packages with babel 7.
Contains `babel`, `esdoc`, `eslint` and `prettier`, as well as some plugins/extensions.

Provides CLI to copy default config files like `.eslintrc`, `prettier.config.js` etc

_Check [https://www.npmjs.com/package/@loopmode/babel6-base](https://www.npmjs.com/package/@loopmode/babel6-base) for the babel 6 version_

## Installation and usage

Recommended: install globally

```bash
npm install --global @loopmode/babel7-base
```

Now run the install script in any package:

```bash
b7 install
```

### Use-case

Use the `b7` command to get started with a new package that you want to publish or use elsewhere. It will ask you a couple of questions, but you can just go ahead and hit enter to use the defaults.

### Configuration

There are default config files that you can use as a base and extend/modify as needed.

#### via config files

Typically you'll create a bunch of config files and extend the provided defaults there.

```json
// .babelrc
{
  "extends": "@loopmode/babel7-base/.babelrc"
}
```

```json
// .eslintrc
{
  "extends": "@loopmode/react"
}
```

```javascript
// prettier.config.js
module.exports = {
  ...require('@loopmode/babel7-base/prettier.config')
};
```

```javascript
// .esdoc.js
module.exports = {
  ...require('@loopmode/babel7-base/esdoc.config')
};
```

#### via package.json

Alternatively, you can add keys to your `package.json`, but there are some caveats.

```json
// package.json
{
  "babel": {
    "extends": "@loopmode/babel7-base/.babelrc"
  },
  "eslintConfig": {
    "extends": "@loopmode/react"
  },
  "prettier": {
    ...
  },
  "esdoc": {
    ...
  }
```

#### Caveats:

- The eslint config [@loopmode/eslint-config-react](https://github.com/loopmode/eslint-config-react) is included as a dependency
- When extending the eslint config, omit the `eslint-config-` part of the package name and use just `@loopmode/react` instead
- When configuring eslint via package.json, the key must be `"eslintConfig"` (and not just `"eslint"`)
- When configuring prettier or ESDoc via package.json, you can not extend from the default config - you have to provide a full configuration directly

### config options

- [eslint configuration](https://prettier.io/docs/en/configuration.html)
- [esdoc configuration](https://github.com/esdoc/esdoc/blob/v0.5.2/site/manual/configuration/config.md#full-config)
- [prettier configuration](https://prettier.io/docs/en/configuration.html)

## Scripts

Just add some scripts to your `package.json` as usual:

```json
{
  "scripts": {
    "babel": "babel src --out-dir lib --copy-files",
    "eslint": "eslint src",
    "esdoc": "esdoc"
  }
}
```

Pass any arguments to the scripts as usual, e.g. `yarn babel --watch`.

Note that ESLint and prettier enforce specific code style, and you might get a bunch of warnings for existing projects.
Use `yarn eslint --fix` to normalize code style and whitespace.

Generate docs with `yarn esdoc`.

## Sublime Text

Here is an example Sublime Text project file. It will automatically format saved files in the project, and ESLint errors will be displayed when `SublimeLinter` and `SublimeLinter-eslint` are installed.

```json
{
  "folders": [
    {
      "path": ".",
      "file_exclude_patterns": [],
      "folder_exclude_patterns": ["node_modules"]
    }
  ],
  "settings": {
    "SublimeLinter.linters.eslint.chdir": "${project}/",
    "js_prettier": {
      "auto_format_on_save": true,
      "auto_format_on_save_excludes": ["*/node_modules/*", "*/.git/*", "*.json", "*.html"]
    }
  }
}
```

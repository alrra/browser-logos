#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

const shell = require('shelljs');

// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -

shell.config.silent = true;

// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -

const exec = (cmd) => {
    return new Promise((resolve, reject) => {
        shell.exec(cmd, (code, stdout, stderr) => {
            const result = {
                cmd,
                code,
                stderr: stderr && stderr.trim(),
                stdout: stdout && stdout.trim()
            };

            if (code === 0) {
                return resolve(result);
            }

            return reject(result);
        });
    });
};

const createPackageJSON = (data) => {

    const content = `{
  "bugs": "https://github.com/alrra/browser-logos/issues",
  "description": "${data.prettifiedName} browser logo",
  "homepage": "https://github.com/alrra/browser-logos",
  "keywords": [
    "browser-logos",
    "logo",
    "${data.name}",
    "${data.name}-logo"
  ],
  "private": true,
  "name": "@browser-logos/${data.packageName}",
  "repository": {
    "directory": "${data.packagePath}",
    "type": "git",
    "url": "https://github.com/alrra/browser-logos.git"
  },
  "version": "1.0.0"
}
`;

    fs.writeFileSync(path.join(data.packagePath, 'package.json'),  content, 'utf-8');

};

const createReadme = (data) => {

    const content =`${data.prettifiedName}
${'='.repeat(data.prettifiedName.length)}

<table>
    <tr height=240>
        <td>
            <a href="https://github.com/alrra/browser-logos/tree/${data.lastCommitSHA}/${data.packagePath}">
                <img width=230 src="https://raw.githubusercontent.com/alrra/browser-logos/${data.lastCommitSHA}/${data.packagePath}/${data.packageName}_512x512.png" alt="${data.prettifiedName} browser logo">
            </a>
        </td>
    </tr>
</table>

How to get the logo
-------------------

You can either:

* Install it using [\`npm\`][npm]:

  \`npm install --save-dev @browser-logos/${data.packageName}\`

* Use [\`cdnjs\`][cdnjs].

<!-- Link labels: -->

[cdnjs]: https://cdnjs.com/libraries/browser-logos
[npm]: https://www.npmjs.com/
`;

    fs.writeFileSync(path.join(data.packagePath, 'README.md'),  content, 'utf-8');

};

const prettifyName = (str) => {
    return str.replace(/-/g, ' ')
        .split(' ')
        .map((s) => s.charAt(0).toUpperCase() + s.substring(1))
        .join(' ');
};

const getData = async (packagePath) => {

    const packageName = path.basename(packagePath);

    const name = packageName.split('_')[0];
    const versions = packageName.split('_')[1] || '';
    const lastCommitSHA = (await exec(`git log --pretty=format:'%H' -n 1 ${packagePath}`)).stdout;

    return {
        lastCommitSHA,
        name,
        packageName,
        packagePath,
        prettifiedName: `${prettifyName(name)}${versions ? ` v${versions}` : ''}`
    };

};

// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -

const main = async () => {

    const packagePaths= process.argv.slice(2).reduce((result, package) => {
        if (fs.existsSync(package) &&
            fs.statSync(package).isDirectory()) {
            result.push(package);
        }
        return result;
    }, []);

    for (const packagePath of packagePaths) {
        const packageData = await getData(packagePath);

        console.log(` * ${packagePath}`);

        createPackageJSON(packageData);
        createReadme(packageData);
    }
};

main();

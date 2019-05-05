#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

const Listr = require('listr');
const listrInput = require('listr-input');
const shell = require('shelljs');

const github = new (require('./github'));

// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -

shell.config.silent = true;

// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -

const createRelease = async (ctx) => {
    await github.createRelease({
        body: getReleaseNotes(ctx.changelogFilePath),
        name: `v${ctx.newPackageVersion}`,
        tag_name: ctx.newPackageVersion
    });
};

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

const extractDataFromCommit = async (sha) => {
    const commitBodyLines = (await exec(`git show --no-patch --format=%B ${sha}`)).stdout.split('\n');

    const associatedIssues = [];
    const title = commitBodyLines[0];
    const tag = title.split(' ')[0];

    const regex = /(Fix|Close)\s+#([0-9]+)/gi;

    commitBodyLines.shift();
    commitBodyLines.forEach((line) => {
        const match = regex.exec(line);

        if (match) {
            associatedIssues.push(match[2]);
        }
    });

    return {
        associatedIssues,
        sha,
        tag,
        title
    };
};

const getDate = () => {
    const date = new Date();
    const monthNames = [
        'January',
        'February',
        'March',
        'April',
        'May',
        'June',
        'July',
        'August',
        'September',
        'October',
        'November',
        'December'
    ];

    return `${monthNames[date.getMonth()]} ${date.getDate()}, ${date.getFullYear()}`;
};

const prettyPrintArray = (a) => {
    return [a.slice(0, -1).join(', '), a.slice(-1)[0]].join(a.length < 2 ? '' : ', and ');
};

const prettyPrintBrowserName = (str) => {
    return str.replace(/-/g, ' ')
        .split(' ')
        .map((s) => s.charAt(0).toUpperCase() + s.substring(1))
        .join(' ');
};

const prettyPrintCommit = async (commit) => {

    let additionalInfo = false;
    let commitAuthorInfo = '';
    let issuesInfo = '';
    let commitTitle = commit.title;

    // - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -

    // Handle special case, transform something such as:
    //
    //   🚀 browser-name - v1.0.0 [skip ci]
    //
    // to
    //
    //   ✨ Publish `Browser Name` logo on `npm`

    if (commit.tag === '🚀') {
        if (commit.title.indexOf('v1.0.0') !== -1 ) {
            const browserName = commit.title.split(' ')[1];

            commitTitle = `✨ Publish \`${prettyPrintBrowserName(browserName)}\` logo on \`npm\``;
        } else {
            return '';
        }
    }

    // - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -

    let result = `* [[\`${commit.sha.substring(0, 10)}\`](${github.repositoryURL}/commit/${commit.sha})] - ${commitTitle}`;

    // - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -

    // Get commit author information.

    const commitAuthor = await github.getCommitAuthorInfo(commit.sha);

    if (commitAuthor) {
        commitAuthorInfo = `by [\`${commitAuthor.name}\`](${commitAuthor.gitHubProfileURL})`;
        additionalInfo = true;
    }

    // - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -

    // Get related issues information.

    const issues = commit.associatedIssues.map((issue) => {
        return `[\`#${issue}\`](${github.repositoryURL}/issues/${issue})`;
    });

    if (issues.length > 0) {
        issuesInfo = `see also: ${prettyPrintArray(issues)}`;
        additionalInfo = true;
    }

    // - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -

    if (additionalInfo) {
        result = `${result} (${commitAuthorInfo}${commitAuthorInfo && issuesInfo ? ' / ': ''}${issuesInfo})`;
    }

    return `${result}.`;
};

const generateChangelogSection = async (title, tags, commits) => {
    let result = '';

    for (const commit of commits) {
        if (tags.includes(commit.tag)) {
            const msg = await prettyPrintCommit(commit);

            if (msg) {
                result += `${msg}\n`;
            }
        }
    }

    if (result) {
        result = `## ${title}\n\n${result}`;
    }

    return result;
};

const getChangelogContent = (ctx) => {
    return `# ${ctx.newPackageVersion} (${getDate()})\n\n${ctx.packageReleaseNotes}\n`;
};

const getChangelogData = async (commits = [], isPackage = true) => {

    const tagsBreakingChanges = ['💥'];
    const tagsBugFixesAndImprovements = ['🐛', '📚', '🔧', '🗜'];
    const tagsNewFeatures = ['✨'];

    if (!isPackage) {
        tagsNewFeatures.push('🚀');
    }

    const breakingChanges = await generateChangelogSection('Breaking Changes', tagsBreakingChanges, commits);
    const bugFixesAndImprovements = await generateChangelogSection('Bug fixes / Improvements', tagsBugFixesAndImprovements, commits);
    const newFeatures = await generateChangelogSection('New features', tagsNewFeatures, commits);

    if (!breakingChanges &&
        !bugFixesAndImprovements &&
        !newFeatures) {
        return null;
    }

    // - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -

    // Generate release notes.

    let releaseNotes = '';

    releaseNotes += breakingChanges ? `${breakingChanges}\n` : '';
    releaseNotes += bugFixesAndImprovements ? `${bugFixesAndImprovements}\n` : '';
    releaseNotes += newFeatures ? `${newFeatures}\n` : '';

    // - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -

    // Determine semver version.

    let semverIncrement = 'patch';

    if (breakingChanges) {
        semverIncrement = 'major';
    } else if (newFeatures) {
        semverIncrement = 'minor';
    }

    return {
        releaseNotes,
        semverIncrement
    };
};

const getReleaseData = async (ctx) => {
    const changelogData = await getChangelogData(ctx.commitSHAsSinceLastRelease, ctx.isPackage);

    if (!changelogData) {
        ctx.skipRemainingTasks = true;

        return;
    }

    ({
        semverIncrement: ctx.packageSemverIncrement,
        releaseNotes: ctx.packageReleaseNotes
    } = changelogData);
};

const getReleaseNotes = (changelogFilePath) => {

    // The change log is structured as follows:
    //
    // # <version_number> (<date>)
    // <empty_line>
    // <version_log> <= this is what we need to extract
    // <empty_line>
    // <empty_line>
    // # <version_number> (<date>)
    // <empty_line>
    // <version_log>
    // ...


    const eol = '\\r?\\n';
    const regex = new RegExp(`#.*${eol}${eol}([\\s\\S]*?)${eol}${eol}${eol}`);

    return regex.exec(shell.cat(changelogFilePath))[1];
};

const gitCommitChanges = async (ctx) => {
    await exec(`git add . && git commit -m "🚀 ${ctx.isPackage ? `${ctx.packageName} - ` : ''}v${ctx.newPackageVersion} [skip ci]"`);
};

const gitDeleteTag = async (tag) => {
    if ((await exec(`git tag --list "${tag}"`)).stdout) {
        await exec(`git tag -d ${tag}`);
    }
};

const gitGetFirstCommitSHASinceLastRelease = async (ctx) => {
    return (await exec(`git log -n 1 --pretty=format:'%H' -G'version": ".*"' ${ctx.packageJSONFilePath}`)).stdout
        || (await exec(`git log -n 1 --pretty=format:'%H' ${ctx.packageJSONFilePath}`)).stdout;
};

const getCommitSHAsSinceLastRelease = async (ctx) => {
    const firstCommitSinceLastRelease = await gitGetFirstCommitSHASinceLastRelease(ctx);
    const commitSHAsSinceLastRelease = (await exec(`git rev-list master...${firstCommitSinceLastRelease}^ ${ctx.isPackage ? ctx.packagePath : 'src'}`)).stdout;

    if (!commitSHAsSinceLastRelease) {
        ctx.skipRemainingTasks = true;

        return;
    }

    ctx.commitSHAsSinceLastRelease = [];

    const shas = commitSHAsSinceLastRelease.split('\n');

    for (const sha of shas) {
        const data = await extractDataFromCommit(sha);

        ctx.commitSHAsSinceLastRelease.push(data);
    }
};

const gitPush = async (ctx) => {
    await exec(`git push origin master --tags`);
};

const gitTagNewVersion = async (ctx) => {
    await exec(`git tag -a "${ctx.newPackageVersion}" -m "${ctx.newPackageVersion}"`);
};

const gitReset = async () => {
    await exec(`git reset --quiet HEAD && git checkout --quiet .`);
};

const newTask = (title, task) => {
    return {
        enabled: (ctx) => {
            return !ctx.skipRemainingTasks;
        },
        task,
        title
    };
};

const npmPublish = (ctx) => {
    return listrInput('Enter OTP: ', {
        done: async (otp) => {
            await exec(`cd ${ctx.packagePath} && npm publish ${ctx.isUnpublishedPackage ? '--access public' : ''} --otp=${otp}`);
        }
    }).catch((err) => {
        if (err.stderr.indexOf('you already provided a one-time password then it is likely that you either typoed') !== -1) {
            return npmPublish(ctx);
        }

        ctx.npmPublishError = err;

        throw new Error(JSON.stringify(err));
    });
};

const npmRemovePrivateField = (ctx) => {
    delete ctx.packageJSONFileContent.private;
    updateFile(`${ctx.packageJSONFilePath}`, `${JSON.stringify(ctx.packageJSONFileContent, null, 2)}\n`);
};

const npmUpdateVersion = async (ctx) => {
    const version = (await exec(`cd ${ctx.packagePath} && npm --quiet version ${ctx.packageSemverIncrement} --no-git-tag-version`)).stdout;

    // `version` will be something such as `vX.X.X`,
    //  so the `v` will need to be removed.

    ctx.newPackageVersion = version.substring(1, version.length);
};

const updateFile = (filePath, content) => {
    fs.writeFileSync(filePath, content, 'utf-8');
};

const updateReadme = async (ctx) => {
    const lastCommitSha = (await exec(`git log -n 1 --pretty=format:'%H' ${ctx.packagePath}`)).stdout;

    shell.sed('-i', '[0-9a-f]{40}', lastCommitSha, `${ctx.packagePath}/README.md`);
};

const updateChangelog = (ctx) => {
    if (!ctx.isUnpublishedPackage) {
        updateFile(ctx.changelogFilePath, `${getChangelogContent(ctx)}${shell.cat(ctx.changelogFilePath)}`);
    } else {
        ctx.packageReleaseNotes = '✨';
        updateFile(ctx.changelogFilePath, getChangelogContent(ctx));
    }
};

const waitForUserReview = async () => {
    return await listrInput('Press any key once you are done with the review:');
};

const getTasks = (packagePath) => {

    const packageJSONFileContent = require(`../${packagePath}/package.json`);
    const isUnpublishedPackage = packageJSONFileContent.private === true && packagePath !== '.';
    const isPackage = packagePath !== '.';

    const tasks = [];

    // - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -

    tasks.push({
        task: (ctx) => {
            ctx.skipRemainingTasks = false;

            ctx.changelogFilePath = path.join(packagePath, 'CHANGELOG.md');
            ctx.packageJSONFilePath = path.join(packagePath, 'package.json');
            ctx.packageName = path.basename(packagePath);
            ctx.packagePath = packagePath;

            ctx.packageJSONFileContent = packageJSONFileContent;
            ctx.packageVersion = packageJSONFileContent.version;

            ctx.isPackage = isPackage;
            ctx.isUnpublishedPackage = isUnpublishedPackage;

            if (isUnpublishedPackage) {
                ctx.newPackageVersion = packageJSONFileContent.version;
            }
        },
        title: `Get package information.`
    });

    // Published package tasks.

    if (!isUnpublishedPackage) {
        tasks.push(
            newTask('Get commits SHAs since last release.', getCommitSHAsSinceLastRelease),
            newTask('Get release notes and semver increment.', getReleaseData),
            newTask('Update version in the `package.json` file.', npmUpdateVersion),
            newTask('Update the `README.md` file.', updateReadme),
            newTask('Update the `CHANGELOG.md` file.', updateChangelog),
            newTask('Review the `CHANGELOG.md` file.', waitForUserReview)
        );

    // Unpublished package tasks.

    } else {
        tasks.push(
            newTask('Remove `"private": true` from `package.json`.', npmRemovePrivateField),
            newTask('Update `CHANGELOG.md` file.', updateChangelog)
        );
    }

    // Common tasks.

    tasks.push(newTask('Commit changes.', gitCommitChanges));

    if (!isPackage) {
        tasks.push(newTask('Tag new version.', gitTagNewVersion));
    }

    if (isPackage) {
        tasks.push(newTask(`Publish on npm.`, npmPublish));
    }

    tasks.push(newTask(`Push changes upstream.`, gitPush));

    if (!isPackage) {
        tasks.push(newTask(`Create release.`, createRelease));
    }

    return new Listr(tasks);

};

// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -

const main = async () => {

    await github.createToken();

    // - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -

    const packages = [
        ...shell.ls('-d', 'src/**/package.json'),
        'package.json'
    ];

    // - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -

    // Generate tasks.

    const tasks = [];

    for (const pkg of packages) {
        const packageDir = path.dirname(pkg);

        tasks.push([{
            task: () => getTasks(packageDir),
            title: `${packageDir}`
        }]);
    }

    // - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -

    // Run tasks.

    for (const task of tasks) {
        const skipRemainingTasks = await new Listr(task)
            .run()
            .catch(async (err) => {
                console.error(typeof err === 'object' ? JSON.stringify(err, null, 4) : err);

                await gitReset();
                await gitDeleteTag(err.context.packageNewTag);

                return true;
            });

        if (skipRemainingTasks === true) {
            break;
        }
    }

    // - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -

    await github.deleteToken();

};

main();

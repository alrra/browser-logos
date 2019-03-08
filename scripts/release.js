#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

const inquirer = require('inquirer');
const Listr = require('listr');
const listrInput = require('listr-input');
const Octokit = require('@octokit/rest')
const shell = require('shelljs');

// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -

const REPOSITORY_NAME = 'browser-logos';
const REPOSITORY_OWNER = 'alrra';
const REPOSITORY_URL = `https://github.com/${REPOSITORY_OWNER}/${REPOSITORY_NAME}`;

let authorizationID;
let octokit;

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

const createGitHubRelease = async (tagName, releaseNotes) => {
    await octokit.repos.createRelease({
        body: releaseNotes,
        name: tagName,
        owner: REPOSITORY_OWNER,
        repo: REPOSITORY_NAME,
        tag_name: tagName
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

const getCommitGitHubAuthorInfo = async (commitSHA) => {

    let commitAuthorInfo;
    let commitInfo;

    try {

        // Get commit information.

        commitInfo = await octokit.repos.getCommit({
            owner: REPOSITORY_OWNER,
            repo: REPOSITORY_NAME,
            sha: commitSHA
        });

        // - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -

        // Get commit author related info.

        // This is done because the previous request doesn't provide
        // the name of the user, only the name of the user associated
        // with the commit, which in most cases, is wrongly set.

        commitAuthorInfo = await octokit.users.getByUsername({
            username: commitInfo.data.author.login
        });

    } catch (e) {
        return null;
    }

    // - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -

    return {
        gitHubProfileURL: commitAuthorInfo.data.html_url,

        // Get the user name, and if one is not provided,
        // use the name associated with the commit.

        name: commitAuthorInfo.data.name || commitInfo.data.commit.author.name
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

const prettyPrintCommit = async (commit) => {

    let additionalInfo = false;
    let commitAuthorInfo = '';
    let issuesInfo = '';
    let result = `* [[\`${commit.sha.substring(0, 10)}\`](${REPOSITORY_URL}/commit/${commit.sha})] - ${commit.title}`;

    // - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -

    // Get commit author information.

    const commitAuthor = await getCommitGitHubAuthorInfo(commit.sha);

    if (commitAuthor) {
        commitAuthorInfo = `by [\`${commitAuthor.name}\`](${commitAuthor.gitHubProfileURL})`;
        additionalInfo = true;
    }

    // - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -

    // Get related issues information.

    const issues = commit.associatedIssues.map((issue) => {
        return `[\`#${issue}\`](${REPOSITORY_URL}/issues/${issue})`;
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
            result += `${await prettyPrintCommit(commit)}\n`;
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

const getChangelogData = async (commits = []) => {

    const breakingChanges = await generateChangelogSection('Breaking Changes', ['💥'], commits);
    const bugFixesAndImprovements = await generateChangelogSection('Bug fixes / Improvements', ['🐛', '📚', '🔧', '🗜️'], commits);
    const newFeatures = await generateChangelogSection('New features', ['✨'], commits);

    if (!breakingChanges &&
        !bugFixesAndImprovements &&
        !newFeatures) {
        return null;
    }

    let releaseNotes = '';

    releaseNotes += breakingChanges ? `${breakingChanges}\n` : '';
    releaseNotes += bugFixesAndImprovements ? `${bugFixesAndImprovements}\n` : '';
    releaseNotes += newFeatures ? `${newFeatures}\n` : '';

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
    const changelogData = await getChangelogData(ctx.commitSHAsSinceLastRelease);

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

    /*
     * The change log is structured as follows:
     *
     * # <version_number> (<date>)
     * <empty_line>
     * <version_log> <= this is what we need to extract
     * <empty_line>
     * <empty_line>
     * # <version_number> (<date>)
     * <empty_line>
     * <version_log>
     * ...
     */

    const eol = '\\r?\\n';
    const regex = new RegExp(`#.*${eol}${eol}([\\s\\S]*?)${eol}${eol}${eol}`);

    return regex.exec(shell.cat(changelogFilePath))[1];
};

const gitCommitChanges = async (commitMessage, skipCI = false) => {
    await exec(`git add . && git commit -m "${commitMessage}${skipCI ? ' [skip ci]': ''}"`);
};

const gitCreateRelease = async (ctx) => {
    await createGitHubRelease(ctx.packageNewTag, getReleaseNotes(`${ctx.packagePath}/CHANGELOG.md`));
};

const gitDeleteTag = async (tag) => {
    if ((await exec(`git tag --list "${tag}"`)).stdout) {
        await exec(`git tag -d ${tag}`);
    }
};

const gitGetFirstCommitSHASinceLastRelease = async (ctx) => {
    return (await exec(`git log -n 1 --pretty=format:'%H' -G'version": ".*"' ${ctx.packagePath}/package.json`)).stdout
        || (await exec(`git log -n 1 --pretty=format:'%H' ${ctx.packagePath}/package.json`)).stdout;
};

const getCommitSHAsSinceLastRelease = async (ctx) => {
    const firstCommitSinceLastRelease = await gitGetFirstCommitSHASinceLastRelease(ctx);
    const commitSHAsSinceLastRelease = (await exec(`git rev-list master...${firstCommitSinceLastRelease} ${ctx.isPackage ? ctx.packagePath : 'src'}`)).stdout;

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
    await exec(`git push origin master ${ctx.packageNewTag ? ctx.packageNewTag : ''}`);
};

const gitTagNewVersion = async (ctx) => {
    ctx.packageNewTag = `v${ctx.newPackageVersion}`;
    await exec(`git tag -a "${ctx.packageNewTag}" -m "${ctx.packageNewTag}"`);
};

const gitReset = async () => {
    await exec(`git reset --quiet HEAD && git checkout --quiet .`);
};

const gitCommitBuildChanges = async (ctx) => {
    await gitCommitChanges(`🚀 ${ctx.isPackage ? `${ctx.packageName} - ` : ''}v${ctx.newPackageVersion}`, true);
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

const createGitHubToken = async () => {

    const questions = [{
        message: 'GitHub username:',
        name: 'username',
        type: 'input'
    }, {
        message: 'GitHub password:',
        name: 'password',
        type: 'password'
    }, {
        message: 'GitHub OTP:',
        name: 'otp',
        type: 'input'
    }];

    const answers = await inquirer.prompt(questions);

    const github = new Octokit({
        auth: {
            on2fa () {
                return answers.otp;
            },
            password: answers.password,
            username: answers.username
        }
    });

    // - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -

    try {
        const oauthAuthorization = await github.oauthAuthorizations.createAuthorization({
            note: `browser-logos release script (${new Date()})`,
            scopes: ['repo']
        });

        authorizationID = oauthAuthorization.data.id;

        octokit = new Octokit({
            auth: `token ${oauthAuthorization.data.token}`
        });

    } catch (e) {
        if (e.status === 401) {
            await createGitHubToken();
        } else {
            throw new Error(e);
        }
    }

};

const deleteGitHubToken = async () => {
    await octokit.oauthAuthorizations.deleteAuthorization({
        authorization_id: authorizationID
    });
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
    updateFile(ctx.packageJSONFilePath, `${JSON.stringify(ctx.packageJSONFileContent, null, 2)}\n`);
};

const npmUpdateVersion = async (ctx) => {
    const version = (await exec(`cd ${ctx.packagePath} && npm --quiet version ${ctx.packageSemverIncrement} --no-git-tag-version`)).stdout;

    /*
     * `version` will be something such as `vX.X.X`,
     *  so the `v` will need to be removed.
     */
    ctx.newPackageVersion = version.substring(1, version.length);
};

const updateFile = (filePath, content) => {
    fs.writeFileSync(filePath, content, 'utf-8');
};

const updateReadme = async (ctx) => {
    const lastCommitSha = (await exec(`git log -n 1 --pretty=format:'%H' ${ctx.packagePath}`)).stdout;

    shell.sed('-i', '[0-9a-f]\{40\}', lastCommitSha, `${ctx.packagePath}/README.md`);
};

const updateChangelog = (ctx) => {
    const changelogFilePath = `${ctx.packagePath}/CHANGELOG.md`;

    if (!ctx.isUnpublishedPackage) {
        updateFile(changelogFilePath, `${getChangelogContent(ctx)}${shell.cat(changelogFilePath)}`);
    } else {
        ctx.packageReleaseNotes = '✨';
        updateFile(changelogFilePath, getChangelogContent(ctx));
    }
};

const waitForUser = async () => {
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

            ctx.packagePath = packagePath;
            ctx.packageName = path.basename(ctx.packagePath);

            ctx.packageJSONFileContent = packageJSONFileContent;
            ctx.packageVersion = packageJSONFileContent.version;

            if (isUnpublishedPackage) {
                ctx.newPackageVersion = packageJSONFileContent.version;
            }

            ctx.isPackage = isPackage;
        },
        title: `Get package information.`
    });

    // Published package tasks.

    if (!isUnpublishedPackage) {
        tasks.push(
            newTask('Get commits SHAs since last release.', getCommitSHAsSinceLastRelease),
            newTask('Get release notes and semver increment.', getReleaseData),
            newTask('Update version in `package.json`.', npmUpdateVersion),
            newTask('Update `README.md`.', updateReadme),
            newTask('Update `CHANGELOG.md` file.', updateChangelog),
            newTask('Review `CHANGELOG.md` file.', waitForUser)
        );

    // Unpublished package tasks.

    } else {
        tasks.push(
            newTask('Remove `"private": true` from the `package.json` file.', npmRemovePrivateField),
            newTask('Update `CHANGELOG.md` file.', updateChangelog)
        );
    }

    // Common tasks for both published and unpublished packages.

    tasks.push(newTask('Commit changes.', gitCommitBuildChanges));

    if (!isPackage) {
        tasks.push(newTask('Tag new version.', gitTagNewVersion));
    }

    if (isPackage) {
        tasks.push(newTask(`Publish on npm.`, npmPublish));
    }

    tasks.push(newTask(`Push changes upstream.`, gitPush));

    if (!isPackage) {
        tasks.push(newTask(`Create release.`, gitCreateRelease));
    }

    return new Listr(tasks);
};

// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -

const main = async () => {

    await createGitHubToken();

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

    await deleteGitHubToken();
};

main();

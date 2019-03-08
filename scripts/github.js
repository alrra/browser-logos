const inquirer = require('inquirer');
const Octokit = require('@octokit/rest')

class GitHub {

    constructor() {
        this.REPOSITORY_NAME = 'browser-logos';
        this.REPOSITORY_OWNER = 'alrra';
        this.REPOSITORY_URL = `https://github.com/${this.REPOSITORY_OWNER}/${this.REPOSITORY_NAME}`;

        this.octokit;
        this.tokenID;

        this.userCredentials = {
            otp: null,
            password: null,
            username: null
        };
    }

    get repositoryURL () {
        return this.REPOSITORY_URL;
    }

    async askForCredentials (configurations) {

        const configs = Object.assign(
            {
                otp: true,
                password: true,
                username: true
            },
            configurations
        );

        const questions = [];

        if (configs.username) {
            questions.push({
                message: 'GitHub username:',
                name: 'username',
                type: 'input'
            });
        }

        if (configs.password) {
            questions.push({
                message: 'GitHub password:',
                name: 'password',
                type: 'password'
            });
        }

        if (configs.otp) {
            questions.push({
                message: 'GitHub OTP:',
                name: 'otp',
                type: 'input'
            });
        }

        Object.assign(
            this.userCredentials,
            await inquirer.prompt(questions)
        );

        console.log();

    }

    async createRelease (configs) {
        await this.octokit.repos.createRelease({
            body: configs.body,
            name: configs.name,
            owner: this.REPOSITORY_OWNER,
            repo: this.REPOSITORY_NAME,
            tag_name: configs.tag_name
        });
    }

    async createToken () {

        await this.askForCredentials();

        const octokit = new Octokit({
            auth: {
                on2fa: (() => this.userCredentials.otp),
                password: this.userCredentials.password,
                username: this.userCredentials.username
            }
        });

        let oauthAuthorization;

        try {
            oauthAuthorization = await octokit.oauthAuthorizations.createAuthorization({
                note: `browser-logos release script (${new Date()})`,
                scopes: ['repo']
            });
        } catch (e) {
            if (e.status === 401) {
                return await this.createToken();
            } else {
                throw new Error(e);
            }
        }

        this.tokenID = oauthAuthorization.data.id;
        this.octokit = new Octokit({
            auth: `token ${oauthAuthorization.data.token}`
        });

    }

    async getCommitAuthorInfo (sha) {

        let commitAuthorInfo;
        let commitInfo;

        try {

            // Get commit information.

            commitInfo = await this.octokit.repos.getCommit({
                owner: this.REPOSITORY_OWNER,
                repo: this.REPOSITORY_NAME,
                sha
            });

            // - - - - - - - - - - - - - - - - - - - - - - - - - - - - -

            // Get commit author related info.

            // This is done because the previous request doesn't provide
            // the name of the user, only the name of the user associated
            // with the commit, which in most cases, is wrongly set.

            commitAuthorInfo = await this.octokit.users.getByUsername({
                username: commitInfo.data.author.login
            });

        } catch (e) {
            return null;
        }

        // - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -

        return {
            gitHubProfileURL: commitAuthorInfo.data.html_url,

            // Get the user name, and if one is not provided,
            // use the name associated with the commit.

            name: commitAuthorInfo.data.name || commitInfo.data.commit.author.name
        };
    }

    async deleteToken () {

        await this.askForCredentials({
            password: false,
            username: false
        });

        const octokit = new Octokit({
            auth: {
                on2fa: (() => this.userCredentials.otp),
                password: this.userCredentials.password,
                username: this.userCredentials.username
            }
        });

        try {
            await octokit.oauthAuthorizations.deleteAuthorization({
                authorization_id: this.tokenID
            });
        } catch (e) {
            if (e.status === 401) {
                await this.deleteToken();
            } else {
                throw new Error(e);
            }
        }

    }
}

module.exports = GitHub;

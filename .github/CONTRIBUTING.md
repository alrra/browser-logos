# Contributing to this project

♥ [Browser Logos](https://github.com/alrra/browser-logos/) and want to
get involved? Thanks! There are plenty of ways you can help!

First of all, please take a moment to review this document in order to
make the contribution process easy and effective for everyone involved.

Following these guidelines helps to communicate that you respect the
time of the developers managing and developing this open source project.
In return, they should reciprocate that respect in addressing your issue
or assessing patches and features.


## Using the issue tracker

The [issue tracker](https://github.com/alrra/browser-logos/issues) is
the preferred channel for [bug reports](#bugs), [features requests](#features)
and [submitting pull requests](#pull-requests), but please respect the
following restriction:

* **Do not** derail or troll issues. Keep the discussion on topic and
  respect the opinions of others.


<a name="bugs"></a>
## Bug reports

A bug is a _demonstrable problem_ with the content in the repository.
Good bug reports are extremely helpful - thank you!


Guidelines for bug reports:

1. **Use the GitHub issue search** &mdash; check if the issue has
   already been reported.

2. **Check if the issue has been fixed** &mdash; verify if the issue is
   still present using the latest content from the
   [`master`](https://github.com/alrra/browser-logos/tree/master) branch.

A good bug report shouldn't leave others needing to chase you up for
more information. Please try to be as detailed as possible in your
report. What browser logo(s) on what OS(es) experience the problem?
What exactly is wrong with the logo(s)? What should be changed? All
these details will help people to fix any potential bugs.

Example:

> Short and descriptive bug report title
>
> A summary of the issue and the browser logo(s) for which it occurs.
> If suitable, include images that:
>
>  * show the difference between the existing logo(s) and what is expected
>  * highlight the affected part(s) of the logo(s)
>
> Any other information you want to share that is relevant to the issue
> being reported, as well as potential solutions (and your opinions on
> their merits).


<a name="features"></a>
## Feature requests

Feature requests are welcome, but please take a moment to find out
whether your idea fits with the scope and aims of the project. It's
up to you to make a strong case and convince the project's developers
of the merits of the feature by providing as much detail and context
as possible.


<a name="pull-requests"></a>
## Pull requests

Good pull requests - new logos, better version of the existing logos,
improvements - are a fantastic help, but they should remain focused
in scope and avoid containing unrelated commits.

**Ask** before embarking on any significant pull request (e.g. adding
new image file formats), otherwise you risk spending a lot of time
working on something that the project's developers might not want to
merge into the project. Also, please adhere to the conventions used
throughout the project and any other requirements.

If you were to add a brand new browser to list, ensure that it meets the following criteria:
 * Browser must have distict feature(s) that separate it from the rest. For instance, many Chromium based browsers are very similar in functionality.
 * The browser's overall usage and download count is relatively high. 
 * The browser has a proven track record of being maintained. This includes and is not limited to major updates, patches, community activity, etc.

Follow this process if you'd like your work considered for inclusion
in the project:

1. [Fork](https://help.github.com/articles/fork-a-repo/) the project,
   clone your fork, and configure the remotes:

   ```bash
   # Clone your fork of the repo into the current directory
   git clone https://github.com/<your-username>/browser-logos

   # Navigate to the newly cloned directory
   cd browser-logos

   # Assign the original repo to a remote called "upstream"
   git remote add upstream https://github.com/alrra/browser-logos
   ```

2. If you cloned a while ago, get the latest changes from upstream:

   ```bash
   git checkout <dev-branch>
   git pull upstream <dev-branch>
   ```

3. Create a new topic branch (off the main project development branch)
   to contain your addition, change, or fix:

   ```bash
   git checkout -b <topic-branch-name>
   ```

4. Commit your changes in logical chunks. Please adhere to these [git
   commit message guidelines](http://tbaggery.com/2008/04/19/a-note-about-git-commit-messages.html)
   or your code is unlikely be merged into the main project. Use Git's
   [interactive rebase](https://help.github.com/en/articles/about-git-rebase)
   feature to tidy up your commits before making them public.

5. Locally merge (or rebase) the upstream development branch into your
   topic branch:

   ```bash
   git pull [--rebase] upstream <dev-branch>
   ```

6. Push your topic branch up to your fork:

   ```bash
   git push origin <topic-branch-name>
   ```

7. [Open a Pull Request](https://help.github.com/articles/using-pull-requests/)
    with a clear title and description.

**IMPORTANT**: By submitting a patch, you agree with what is specified
under the [legal section](https://github.com/alrra/browser-logos#legal).

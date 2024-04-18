# UBC Insights Project
This Sections Insight project is an application that seeks to provide insights into datasets regarding UBC sections.

## Video Link
https://youtu.be/0Zg-LBAzfS8

## Installation and Setup

### Configuring your environment

To start using this project, you need to get your development environment configured so that you can build and execute the code.
To do this, follow these steps; the specifics of each step will vary based on your operating system:

1. [Install git](https://git-scm.com/downloads) (v2.X). You should be able to execute `git --version` on the command line after installation is complete.

2. [Install Node LTS](https://nodejs.org/en/download/) (LTS: v18.X), which will also install NPM (you should be able to execute `node --version` and `npm --version` on the command line).

3. [Install Yarn](https://yarnpkg.com/en/docs/install) (1.22.X). You should be able to execute `yarn --version`.

4. Clone your repository by running `git clone REPO_URL` from the command line. You can get the REPO_URL by clicking on the green button on your project repository page on GitHub. Note that due to new department changes you can no longer access private git resources using https and a username and password. You will need to use either [an access token](https://help.github.com/en/github/authenticating-to-github/creating-a-personal-access-token-for-the-command-line) or [SSH](https://help.github.com/en/github/authenticating-to-github/adding-a-new-ssh-key-to-your-github-account).

### Setup

1. `yarn install` to download the packages specified in your project's *package.json* to the *node_modules* directory. Do this in the root folder and inside the `/frontend` folder.
2. `yarn start` in the root folder to start the backend
3. `yarn dev` in the `/frontend` folder to start the frontend

### Other Project Commands

Once your environment is configured you need to further prepare the project's tooling and dependencies.
In the project folder:

1. `yarn build` to compile your project. You must run this command after making changes to your TypeScript files. If it does not build locally, AutoTest will not be able to build it.

2. `yarn test` to run the test suite.
    - To run with coverage, run `yarn cover`

3. `yarn lint` to lint your project code. If it does not lint locally, AutoTest will not run your tests when you submit your code.

4. `yarn pretty` to prettify your project code.

If you are curious, some of these commands are actually shortcuts defined in [package.json -> scripts](./package.json).

### Running and testing from an IDE

IntelliJ Ultimate should be automatically configured the first time you open the project (IntelliJ Ultimate is a free download through the [JetBrains student program](https://www.jetbrains.com/community/education/#students/)).

## Other Important Notes

- The backend will create an extra folder
- Otherwise the project should be pretty plug and play
- Entry point to the backend is in `src/App.ts` and to the frontend is in `frontend/app/layout.tsx`.
    - frontend note: the app folder represents the website structure, all `page.tsx` files represent the entry point of each page.

---

# CPSC 310 Project Repository

This repository contains starter code for the class project.
Please keep your repository private.

For information about the project, autotest, and the checkpoints, see the course webpage.

### License

While the readings for this course are licensed using [CC-by-SA](https://creativecommons.org/licenses/by-sa/3.0/), **checkpoint descriptions and implementations are considered private materials**. Please do not post or share your project solutions. We go to considerable lengths to make the project an interesting and useful learning experience for this course. This is a great deal of work, and while future students may be tempted by your solutions, posting them does not do them any real favours. Please be considerate with these private materials and not pass them along to others, make your repos public, or post them to other sites online.

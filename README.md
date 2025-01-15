## Deploy the App

Click the following button to deploy the app to App Platform. If you are not currently logged in with your DigitalOcean account, this button prompts you to to log in.

[![Deploy to DigitalOcean](https://www.deploytodo.com/do-btn-blue.svg)](https://cloud.digitalocean.com/apps/new?repo=https://github.com/digitalocean/sample-job-manager/tree/main)


## CI

This project uses GitHub Actions to run tests on every push to the main branch. There is a workflow to validate the App Specs against the `Propose()` API and also to perform local `doctl apps dev build` on them to verify buildback compatibility..


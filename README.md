# Get Started

This guide explains how to use the DigitalOcean App Platform to run a Job Manager that demonstrates leases in a scalable environment.

For additional information, see the [Using Leases to Manage Multi-Instance Environments](https://www.digitalocean.com/community/tutorials/manage-multi-instance-environments-using-leases) tutorial.

**Note**: Following these steps may result in charges for the use of DigitalOcean services.

## Requirements

* You need a DigitalOcean account. If you do not already have one, first [sign up](https://cloud.digitalocean.com/registrations/new).

## Deploy the App

Click the following button to deploy the app to App Platform. If you are not currently logged in with your DigitalOcean account, this button prompts you to to log in.

[![Deploy to DigitalOcean](https://www.deploytodo.com/do-btn-blue.svg)](https://cloud.digitalocean.com/apps/new?repo=https://github.com/digitalocean/template-job-manager/tree/main)

Note that, for the purposes of this tutorial, this button deploys the app directly from DigitalOcean's GitHub repository, which disables automatic redeployment since you cannot change our template. If you want automatic redeployment or you want to change the sample app's code to your own, we instead recommend you fork [our repository](https://github.com/digitalocean/template-job-manager/tree/main).

To fork our repository, click the **Fork** button in the top-right of [its page on GitHub](https://github.com/digitalocean/template-job-manager/tree/main), then follow the on-screen instructions. To learn more about forking repos, see the [GitHub documentation](https://docs.github.com/en/github/getting-started-with-github/fork-a-repo).

After forking the repo, you can view the same README in your own GitHub org; for example, in `https://github.com/<your-org>/template-job-manager`. To deploy the new repo, visit the [control panel](https://cloud.digitalocean.com/apps) and click the **Create App** button. This takes you to the app creation page. Under **Service Provider**, select **GitHub**. Then, under **Repository**, select your newly-forked repo. Ensure that your branch is set to **main** and **Autodeploy** is checked on. Finally, click **Next**.

## CI

This project uses GitHub Actions to run tests on every push to the main branch. There is a workflow to validate the App Specs against the `Propose()` API and also to perform local `doctl apps dev build` on them to verify buildpack compatibility.

## Learn More

To learn more about App Platform and how to manage and update your application, see [our App Platform documentation](https://www.digitalocean.com/docs/app-platform/).

## Delete the App

When you no longer need this sample application running live, you can delete it by following these steps:

1. Visit the [Apps control panel](https://cloud.digitalocean.com/apps).
2. Navigate to the sample app.
3. In the **Settings** tab, click **Destroy**.

**Note**: If you do not delete your app, charges for using DigitalOcean services will continue to accrue.

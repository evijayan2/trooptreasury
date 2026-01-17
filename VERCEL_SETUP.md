# Vercel & GitHub Actions Setup Guide

Follow these steps to configure your Vercel project and GitHub repository for automated deployments.

## 1. Create Vercel Project & Database

1.  **Log in to Vercel**: Go to [vercel.com](https://vercel.com) and log in.
2.  **Add New Project**:
    *   Click **"Add New..."** > **"Project"**.
    *   Import your `TroopTreasury` repository.
    *   **Environment Variables**: You can skip this for now, or add your `.env` values (like `NEXTAUTH_SECRET`, `NEXTAUTH_URL`).
    *   Click **Deploy**.
3.  **Create Postgres Database**:
    *   Go to your new Project's Dashboard.
    *   Click on the **Storage** tab.
    *   Click **"Create Database"** (or "Connect Store").
    *   Select **Postgres** (likely powered by Neon).
    *   Follow the prompts to create it.
    *   **Important**: Once created, go to the **Settings** (or `.env.local` tab of the database) and note that Vercel automatically adds `POSTGRES_URL`, `POSTGRES_PRISMA_URL`, etc., to your Project's Environment Variables.

## 2. Get Vercel Project IDs

To allow GitHub Actions to deploy to this specific project, you need its ID and your Org ID.

1.  **Install Vercel CLI** (locally, if you haven't): `npm i -g vercel`
2.  **Link Project**: Run `vercel link` in your project root.
    *   Follow the prompts.
3.  **Check `.vercel/project.json`**:
    *   After linking, a `.vercel` folder is created.
    *   Open `.vercel/project.json`.
    *   Note the `projectId` and `orgId`.

## 3. Configure GitHub Secrets

1.  Go to your GitHub Repository.
2.  Click **Settings** > **Secrets and variables** > **Actions**.
3.  Click **New repository secret**.
4.  Add the following secrets:

| Secret Name | Value | Description |
| :--- | :--- | :--- |
| `VERCEL_TOKEN` | (Your API Token) | Create one at [vercel.com/account/tokens](https://vercel.com/account/tokens). |
| `VERCEL_ORG_ID` | (Your Org ID) | From `.vercel/project.json` (see step 2). |
| `VERCEL_PROJECT_ID` | (Your Project ID) | From `.vercel/project.json` (see step 2). |

## 4. Push to GitHub

Once these secrets are set, the GitHub Action defined in `.github/workflows/deploy-pipeline.yml` will automatically:
*   Deploy a **Preview** on Pull Requests.
*   Deploy to **Production** on pushes to `main`.

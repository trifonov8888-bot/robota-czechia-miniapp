# Apps Script CI setup

This repository will use GitHub Actions + clasp to sync `apps-script/` into the existing Google Apps Script project and, when `APPS_SCRIPT_DEPLOYMENT_ID` is configured, update the existing web-app deployment without changing its URL.

## Required GitHub Actions secrets

Create these under **Settings → Secrets and variables → Actions → New repository secret**:

- `CLASPRC_JSON` — the complete contents of the authorized clasp credentials file (`.clasprc.json`). Never commit this file and never paste it into chat.
- `APPS_SCRIPT_ID` — the Apps Script project Script ID from Apps Script → Project Settings.
- `APPS_SCRIPT_DEPLOYMENT_ID` — the deployment ID of the current web app. This is needed only for automatic redeployment of the existing `/exec` URL.

## Local authorization

On the computer where the Google account that owns the Apps Script project is signed in:

```bash
npx @google/clasp@3.4.1 login
```

After authorization, clasp stores credentials in `.clasprc.json` in the user profile. Copy the complete file contents into the GitHub Actions secret `CLASPRC_JSON`.

Google's Apps Script API also requires that access for third-party applications to manage script projects has been explicitly granted in the Apps Script dashboard. The OAuth client used by clasp must be authorized for the Apps Script project.

## Workflow

`.github/workflows/deploy-apps-script.yml` runs on changes under `apps-script/` and can also be started manually from the Actions tab.

The workflow:

1. checks out the repository;
2. installs clasp 3.4.1;
3. authenticates using the protected GitHub secret;
4. pushes the Apps Script source;
5. optionally updates the existing web-app deployment when `APPS_SCRIPT_DEPLOYMENT_ID` is present.

The production deployment is intentionally tied to the existing deployment ID so the public web-app URL remains unchanged.

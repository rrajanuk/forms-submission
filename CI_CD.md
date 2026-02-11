# CI/CD Setup Guide

This document explains how to set up automated building, testing, and deployment for your Form Submission Platform.

---

## Overview

The project now uses **GitHub Actions** for:
- ✅ Automated TypeScript compilation
- ✅ Automated testing
- ✅ Automated deployment to VPS on push to main branch
- ✅ Build artifact caching

---

## GitHub Secrets Configuration

To enable CI/CD, add these secrets to your GitHub repository:

**Go to:** https://github.com/rrajanuk/forms-submission/settings/secrets/actions

### Required Secrets for Deployment:

| Secret Name | Description | Example |
|--------------|-------------|---------|
| `VPS_HOST` | Your VPS IP address or domain | `123.45.67.89` or `forms.example.com` |
| `VPS_USER` | SSH username for VPS | `robin` or `root` |
| `VPS_PATH` | Path to app on VPS | `~/apps/forms-submission` |
| `SSH_PRIVATE_KEY` | Your private SSH key | Entire contents of `~/.ssh/id_rsa` file |

### Optional Secrets:

| Secret Name | Description | Example |
|--------------|-------------|---------|
| `JWT_SECRET` | Production JWT secret | Generate with: `openssl rand -base64 32` |
| `ADMIN_API_KEY` | Admin API key | Generate with: `openssl rand -base64 32` |

---

## Setting Up SSH Deployment Key

### Option 1: Generate New SSH Key (Recommended)

```bash
# Generate new SSH key pair for deployment
ssh-keygen -t ed25519 -C "github-actions-deploy" -f ~/.ssh/github_actions_deploy -N ""

# Public key goes to: GitHub Secrets → SSH_PUBLIC_KEY
cat ~/.ssh/github_actions_deploy.pub

# Private key goes to: GitHub Secrets → SSH_PRIVATE_KEY
cat ~/.ssh/github_actions_deploy
```

**Steps:**
1. Copy public key output
2. Add to GitHub Secrets as `SSH_PUBLIC_KEY`
3. Copy private key output
4. Add to GitHub Secrets as `SSH_PRIVATE_KEY`
5. Add public key to VPS `~/.ssh/authorized_keys`:

```bash
# On your VPS
echo "ssh-ed25519 AAAAC3NzaC1yc2E..." >> ~/.ssh/authorized_keys
```

### Option 2: Use Existing SSH Key

If you already have SSH access to VPS:

```bash
# Copy your existing private key
cat ~/.ssh/id_rsa

# Add to GitHub Secrets → SSH_PRIVATE_KEY
```

---

## VPS Setup

### 1. Install PM2 (Process Manager)

```bash
# On your VPS
npm install -g pm2

# Or using yarn
yarn global add pm2
```

### 2. Ensure Directory Structure

```bash
# On your VPS
cd ~/apps/forms-submission
ls -la

# Should show:
# - dist/          (built files)
# - node_modules/   (dependencies)
# - data/           (SQLite database)
# - .env            (environment variables)
```

### 3. Create .env File

```bash
# On your VPS
cd ~/apps/forms-submission
cp .env.example .env
nano .env
```

**Required variables:**
```bash
JWT_SECRET=<your-secret-key>
DATABASE_PATH=./data/submissions.db
NODE_ENV=production
```

---

## Deployment Workflows

### Automatic Deployment (On Push to Main)

Whenever you push to `main` branch:
1. GitHub Actions builds the project
2. Runs all tests
3. Uploads `dist/` folder to VPS
4. Restarts application via PM2

**Trigger:**
```bash
git push origin main
```

### Manual Deployment (From Any Branch)

If you want to deploy without pushing to main:

1. Go to: https://github.com/rrajanuk/forms-submission/actions
2. Click "Build and Deploy" workflow
3. Click "Run workflow" button
4. Select branch to deploy

---

## Deployment Artifacts

After deployment, the following are available on your VPS:

### Backend API
- **URL:** `http://your-vps-ip:3001`
- **Health Check:** `http://your-vps-ip:3001/health`
- **PM2 Status:** `pm2 status`
- **Logs:** `pm2 logs form-api`

### Frontend
- **URL:** `http://your-vps-ip:3000`
- **PM2 Status:** `pm2 status form-frontend`
- **Logs:** `pm2 logs form-frontend`

---

## Manual Deployment (Without CI/CD)

If you prefer to deploy manually:

### 1. Build Locally

```bash
# On your machine
npm run build
```

### 2. Upload to VPS

```bash
# Upload dist folder
scp -r dist/* user@your-vps:~/apps/forms-submission/dist/
```

### 3. Restart on VPS

```bash
# SSH into VPS
ssh user@your-vps

# Restart application
cd ~/apps/forms-submission
pm2 restart form-api
# or
pm2 restart all
```

---

## Monitoring

### Check Deployment Status

```bash
# On your VPS
pm2 status

# Should show:
# ┌────┬──────┬────┬──────┬──────┬─────────┐
# │ name │ mode │ status │ cpu  │ memory │
# ├─────┼──────┼──────┼──────┼─────────┤
# │form-api│ fork │ online │ 0%   │ 50mb   │
# │form-frontend│ fork │ online │ 0%   │ 100mb  │
# └─────┴──────┴──────┴──────┴─────────┘
```

### View Logs

```bash
# Real-time logs
pm2 logs form-api

# Last 100 lines
pm2 logs form-api --lines 100

# Monitor both services
pm2 logs
```

### Auto-Restart on Failure

```bash
# Configure PM2 to restart on crash
pm2 startup form-api --u
pm2 save
```

---

## Troubleshooting

### Build Fails in CI

**Check:**
1. Are all TypeScript errors fixed locally?
2. Run `npm run build` locally first
3. Check test results: `npm test`

### Deployment Fails

**Check:**
1. SSH secrets are correct
2. VPS is accessible
3. PM2 is installed
4. `.env` file exists on VPS
5. Directory paths are correct

### App Won't Start

```bash
# Check PM2 error logs
pm2 logs form-api --err

# Check if port is in use
netstat -tulpn | grep :3001

# Check Node.js version
node --version  # Should be 20+
```

---

## Security Best Practices

### 1. Never Commit Secrets
```bash
# Always use .env file (which is in .gitignore)
echo ".env" >> .gitignore
echo "*.key" >> .gitignore
echo "secrets/" >> .gitignore
```

### 2. Rotate Secrets Regularly
- Change JWT_SECRET every 90 days
- Rotate SSH keys yearly
- Use strong, unique passwords

### 3. Monitor Access Logs
```bash
# On VPS
pm2 logs form-api | grep "Unauthorized\|Forbidden"

# Check for suspicious activity
journalctl -u ssh -n 100 --no-pager
```

### 4. Keep Dependencies Updated
```bash
# On VPS
cd ~/apps/forms-submission
npm update
npm audit fix
```

---

## Rollback Procedure

If deployment breaks production:

```bash
# On VPS
cd ~/apps/forms-submission

# Check previous PM2 snapshots
pm2 list

# Restore previous version (if you have backups)
pm2 restart form-api --update-env

# Or rollback git commit
git log --oneline -5
git reset --hard <commit-hash>
npm run build
pm2 restart form-api
```

---

## Quick Reference

### GitHub Actions Workflow
- **Location:** `.github/workflows/deploy.yml`
- **Triggers:** Push to main, manual
- **Jobs:** Build/Test → Deploy

### Useful Commands
```bash
# Local testing
npm run build
npm test
npm run dev

# Deployment
git push origin main
pm2 restart all
pm2 logs form-api

# Monitoring
pm2 monit
```

---

## Next Steps

1. ✅ Add GitHub Secrets (VPS_HOST, VPS_USER, VPS_PATH, SSH_PRIVATE_KEY)
2. ✅ Set up SSH key on VPS
3. ✅ Push code to GitHub
4. ✅ Watch deployment in Actions tab
5. ✅ Verify deployment at `http://your-vps-ip:3001/health`

---

For issues or questions, check:
- GitHub Actions: https://github.com/rrajanuk/forms-submission/actions
- PM2 logs on VPS
- DEPLOYMENT.md for detailed setup
- CLAUDE.md for technical documentation

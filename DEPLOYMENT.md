# Deployment Guide - Form Submission Platform

This guide will help you deploy the Form Submission Platform to a VPS.

---

## 🚀 Quick Start

### Option 1: Docker Compose (Recommended)

1. **Copy files to VPS**
   ```bash
   # On your local machine
   scp -r forms-submission user@your-vps:/home/user/

   # SSH into your VPS
   ssh user@your-vps
   cd forms-submission
   ```

2. **Set environment variables**
   ```bash
   cp .env.example .env

   # Edit .env and add your secrets
   nano .env

   # Minimum required:
   JWT_SECRET=your-super-secret-key-change-this
   ADMIN_API_KEY=your-admin-api-key
   ```

3. **Start the application**
   ```bash
   docker-compose up -d
   ```

4. **Access your app**
   - Frontend: `http://your-vps-ip:3000`
   - Backend: `http://your-vps-ip:3001`

---

### Option 2: Direct Deployment with PM2 (Recommended for CI/CD)

#### Prerequisites
- Node.js 20+ installed
- PM2 installed globally: `npm install -g pm2`
- Build tools: `sudo apt install build-essential python3`

#### Initial Setup

```bash
# Install system dependencies
sudo apt update
sudo apt install -y build-essential python3

# Clone repository
cd /var/www
git clone https://github.com/rrajanuk/forms-submission.git
cd forms-submission

# Configure environment
cp .env.example .env
nano .env  # Add your secrets (see below)

# Frontend environment
cd frontend
cp .env.production .env.local
nano .env.local  # Set NEXT_PUBLIC_API_URL
cd ..

# Build backend
npm install --omit=dev
npm rebuild better-sqlite3  # Critical: rebuild native module for VPS architecture
npm run build

# Build frontend
cd frontend
npm install
npm run build
cd ..
```

#### Deploy with PM2 Ecosystem Config

```bash
# Start backend (uses ecosystem.config.js)
pm2 start ecosystem.config.js --env production

# Start frontend (uses frontend/ecosystem.config.js)
pm2 start frontend/ecosystem.config.js --env production

# Save PM2 configuration (auto-restart on reboot)
pm2 save

# Setup PM2 startup script
pm2 startup
# Follow the instructions - copy and run the generated command as sudo
```

#### Update Environment Variables (.env)

```bash
# Required in production
NODE_ENV=production
PORT=3001

# Generate secure secrets
ADMIN_API_KEY=$(openssl rand -base64 32)
JWT_SECRET=$(openssl rand -base64 32)

# CORS (comma-separated domains)
CORS_ORIGIN=https://yourdomain.com,https://www.yourdomain.com

# JWT Configuration
JWT_EXPIRES_IN=15m
JWT_REFRESH_EXPIRES_IN=7d
```

#### Frontend Environment (.env.local)

```bash
# Update with your actual API domain
NEXT_PUBLIC_API_URL=https://api.yourdomain.com
```

---

## 🔧 Environment Variables

Create `.env` file in the root directory:

```bash
# Required
JWT_SECRET=your-super-secret-key-change-this-in-production
ADMIN_API_KEY=your-admin-api-key

# Optional (with defaults)
PORT=3001
NODE_ENV=production
DATABASE_PATH=./data/submissions.db
JWT_EXPIRES_IN=15m
JWT_REFRESH_EXPIRES_IN=7d
DRAFT_EXPIRY_DAYS=7

# Rate Limiting
RATE_LIMIT_WINDOW_MS=3600000
RATE_LIMIT_MAX_REQUESTS=100

# SMTP (optional)
SMTP_ENABLED=false
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-app-password

# Webhooks (optional)
WEBHOOK_ENABLED=false
WEBHOOK_URL=
WEBHOOK_SECRET=
```

---

## 🌐 Nginx Reverse Proxy (Recommended for Production)

Install nginx: `sudo apt install nginx`

Create `/etc/nginx/sites-available/forms-platform`:

```nginx
server {
    listen 80;
    server_name your-domain.com;

    # Frontend
    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }

    # Backend API
    location /api/ {
        proxy_pass http://localhost:3001;
        proxy_http_version 1.1;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    # Public API (for embed SDK)
    location /embed/ {
        proxy_pass http://localhost:3001;
        proxy_http_version 1.1;
    }

    client_max_body_size 10M;
}

# HTTPS with Let's Encrypt (SSL Certificate)
server {
    listen 443 ssl http2;
    server_name your-domain.com;

    ssl_certificate /etc/letsencrypt/live/your-domain.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/your-domain.com/privkey.pem;

    # Include common SSL settings
    include /etc/letsencrypt/options-ssl-nginx.conf;
    ssl_dhparam /etc/letsencrypt/ssl-dhparams.pem;

    # Frontend
    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }

    # Backend API
    location /api/ {
        proxy_pass http://localhost:3001;
        proxy_http_version 1.1;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    # Public API (for embed SDK)
    location /embed/ {
        proxy_pass http://localhost:3001;
        proxy_http_version 1.1;
    }

    client_max_body_size 10M;
}
```

Enable site:
```bash
sudo ln -s /etc/nginx/sites-available/forms-platform /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl restart nginx
```

---

## 🔐 SSL Certificate (HTTPS)

### Using Certbot (Let's Encrypt)

```bash
sudo apt install certbot python3-certbot-nginx
sudo certbot --nginx -d your-domain.com
```

Auto-renewal is configured automatically.

---

## 📊 Monitoring & Logs

### View Logs

**Docker:**
```bash
docker-compose logs -f
docker-compose logs -f backend
docker-compose logs -f frontend
```

**PM2:**
```bash
pm2 logs
pm2 logs form-api
pm2 logs form-frontend
```

### Monitor Application

```bash
# Check if services are running
curl http://localhost:3001/health
```

---

## 🔄 Updates & Deployments

### Update with Docker

```bash
# Pull latest code
git pull

# Rebuild and restart
docker-compose down
docker-compose up -d --build
```

### Update with PM2

```bash
# Pull latest code
git pull origin main

# Backend
npm install --omit=dev
npm rebuild better-sqlite3  # Rebuild native module
npm run build
pm2 reload ecosystem.config.js --env production

# Frontend
cd frontend
npm install
npm run build
cd ..
pm2 reload frontend/ecosystem.config.js --env production

# Save PM2 configuration
pm2 save
```

### Automated Deployment via GitHub Actions

This repository includes CI/CD configuration for automatic deployment to VPS.

**Setup GitHub Secrets:**
1. Go to Repository → Settings → Secrets and variables → Actions
2. Add the following secrets:

| Secret Name | Description | Example |
|-------------|-------------|---------|
| `VPS_HOST` | VPS IP address or domain | `123.45.67.89` |
| `VPS_USER` | SSH username | `ubuntu` |
| `VPS_PATH` | Project path on VPS | `/var/www/forms-submission` |
| `SSH_PRIVATE_KEY` | SSH private key | Output of `cat ~/.ssh/id_rsa` |

**Generate SSH key for deployment:**
```bash
# On your local machine
ssh-keygen -t ed25519 -C "github-deploy" -f ~/.ssh/github_actions_deploy

# Copy public key to VPS
ssh-copy-id -i ~/.ssh/github_actions_deploy.pub user@your-vps-ip

# Copy private key for GitHub secret
cat ~/.ssh/github_actions_deploy  # Copy entire output to GitHub secret
```

**Deploy:**
```bash
# Push to main branch - automatic deployment
git push origin main

# Monitor deployment at:
# https://github.com/rrajanuk/forms-submission/actions
```

---

## 🐛 Troubleshooting

### Port already in use
```bash
# Check what's using the port
netstat -tulpn | grep :3000
netstat -tulpn | grep :3001

# Kill the process
kill -9 <PID>
```

### Database errors
```bash
# Check database permissions
ls -la data/submissions.db

# Fix permissions
chmod 644 data/submissions.db
```

### Frontend build errors
```bash
cd frontend
rm -rf .next node_modules
npm install
npm run build
```

### better-sqlite3 module errors
**Error:** `Cannot find module 'better-sqlite3'` or module incompatible

**Solution:**
```bash
cd /var/www/forms-submission
npm rebuild better-sqlite3
npm run build
pm2 reload forms-api
```

### PM2 apps crash on startup
**Check logs:**
```bash
pm2 logs forms-api --err --lines 50
pm2 logs forms-frontend --err --lines 50
```

**Common causes:**
- Missing `JWT_SECRET` in `.env`
- Wrong `NEXT_PUBLIC_API_URL` in frontend
- Database file permissions
- Port conflicts

### CORS errors in browser
**Error:** `Access-Control-Allow-Origin` header missing

**Solution:**
```bash
nano .env
# Update CORS_ORIGIN with your actual frontend domains
CORS_ORIGIN=https://yourdomain.com,https://www.yourdomain.com

pm2 reload forms-api
```

### GitHub Actions deployment fails
**Error:** `Permission denied (publickey)`

**Solution:**
```bash
# Test SSH connection locally
ssh -i ~/.ssh/github_actions_deploy user@vps-ip

# Re-add public key to VPS
ssh-copy-id -i ~/.ssh/github_actions_deploy.pub user@vps-ip

# Verify GitHub secret matches private key
```

---

## 📦 What's Included

This repository contains:

✅ **Multi-tenant Backend API** (Node.js, Express, SQLite)
✅ **Visual Form Builder** (Next.js 15, shadcn/ui)
✅ **13 Field Types** with validation
✅ **Conditional Logic** (show/hide/skip/jump)
✅ **Auto-save & Drafts** with expiration
✅ **JavaScript Embed SDK** for external websites
✅ **JWT + API Key Authentication**
✅ **Interactive Preview** (works for drafts!)
✅ **Submissions Viewer** with CSV export
✅ **Logic Visibility Indicators**
✅ **Docker Configuration** (deploy.yml, Dockerfile)
✅ **Git Initialized** with initial commit

---

## 🎯 Next Steps

1. **Clone to VPS**: `git clone <your-repo-url>`
2. **Set environment variables**: Copy `.env.example` to `.env`
3. **Generate secrets**:
   ```bash
   openssl rand -base64 32
   ```
4. **Start services**: `docker-compose up -d`
5. **Configure nginx** reverse proxy
6. **Setup SSL certificate**
7. **Test the application**
8. **Done! 🎉**

---

## 📞 Support

For issues or questions, check:
- CLAUDE.md - Technical documentation
- README.md - Project overview
- Open an issue on GitHub

---

## 🔐 Security Notes

- **Change JWT_SECRET** in production!
- **Use strong passwords** for all accounts
- **Enable SSL/TLS** for production
- **Keep dependencies updated**
- **Regular database backups**
- **Monitor logs for suspicious activity**

---

## 📄 License

[Your License Here]

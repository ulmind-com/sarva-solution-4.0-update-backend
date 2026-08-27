# 🚀 AWS & Docker Hub Deployment Guide

This guide describes how to configure the GitHub Actions workflow to build and push the backend Docker image, and how to pull and run the application on AWS without encountering environment configuration issues.

---

## 📋 Table of Contents
1. [GitHub Repository Setup (Secrets)](#1-github-repository-setup-secrets)
2. [Workflow Automation (Docker Hub)](#2-workflow-automation-docker-hub)
3. [AWS Server Initial Setup](#3-aws-server-initial-setup)
4. [Deploying via the Setup Script](#4-deploying-via-the-setup-script)
5. [Troubleshooting Environment Issues](#5-troubleshooting-environment-issues)

---

## 1. GitHub Repository Setup (Secrets)

To build and push your Docker image to Docker Hub, GitHub Actions requires access to your Docker Hub credentials. Do not hardcode these in code files. Instead, set them as GitHub Repository Secrets:

1. Open your repository on GitHub.
2. Navigate to **Settings** > **Secrets and variables** > **Actions**.
3. Click on **New repository secret** and add the following two secrets:
   * **`DOCKERHUB_USERNAME`**: Your Docker Hub username (e.g., `samiransamanta`).
   * **`DOCKERHUB_TOKEN`**: A personal access token generated from your Docker Hub Account Settings (navigate to *Docker Hub > Account Settings > Security > New Access Token*).

---

## 2. Workflow Automation (Docker Hub)

The GitHub Actions workflow has been fully optimized at `.github/workflows/docker-push.yml`.

### Key Features:
* **Trigger**: Automated build and push whenever you push to the `main` branch.
* **Docker Buildx**: Set up to enable modern building features and multi-platform compilation support.
* **Build Caching**: Implements the GitHub Actions Cache backend (`type=gha`). This caches your Node.js layers and dependencies, bringing subsequent build times down from minutes to seconds.
* **Tagging**: Publishes two tags:
  * `latest` (always points to the newest build)
  * `${{ github.sha }}` (provides a unique identifier for rollbacks and tracking)

---

## 3. AWS Server Initial Setup

Before running the backend on your AWS instance (EC2 or Lighthouse), ensure that Docker and Git are installed.

```bash
# Update package list and install git
sudo apt-get update && sudo apt-get install -y git

# Install Docker
curl -fsSL https://get.docker.com | sh
sudo usermod -aG docker $USER # Log out and log back in to apply group changes
```

---

## 4. Deploying via the Setup Script

To make deployment seamless and eliminate environment variable configuration errors, we created an automated deployment script `deploy-setup.sh` in the project root.

When you pull/clone the code on AWS, simply execute:

```bash
./deploy-setup.sh
```

### What this script does:
1. **Checks Dependencies**: Ensures Docker and Docker Compose are installed and running.
2. **Generates `.env`**: Creates your `.env` file from the updated `.env.example` if it does not already exist.
3. **Validates Environment Keys**: Checks if the required variables (`MONGO_URI` and `JWT_SECRET`) are filled. If not, it prompts you to enter them.
4. **Auto-Generates Security Keys**: Offers to automatically generate a secure random string for `JWT_SECRET` if left blank.
5. **Warns on Optional Configurations**: Alerts you if key integrations (Resend, Cloudinary, APITxT OTP) are missing, so you know exactly why an feature might not work, without crashing the server.
6. **Deploys**: Automatically pulls the fresh image from Docker Hub and starts the container in daemon mode.

---

## 5. Troubleshooting Environment Issues

### 1. View Logs
If the app container exits or throws errors, inspect the real-time Docker logs:
```bash
docker compose logs -f ssvpl-mlm-api
```

### 2. Checking App Health
The container is equipped with an automatic Docker Healthcheck. If the server goes down, Docker Compose will mark it as `unhealthy` and attempt a restart. You can hit the healthcheck manually from the AWS terminal:
```bash
curl http://localhost:8000/health
# Expected Output: {"status":"UP","timestamp":"..."}
```

### 3. Re-configuring Environment Variables
If you need to update variables (such as updating Cloudinary API secrets or changing MongoDB connection string):
1. Open the `.env` file using an editor like `nano`:
   ```bash
   nano .env
   ```
2. Save changes (`Ctrl+O`, `Enter`, `Ctrl+X`).
3. Re-launch the container to load the new environment:
   ```bash
   docker compose up -d ssvpl-mlm-api
   ```

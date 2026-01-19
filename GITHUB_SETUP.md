# Setting Up GitHub Repository

## Step 1: Create GitHub Repository

1. Go to https://github.com
2. Sign in or create an account
3. Click the **"+"** icon in the top right → **"New repository"**
4. Repository name: `surgical-techniques-app` (or whatever you prefer)
5. Description: "Surgical Techniques Learning Application"
6. Choose **Public** or **Private** (your choice)
7. **DO NOT** check "Initialize with README" (we already have code)
8. Click **"Create repository"**

## Step 2: Initialize Git and Push

After creating the repository, GitHub will show you commands. But here are the complete steps:

### In your terminal, run these commands:

1. **Initialize Git** (if not already done):
   ```bash
   git init
   ```

2. **Add all files**:
   ```bash
   git add .
   ```

3. **Make your first commit**:
   ```bash
   git commit -m "Initial commit"
   ```

4. **Rename branch to main** (if needed):
   ```bash
   git branch -M main
   ```

5. **Add GitHub as remote** (replace YOUR_USERNAME with your GitHub username):
   ```bash
   git remote add origin https://github.com/YOUR_USERNAME/surgical-techniques-app.git
   ```
   
   **OR if using SSH:**
   ```bash
   git remote add origin git@github.com:YOUR_USERNAME/surgical-techniques-app.git
   ```

6. **Push to GitHub**:
   ```bash
   git push -u origin main
   ```

   You may be asked for your GitHub username and password/token.

## Authentication Note

GitHub no longer accepts passwords for HTTPS. You'll need either:

### Option A: Personal Access Token (Recommended)
1. Go to GitHub → Settings → Developer settings → Personal access tokens → Tokens (classic)
2. Generate new token
3. Give it repo permissions
4. Use the token as your password when pushing

### Option B: SSH Keys (Better long-term)
1. Generate SSH key: `ssh-keygen -t ed25519 -C "your_email@example.com"`
2. Add to GitHub: Settings → SSH and GPG keys → New SSH key
3. Use the SSH URL format above

## Step 3: Verify

Go to your GitHub repository page - you should see all your files!

## Next Steps

After pushing to GitHub, you can:
- Connect to Cloudflare Pages (see DEPLOYMENT.md)
- Share your code with others
- Track changes and collaborate

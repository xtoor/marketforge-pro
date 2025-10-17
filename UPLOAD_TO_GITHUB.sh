#!/bin/bash
#
# MarketForge Pro - GitHub Upload Script
# Run this script to upload the repository to GitHub
#

echo "================================================"
echo "  MarketForge Pro - GitHub Upload"
echo "================================================"
echo ""
echo "Repository: https://github.com/xtoor/marketforge-pro"
echo "Branch: main"
echo ""

# Check if we're in the right directory
if [ ! -f "README.md" ]; then
    echo "ERROR: Please run this script from the project root directory"
    exit 1
fi

# Check if git is initialized
if [ ! -d ".git" ]; then
    echo "Git repository already initialized ✓"
else
    echo "Git repository already initialized ✓"
fi

# Check if remote is added
if git remote | grep -q origin; then
    echo "Remote 'origin' already added ✓"
else
    echo "Adding remote..."
    git remote add origin https://github.com/xtoor/marketforge-pro.git
fi

echo ""
echo "Current status:"
git log --oneline -1
echo ""
echo "Files committed: $(git ls-files | wc -l)"
echo ""

# Try to push
echo "Attempting to push to GitHub..."
echo ""
echo "NOTE: You will be prompted for your GitHub credentials."
echo "      Use a Personal Access Token (PAT) instead of password."
echo ""
echo "To create a PAT:"
echo "  1. Go to: https://github.com/settings/tokens"
echo "  2. Click 'Generate new token (classic)'"
echo "  3. Select scopes: 'repo' (full control)"
echo "  4. Copy the token and use it as your password"
echo ""

read -p "Press Enter to continue with push..."

git push -u origin main

if [ $? -eq 0 ]; then
    echo ""
    echo "================================================"
    echo "  ✅ SUCCESS! Repository uploaded to GitHub"
    echo "================================================"
    echo ""
    echo "View your repository at:"
    echo "https://github.com/xtoor/marketforge-pro"
    echo ""
    echo "Next steps:"
    echo "1. Add repository description and topics on GitHub"
    echo "2. Create a release (v1.0.0)"
    echo "3. Upload Windows installer to releases"
    echo "4. Enable GitHub Actions"
    echo "5. Configure branch protection"
    echo ""
else
    echo ""
    echo "================================================"
    echo "  ⚠️  Push failed - Authentication required"
    echo "================================================"
    echo ""
    echo "Alternative methods to push:"
    echo ""
    echo "Method 1: SSH (Recommended)"
    echo "  1. Set up SSH key: https://docs.github.com/en/authentication"
    echo "  2. Change remote to SSH:"
    echo "     git remote set-url origin git@github.com:xtoor/marketforge-pro.git"
    echo "  3. Push: git push -u origin main"
    echo ""
    echo "Method 2: GitHub CLI (gh)"
    echo "  1. Install: https://cli.github.com/"
    echo "  2. Login: gh auth login"
    echo "  3. Push: git push -u origin main"
    echo ""
    echo "Method 3: Personal Access Token"
    echo "  1. Create token at: https://github.com/settings/tokens"
    echo "  2. Use token as password when prompted"
    echo ""
fi

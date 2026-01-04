# GitHub Remote Data Setup

I have configured your extension to fetch data from: `https://github.com/upampatra/CardOptimiser`

## Final Step: Push Your Code
To make these URLs work, you need to push your code to GitHub.

Run these commands in your terminal:

```bash
# 1. Initialize Git (if not done)
git init
git branch -M main

# 2. Add your files
git add .
git commit -m "Initial release of Card Optimiser"

# 3. Connect to your repo
git remote add origin https://github.com/upampatra/CardOptimiser.git

# 4. Push
git push -u origin main
```

> [!IMPORTANT]
> Make sure the repository `CardOptimiser` is **Public** so the extension can read the raw JSON files without an API key.

## How to Update Offers Later
When you want to add a new card offer in the future:
1.  Open `data/offers.json` on your computer.
2.  Add the offer details.
3.  Run:
    ```bash
    git add data/offers.json
    git commit -m "Added Diwali offers"
    git push
    ```
4.  All users of your extension will automatically get the new offers next time they open your extension!

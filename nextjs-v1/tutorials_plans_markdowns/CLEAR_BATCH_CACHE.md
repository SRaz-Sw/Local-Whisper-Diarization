# Clear Batch Upload Cache

To fix the batch upload issues, please clear the cached state:

1. Open your browser's Developer Tools (F12)
2. Go to the **Console** tab
3. Run this command:

```javascript
localStorage.removeItem("batch-store");
location.reload();
```

This will:

- Clear the old persisted batch state
- Reload the page with fresh state
- Fix the "whisper-base" model issue
- Fix the file assignment tracking

After this, try uploading files in batch mode again. The progress should
now update properly!

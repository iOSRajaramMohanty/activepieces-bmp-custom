# Backend Setup for SDK Testing

## Current Status

The Activepieces backend API needs to be running on `http://localhost:3000` for the SDK to work properly.

## Starting the Backend

### Option 1: Use dev-local script (Recommended)
```bash
cd /Users/rajarammohanty/Documents/POC/activepieces
./scripts/dev-local.sh start
```

Wait 30-60 seconds, then check status:
```bash
./scripts/dev-local.sh status
```

### Option 2: Start backend directly
```bash
cd /Users/rajarammohanty/Documents/POC/activepieces
npx nx serve server-api
```

## Verification

Once backend is running, verify it's accessible:
```bash
curl http://localhost:3000/api/v1/flags
```

Or check in browser: `http://localhost:3000/api/v1/flags`

## Expected Status

When everything is running:
```
✅ Backend API: ✅ Running on http://localhost:3000
✅ Engine:      ✅ Running
✅ Frontend UI: ✅ Running on http://localhost:4200
```

## Troubleshooting

If backend fails to start:
1. Check logs: `tail -f dev-local.log`
2. Verify PostgreSQL is running on port 5433
3. Verify Redis is running on port 6379
4. Check if port 3000 is already in use: `lsof -i :3000`

## Testing SDK After Backend Starts

1. Ensure backend is running: `./scripts/dev-local.sh status`
2. Refresh Angular app in browser: `http://localhost:4200`
3. Check browser console - API calls should succeed
4. Verify React UI components render correctly

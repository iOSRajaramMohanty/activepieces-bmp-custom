# Runtime Verification Guide

## Testing the SDK Integration

### 1. Check Browser Console

Open `http://localhost:4200` in your browser and check the console for:

**Expected Logs:**
```
🔄 Starting SDK import...
✅ SDK imported successfully
📦 SDK exports: [ReactUIWrapperComponent, ReactUIWrapperModule, ...]
✅ ReactUIWrapperComponent found: function
✅ Component created successfully
```

**If Errors Occur:**
- Check the error message and stack trace
- Verify React and ReactDOM are loaded (should be available in Angular app)
- Check network tab for failed module loads

### 2. Verify Component Rendering

After successful import, you should see:
- The heading "Activepieces React UI SDK Test"
- React UI components rendering below (if API is configured)

### 3. Common Issues

**Issue: "Cannot read properties of undefined (reading 'ReactCurrentOwner')"**
- **Cause**: React not loaded or wrong version
- **Solution**: Ensure React 18+ is installed in Angular app

**Issue: "Module not found"**
- **Cause**: Bundle path incorrect or package.json misconfigured
- **Solution**: Check `node_modules/@activepieces/react-ui-sdk/` exists and has `index.js`

**Issue: "ReactUIWrapperComponent is not a constructor"**
- **Cause**: Export format mismatch
- **Solution**: Verify bundle exports ES module format correctly

### 4. Manual Verification Steps

1. **Open Browser DevTools** (F12)
2. **Go to Console tab**
3. **Look for SDK import logs**
4. **Check Network tab** for `@activepieces/react-ui-sdk` module load
5. **Inspect Elements** to see if React components rendered

### 5. API Configuration

The component expects:
- `apiUrl`: Activepieces API URL (default: `http://localhost:3000`)
- `token`: Authentication token
- `projectId`: Project ID (optional)
- `flowId`: Flow ID (optional, for flow-builder)
- `component`: Component name ('dashboard', 'flow-builder', etc.)

### 6. Next Steps

Once runtime verification passes:
- Test each component type (dashboard, flow-builder, connections, etc.)
- Verify API connectivity
- Test with real Activepieces backend
- Check React UI rendering and interactions

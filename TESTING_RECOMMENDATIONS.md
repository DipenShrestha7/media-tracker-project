# 🧪 Recommendation System Testing Guide

## Prerequisites

- All 3 services running: Frontend (5173), Backend (8001), AI Service (8000)
- Environment variables set for `AI_SERVICE_URL` (should be `http://localhost:8000`)
- User logged in with items in library

## Testing Checklist

### 1. **Test Library Items First**

- [ ] Login to app
- [ ] Go to `/library`
- [ ] Add 2-3 movies/shows/anime from `/explore`
- [ ] Verify items appear in Library with status filters working
- [ ] Note: Library must have at least 1 item for personalized recommendations

### 2. **Backend → AI Service Connection**

- [ ] Backend logs should show: `[RECOMMEND] Processing library with X items`
- [ ] Check AI Service logs for: `[RECOMMEND] Got result: {...}`
- [ ] If no logs appear:
  - Verify `AI_SERVICE_URL` env var in `.env` file
  - Check both services are running: `curl http://localhost:8000/health`
  - Check backend console for connection errors

### 3. **Frontend Recommendations Page**

- [ ] Click "Get Recommendations" button in Library header (purple button)
- [ ] Should navigate to `/recommendations` page
- [ ] Loading state should show 8 skeleton cards
- [ ] After ~5-10s, recommendations should load
- [ ] If error appears:
  - Check browser console (F12) for fetch errors
  - Check Network tab for response status
  - Verify token is valid

### 4. **Recommendation Grid Display**

- [ ] Verify each card shows:
  - [ ] Title (required)
  - [ ] Year (fallback to "N/A")
  - [ ] Genre tags (optional)
  - [ ] Rating with star (if available)
  - [ ] "Add to Library" button
- [ ] Click "Add to Library" on a recommendation
  - [ ] Button should change to "✓ Added" (green)
  - [ ] Item should appear in your Library after page refresh
  - [ ] Success persists for 2 seconds then resets

### 5. **Refresh Button**

- [ ] Click "Refresh" button (purple)
- [ ] Should re-fetch recommendations (may be same if library hasn't changed)
- [ ] Loading spinner should animate during fetch

### 6. **Empty Library Scenario**

- [ ] Create new user / clear library
- [ ] Go to Recommendations
- [ ] Should see message: "Add items to your library to get personalized recommendations"
- [ ] AI Service should provide generic top-rated recommendations

### 7. **Error Handling**

Test these failure scenarios:

**Session Expired**:

- [ ] Clear `nexus_token` from localStorage
- [ ] Refresh `/recommendations`
- [ ] Should show login prompt or error

**AI Service Down**:

- [ ] Stop AI Service
- [ ] Try fetching recommendations
- [ ] Should show error: "Failed to load recommendations"
- [ ] Check browser console for "Connection refused"

**Empty Response**:

- [ ] If AI returns 0 recommendations
- [ ] Should show: "No recommendations could be generated. Try adding more items..."

---

## API Endpoints to Verify

### Backend → AI Service Call

```bash
curl -X POST http://localhost:8001/api/recommendations \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json"
```

**Expected Response**:

```json
{
  "response": "Found X recommendations based on your library.",
  "conversation_id": "uuid",
  "metadata": {
    "status": "success",
    "recommendations": [
      {
        "title": "Movie Title",
        "year": 2024,
        "type": "movie",
        "source_hint": "OMDB"
      }
    ],
    "count": X
  }
}
```

### AI Service Endpoint

```bash
curl -X POST http://localhost:8000/api/v1/recommend \
  -H "Content-Type: application/json" \
  -d '{
    "user_library": [
      {
        "title": "Interstellar",
        "type": "movie",
        "genres": ["sci-fi", "drama"],
        "year": 2014,
        "user_rating": 8.6
      }
    ]
  }'
```

---

## Debugging Logs to Check

### AI Service Logs (should show)

```
[RECOMMEND] Processing library with 3 items
[RECOMMEND] Got result: {'candidates': [...], 'messages': [...]}
[RECOMMEND] Extracted 10 candidates
```

### Backend Logs (should show)

- `POST /api/recommendations` called
- Database save confirmation
- Response sent to client

### Frontend Console (F12 > Console)

- Check for fetch errors
- Verify response structure
- Token present in localStorage

---

## Common Issues & Fixes

| Issue                          | Cause                  | Fix                                      |
| ------------------------------ | ---------------------- | ---------------------------------------- |
| "Session expired"              | Token invalid/missing  | Login again, check localStorage          |
| "No recommendations available" | AI returned empty      | Check library has items, AI service logs |
| Nested button error            | Fixed                  | Refresh page (should be gone)            |
| Posters not loading            | External URL timeout   | Some posters fail; fallback text shows   |
| Backend won't reach AI         | Wrong AI_SERVICE_URL   | Check .env, verify both services running |
| Recommendations blank grid     | Response parsing error | Check browser Network tab response       |

---

## Success Indicators

✅ **System is working if**:

1. Library page loads with your saved items
2. "Get Recommendations" button navigates to `/recommendations`
3. Grid loads with 5-15 media items (even without posters)
4. "Add to Library" button works and saves items
5. Refresh button fetches new batch
6. No JavaScript errors in console
7. Backend logs show processing
8. AI Service logs show candidates extracted

---

## Next Steps After Verification

Once working:

- [ ] Test with 10+ library items for better personalization
- [ ] Add caching to avoid repeated AI calls
- [ ] Integrate recommendation refresh interval
- [ ] Add filters to recommendation grid (by type, genre)
- [ ] Show recommendation confidence/reasoning

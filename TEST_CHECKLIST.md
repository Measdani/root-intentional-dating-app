# Message Sync Test Checklist

## Prerequisites
- Clear browser localStorage before testing
- Open DevTools Console to monitor logs

## Test 1: Maya → Alex Message Flow

### Step 1: Login as Maya
1. Go to app and click demo login: **Maya (Passed Assessment)**
2. Email: `maya@test.com` | User ID: `u1`
3. Go to **Browse** section
4. Find **Alex** in the profiles
5. Click on Alex's profile

### Step 2: Send Message from Maya
1. Click "Express Interest" button
2. Enter message: **"Hi Alex, I'm interested in getting to know you better!"** (must be 120+ chars)
3. Click Send
4. **Verify in DevTools Console:**
   - Look for: `expressInterest called: { toUserId: "u7", ... }`
   - Look for: `✅ Interactions saved successfully to localStorage`
   - Look for: `Saved JSON: {... sentInterests: {"u7": { fromUserId: "u1", toUserId: "u7", ... } }`

### Step 3: Open Inbox as Maya
1. Click **Inbox** (mail icon)
2. Click **Sent** tab
3. **Verify:** You see Alex's entry with badge "Message Sent"
4. Click on Alex's message
5. **Verify:** Message appears with your text

### Step 4: Login as Alex (New Tab or After Logout)
1. Open new tab or go back to login
2. Click demo login: **Alex (Passed Assessment)**
3. Email: `alex@test.com` | User ID: `u7`
4. **Verify in DevTools Console:**
   - Look for: `useEffect triggered: reloading interactions for user u7`
   - Look for: `Retrieved from localStorage: {...sentInterests: {"u7": ...}}`
   - Look for: `✅ Interactions reloaded for user u7`

### Step 5: Open Inbox as Alex
1. Click **Inbox** (mail icon)
2. **Verify:** Auto-opens **Received** tab (default)
3. **Verify:** You see **Maya's** entry with badge "Respond"
4. Click on Maya's message
5. **Verify:** Message displays with text: "Hi Alex, I'm interested in getting to know you better!"

### Step 6: Alex Responds
1. Click **Respond** button
2. Enter message: **"That's great! I'd love to learn more about you and see what we have in common!"** (120+ chars)
3. Click Send
4. **Verify:** Message appears in conversation

### Step 7: Login as Maya and See Response
1. Logout and login as Maya again
2. Go to **Inbox → Sent**
3. Click on Alex's message
4. **Verify:** You see Alex's response message

## Expected Results

| Action | Expected Result |
|--------|-----------------|
| Maya sends message | Message appears in Maya's Sent tab |
| Alex logs in | Console shows interactions reloaded |
| Alex views Inbox | Maya's message appears in Received tab |
| Alex responds | Response saved to localStorage |
| Maya logs in again | Sees Alex's response in her conversation |

## Troubleshooting

**Problem:** Maya's message doesn't appear in Alex's Received tab
- **Check:** Is currentUser.id actually "u7" after login?
- **Check:** Look for "Interactions reloaded" log in console
- **Check:** Search localStorage for "rooted_shared_interactions" - does it contain Maya's message?

**Problem:** Messages not saving to localStorage
- **Check:** Look for "Interactions saved successfully" in console
- **Check:** Verify message is at least 120 characters

**Problem:** Alex sees message in wrong tab
- **Check:** Verify conversationId is deterministic: `conv_u1_u7`
- **Check:** Verify message has correct fromUserId and toUserId

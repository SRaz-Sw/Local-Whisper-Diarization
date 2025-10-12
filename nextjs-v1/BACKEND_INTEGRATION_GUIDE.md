# 🔌 Backend Integration Guide - Web + Electron

Complete guide for adding a backend to save transcripts that works in both browser and Electron.

## 🎯 Architecture Overview

### The Challenge

- **Web App**: Can use Next.js API routes OR external API
- **Electron App**: Static export - CANNOT use Next.js API routes
- **Solution**: Use external API that both can access

### Recommended Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                                                               │
│  Browser App              Electron App                       │
│  (Next.js)                (Static Export)                    │
│       │                         │                            │
│       │                         │                            │
│       └─────────┬───────────────┘                            │
│                 │                                             │
│                 ▼                                             │
│         Service Layer (Abstraction)                          │
│                 │                                             │
│                 ▼                                             │
│         External API Server                                  │
│         (Node.js / Python / Any)                             │
│                 │                                             │
│                 ▼                                             │
│            Database                                           │
│         (PostgreSQL / MongoDB / etc.)                        │
│                                                               │
└─────────────────────────────────────────────────────────────┘
```

---

## 🚀 Quick Implementation Guide

### Step 1: Create Service Abstraction Layer

Create a service that handles all API calls:

```typescript
// src/lib/services/transcript-service.ts

interface TranscriptData {
  id?: string;
  text: string;
  chunks: any[];
  segments: any[];
  language: string;
  duration: number;
  fileName: string;
  createdAt?: Date;
}

class TranscriptService {
  private apiUrl: string;

  constructor() {
    // Use environment variable for API URL
    this.apiUrl =
      process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000";
  }

  // Save transcript to backend
  async saveTranscript(data: TranscriptData): Promise<{ id: string }> {
    try {
      const response = await fetch(`${this.apiUrl}/api/transcripts`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${this.getAuthToken()}`,
        },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        throw new Error("Failed to save transcript");
      }

      return await response.json();
    } catch (error) {
      console.error("Error saving transcript:", error);
      // Fallback to local storage if API fails
      return this.saveToLocalStorage(data);
    }
  }

  // Get all transcripts
  async getTranscripts(): Promise<TranscriptData[]> {
    try {
      const response = await fetch(`${this.apiUrl}/api/transcripts`, {
        headers: {
          Authorization: `Bearer ${this.getAuthToken()}`,
        },
      });

      if (!response.ok) {
        throw new Error("Failed to fetch transcripts");
      }

      return await response.json();
    } catch (error) {
      console.error("Error fetching transcripts:", error);
      // Fallback to local storage
      return this.getFromLocalStorage();
    }
  }

  // Get single transcript
  async getTranscript(id: string): Promise<TranscriptData | null> {
    try {
      const response = await fetch(
        `${this.apiUrl}/api/transcripts/${id}`,
        {
          headers: {
            Authorization: `Bearer ${this.getAuthToken()}`,
          },
        },
      );

      if (!response.ok) {
        return null;
      }

      return await response.json();
    } catch (error) {
      console.error("Error fetching transcript:", error);
      return null;
    }
  }

  // Delete transcript
  async deleteTranscript(id: string): Promise<boolean> {
    try {
      const response = await fetch(
        `${this.apiUrl}/api/transcripts/${id}`,
        {
          method: "DELETE",
          headers: {
            Authorization: `Bearer ${this.getAuthToken()}`,
          },
        },
      );

      return response.ok;
    } catch (error) {
      console.error("Error deleting transcript:", error);
      return false;
    }
  }

  // Local storage fallback (for offline Electron)
  private async saveToLocalStorage(
    data: TranscriptData,
  ): Promise<{ id: string }> {
    const id = `local-${Date.now()}`;
    const transcripts = this.getFromLocalStorage();
    transcripts.push({ ...data, id, createdAt: new Date() });
    localStorage.setItem("transcripts", JSON.stringify(transcripts));
    return { id };
  }

  private getFromLocalStorage(): TranscriptData[] {
    try {
      const data = localStorage.getItem("transcripts");
      return data ? JSON.parse(data) : [];
    } catch {
      return [];
    }
  }

  // Auth token management
  private getAuthToken(): string | null {
    if (typeof window !== "undefined") {
      return localStorage.getItem("auth_token");
    }
    return null;
  }

  // Check if online
  async isOnline(): Promise<boolean> {
    try {
      const response = await fetch(`${this.apiUrl}/health`, {
        method: "HEAD",
        cache: "no-cache",
      });
      return response.ok;
    } catch {
      return false;
    }
  }
}

// Export singleton instance
export const transcriptService = new TranscriptService();
```

### Step 2: Environment Configuration

Create environment files:

```bash
# .env.local (for development)
NEXT_PUBLIC_API_URL=http://localhost:4000

# .env.production (for production)
NEXT_PUBLIC_API_URL=https://api.yourapp.com
```

### Step 3: Use in Components

```typescript
// src/app/web-transc/components/WhisperDiarization.tsx

import { transcriptService } from "@/lib/services/transcript-service";

export default function WhisperDiarization() {
  const [transcripts, setTranscripts] = useState<any[]>([]);

  // Save transcript after completion
  const handleTranscriptionComplete = async (result: any) => {
    try {
      const saved = await transcriptService.saveTranscript({
        text: result.transcript.text,
        chunks: result.transcript.chunks,
        segments: result.segments,
        language: selectedLanguage,
        duration: audioElement?.duration || 0,
        fileName: audioFile?.name || "Unknown",
      });

      console.log("Transcript saved:", saved.id);

      // Refresh transcript list
      loadTranscripts();
    } catch (error) {
      console.error("Failed to save transcript:", error);
    }
  };

  // Load transcripts
  const loadTranscripts = async () => {
    const data = await transcriptService.getTranscripts();
    setTranscripts(data);
  };

  useEffect(() => {
    loadTranscripts();
  }, []);

  // ... rest of component
}
```

---

## 🌐 Backend Options

### Option 1: Separate Node.js Server (Recommended)

**Pros:**

- ✅ Works with both web and Electron
- ✅ Can be deployed separately
- ✅ Scalable and maintainable
- ✅ Use any database

**Cons:**

- ❌ Requires separate deployment
- ❌ More infrastructure to manage

**Example Structure:**

```
backend/
├── server.js                 # Express/Fastify server
├── routes/
│   └── transcripts.js        # Transcript routes
├── models/
│   └── Transcript.js         # Database model
├── middleware/
│   └── auth.js               # Authentication
└── package.json
```

**Quick Setup:**

```bash
# Create backend directory
mkdir backend
cd backend

# Initialize
npm init -y

# Install dependencies
npm install express cors dotenv mongodb # or pg for PostgreSQL

# Create server
touch server.js
```

```javascript
// backend/server.js
const express = require("express");
const cors = require("cors");
const app = express();

app.use(cors());
app.use(express.json());

// Health check
app.head("/health", (req, res) => res.sendStatus(200));

// Save transcript
app.post("/api/transcripts", async (req, res) => {
  try {
    // Save to database
    const transcript = await db.transcripts.insert(req.body);
    res.json({ id: transcript.id });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get all transcripts
app.get("/api/transcripts", async (req, res) => {
  try {
    const transcripts = await db.transcripts.find();
    res.json(transcripts);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.listen(4000, () => {
  console.log("API running on http://localhost:4000");
});
```

### Option 2: Serverless Functions (Vercel/Netlify)

**Pros:**

- ✅ Easy deployment
- ✅ Auto-scaling
- ✅ Low maintenance

**Cons:**

- ❌ May have cold starts
- ❌ Can be more expensive at scale

**Setup:**

```typescript
// api/transcripts.ts (Vercel)
import { NextApiRequest, NextApiResponse } from "next";

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse,
) {
  if (req.method === "POST") {
    // Save transcript
    const transcript = await db.transcripts.create(req.body);
    return res.json({ id: transcript.id });
  }

  if (req.method === "GET") {
    // Get transcripts
    const transcripts = await db.transcripts.findAll();
    return res.json(transcripts);
  }
}
```

### Option 3: Firebase/Supabase

**Pros:**

- ✅ Backend-as-a-Service
- ✅ Authentication included
- ✅ Real-time updates
- ✅ Works in both environments

**Cons:**

- ❌ Vendor lock-in
- ❌ Can be expensive at scale

**Setup:**

```bash
npm install firebase
# or
npm install @supabase/supabase-js
```

```typescript
// src/lib/firebase.ts
import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  // ... other config
};

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);

// Save transcript
import { collection, addDoc } from "firebase/firestore";

export async function saveTranscript(data: any) {
  const docRef = await addDoc(collection(db, "transcripts"), data);
  return { id: docRef.id };
}
```

---

## 🔐 Authentication Strategy

### Option 1: JWT Tokens (Recommended)

**Works in both web and Electron:**

```typescript
// src/lib/auth/auth-service.ts

class AuthService {
  async login(
    email: string,
    password: string,
  ): Promise<{ token: string }> {
    const response = await fetch(`${API_URL}/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    });

    const { token } = await response.json();

    // Store in localStorage (works in both web and Electron)
    localStorage.setItem("auth_token", token);

    return { token };
  }

  async logout(): Promise<void> {
    localStorage.removeItem("auth_token");
  }

  getToken(): string | null {
    return localStorage.getItem("auth_token");
  }

  isAuthenticated(): boolean {
    return !!this.getToken();
  }
}

export const authService = new AuthService();
```

### Option 2: OAuth (Google, GitHub, etc.)

**Slightly different for Electron:**

```typescript
// Web: Standard OAuth flow
// Electron: Use electron-oauth2 package

import { BrowserWindow } from "electron"; // In main process

// Electron OAuth
function authenticateWithGoogle() {
  const authWindow = new BrowserWindow({
    width: 500,
    height: 600,
  });

  authWindow.loadURL("https://accounts.google.com/o/oauth2/auth?...");

  // Handle callback
  authWindow.webContents.on("will-redirect", (event, url) => {
    // Extract token from URL
    const token = extractToken(url);
    // Store token
  });
}
```

---

## 💾 Local Storage + Sync Strategy

### Best Practice: Hybrid Approach

**Use both local storage AND remote backend:**

```typescript
// src/lib/services/sync-service.ts

class SyncService {
  // Save locally first, then sync
  async saveTranscript(data: TranscriptData): Promise<{ id: string }> {
    // 1. Save to localStorage immediately (offline-first)
    const localId = this.saveToLocal(data);

    // 2. Try to sync to backend
    try {
      if (await this.isOnline()) {
        const { id: remoteId } =
          await transcriptService.saveTranscript(data);

        // 3. Update local with remote ID
        this.updateLocalId(localId, remoteId);

        return { id: remoteId };
      }
    } catch (error) {
      console.log("Offline - will sync later");
    }

    return { id: localId };
  }

  // Sync all pending transcripts
  async syncPending(): Promise<void> {
    const pending = this.getPendingSync();

    for (const transcript of pending) {
      try {
        await transcriptService.saveTranscript(transcript);
        this.markSynced(transcript.id);
      } catch (error) {
        console.error("Sync failed for:", transcript.id);
      }
    }
  }

  // Auto-sync on network reconnect
  startAutoSync(): void {
    window.addEventListener("online", () => {
      console.log("Network reconnected - syncing...");
      this.syncPending();
    });
  }
}

export const syncService = new SyncService();
```

---

## 🎨 UI for Transcript History

### Add History Component

```typescript
// src/app/web-transc/components/TranscriptHistory.tsx

import { useState, useEffect } from 'react';
import { transcriptService } from '@/lib/services/transcript-service';

export function TranscriptHistory() {
  const [transcripts, setTranscripts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadTranscripts();
  }, []);

  const loadTranscripts = async () => {
    setLoading(true);
    const data = await transcriptService.getTranscripts();
    setTranscripts(data);
    setLoading(false);
  };

  const handleDelete = async (id: string) => {
    if (confirm('Delete this transcript?')) {
      await transcriptService.deleteTranscript(id);
      loadTranscripts();
    }
  };

  if (loading) return <div>Loading history...</div>;

  return (
    <div className="transcript-history">
      <h2>Previous Transcripts</h2>
      {transcripts.map((t) => (
        <div key={t.id} className="transcript-item">
          <div>
            <strong>{t.fileName}</strong>
            <span>{new Date(t.createdAt).toLocaleDateString()}</span>
          </div>
          <div>
            <button onClick={() => handleView(t)}>View</button>
            <button onClick={() => handleDelete(t.id)}>Delete</button>
          </div>
        </div>
      ))}
    </div>
  );
}
```

---

## 🔄 Migration from Client-Only

### Step-by-Step Migration

**1. Add service layer (no breaking changes)**

```typescript
// Keep existing client-only code
// Add new service layer alongside
```

**2. Add optional backend saving**

```typescript
// In your component
const handleComplete = async (result: any) => {
  // Existing: Export to JSON
  exportToJSON(result);

  // New: Also save to backend (optional)
  if (backendEnabled) {
    await transcriptService.saveTranscript(result);
  }
};
```

**3. Add UI toggle**

```typescript
const [backendEnabled, setBackendEnabled] = useState(false);

// In settings
<label>
  <input
    type="checkbox"
    checked={backendEnabled}
    onChange={(e) => setBackendEnabled(e.target.checked)}
  />
  Save transcripts to cloud
</label>
```

**4. Gradual rollout**

- Phase 1: Backend optional (default off)
- Phase 2: Backend optional (default on)
- Phase 3: Backend always on

---

## 🛠️ Complete Example

### Backend Server (Express)

```javascript
// backend/server.js
const express = require("express");
const cors = require("cors");
const { MongoClient } = require("mongodb");

const app = express();
app.use(cors());
app.use(express.json({ limit: "50mb" }));

const mongoClient = new MongoClient(process.env.MONGO_URL);
let db;

// Connect to database
mongoClient.connect().then(() => {
  db = mongoClient.db("whisper");
  console.log("Connected to MongoDB");
});

// Health check
app.head("/health", (req, res) => res.sendStatus(200));

// Save transcript
app.post("/api/transcripts", async (req, res) => {
  try {
    const result = await db.collection("transcripts").insertOne({
      ...req.body,
      createdAt: new Date(),
    });

    res.json({ id: result.insertedId });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get all transcripts
app.get("/api/transcripts", async (req, res) => {
  try {
    const transcripts = await db
      .collection("transcripts")
      .find()
      .sort({ createdAt: -1 })
      .limit(100)
      .toArray();

    res.json(transcripts);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get single transcript
app.get("/api/transcripts/:id", async (req, res) => {
  try {
    const { ObjectId } = require("mongodb");
    const transcript = await db
      .collection("transcripts")
      .findOne({ _id: new ObjectId(req.params.id) });

    if (!transcript) {
      return res.status(404).json({ error: "Not found" });
    }

    res.json(transcript);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Delete transcript
app.delete("/api/transcripts/:id", async (req, res) => {
  try {
    const { ObjectId } = require("mongodb");
    await db
      .collection("transcripts")
      .deleteOne({ _id: new ObjectId(req.params.id) });

    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.listen(4000, () => {
  console.log("API server running on http://localhost:4000");
});
```

### Deploy Backend

```bash
# Option 1: Vercel
vercel deploy

# Option 2: Railway
railway up

# Option 3: Heroku
git push heroku main

# Option 4: DigitalOcean App Platform
doctl apps create --spec .do/app.yaml
```

---

## ✅ Best Practices Checklist

### Architecture

- [ ] Use external API (not Next.js API routes)
- [ ] Create service abstraction layer
- [ ] Use environment variables for API URL
- [ ] Implement offline-first approach
- [ ] Add sync mechanism for offline transcripts

### Security

- [ ] Use HTTPS in production
- [ ] Implement authentication (JWT/OAuth)
- [ ] Validate input on backend
- [ ] Add rate limiting
- [ ] Use CORS properly

### User Experience

- [ ] Save locally first (instant feedback)
- [ ] Sync to backend in background
- [ ] Show sync status in UI
- [ ] Handle network errors gracefully
- [ ] Provide offline mode

### Testing

- [ ] Test in browser (online)
- [ ] Test in browser (offline)
- [ ] Test in Electron (online)
- [ ] Test in Electron (offline)
- [ ] Test sync after reconnection

### Deployment

- [ ] Deploy backend separately
- [ ] Use environment variables
- [ ] Set up monitoring
- [ ] Configure backups
- [ ] Document API endpoints

---

## 📊 Comparison: Storage Options

| Option           | Web | Electron | Offline    | Sync    | Cost |
| ---------------- | --- | -------- | ---------- | ------- | ---- |
| **Local Only**   | ✅  | ✅       | ✅         | ❌      | Free |
| **External API** | ✅  | ✅       | ⚠️ Partial | ✅      | $$   |
| **Firebase**     | ✅  | ✅       | ✅         | ✅ Auto | $$$  |
| **Supabase**     | ✅  | ✅       | ✅         | ✅ Auto | $$   |
| **Next.js API**  | ✅  | ❌       | ❌         | N/A     | $    |

**Recommendation:** External API + Local Storage (hybrid)

---

## 🚀 Quick Start Commands

```bash
# 1. Create backend
mkdir backend
cd backend
npm init -y
npm install express cors mongodb dotenv

# 2. Create service layer in frontend
mkdir -p src/lib/services
touch src/lib/services/transcript-service.ts

# 3. Add environment variables
echo "NEXT_PUBLIC_API_URL=http://localhost:4000" > .env.local

# 4. Start backend
cd backend
node server.js

# 5. Start frontend
cd ..
bun dev
```

---

## 🎯 Summary

### Key Principle

> **Use external API + Local storage for best of both worlds**

### Architecture

```
Browser/Electron → Service Layer → External API → Database
                       ↓
                  Local Storage (offline)
```

### Benefits

- ✅ Works in web and Electron
- ✅ Offline-first approach
- ✅ Sync when online
- ✅ No vendor lock-in
- ✅ Scalable

---

**Need help?** Check out:

- Firebase docs: https://firebase.google.com/docs
- Supabase docs: https://supabase.com/docs
- Express docs: https://expressjs.com/




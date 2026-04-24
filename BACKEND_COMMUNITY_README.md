# Community Backend — Port 5000

This is the second backend server for Aabha. It handles the community feature — a public feed where users can report safety incidents, upload photos or videos of locations, and browse reports by others. It connects to **MongoDB Atlas** (cloud) and uses **Cloudinary** for media storage.

This server is completely independent of the SQL backend. It does not share a database, does not call the SQL backend, and does not validate JWTs (authentication for the community feature is handled by checking `AsyncStorage` on the frontend side).

---

## Directory Structure

```
backend/community/src/
├── index.js                            ← Entry point
├── .env                                ← MongoDB URI + Cloudinary credentials
├── package.json
│
├── config/
│   └── cloudinary.js                   ← Cloudinary SDK setup + Multer storage adapter
│
├── models/community/
│   └── Post.js                         ← Mongoose schema for a community post
│
├── controllers/community/
│   └── postController.js               ← createPost and getPosts handlers
│
└── routes/community/
    └── postRoutes.js                   ← Route bindings for /api/community/posts
```

---

## What Each File Does

### `index.js`
The application entry point. It:

1. Loads environment variables from `.env` (the `.env` file sits in the same `src/` directory).
2. Creates an Express 5 app and applies CORS and JSON body parsing middleware.
3. Mounts the community post routes at `/api/community`.
4. Connects to MongoDB Atlas using the `MONGODB_URI` from `.env` via Mongoose. Logs success or failure to the console.
5. Starts listening on port `5000` (or `process.env.PORT` if set differently).

### `config/cloudinary.js`
Configures three things:

- **Cloudinary SDK**: Reads `CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`, and `CLOUDINARY_API_SECRET` from `.env` and passes them to `cloudinary.config()`.
- **CloudinaryStorage (Multer adapter)**: Tells Multer to upload incoming files directly to Cloudinary instead of the local disk. Files are stored in the `aabha-community` folder in your Cloudinary account. Allowed formats are `jpg`, `jpeg`, `png`, and `mp4`.
- **Multer instance**: A configured `upload` object is exported. The post route uses `upload.single('media')` to handle one file per request under the field name `media`.

Exports: `{ cloudinary, upload }`

### `models/community/Post.js`
Defines the Mongoose schema for a community incident report. Fields:

| Field | Type | Required | Description |
|---|---|---|---|
| `authorId` | String | Yes | The user's ID from the SQL backend (stored as a string) |
| `authorName` | String | Yes | Display name of the poster |
| `location` | GeoJSON Point | No | `{ type: 'Point', coordinates: [longitude, latitude] }` |
| `address` | String | Yes | Human-readable location, e.g. "Koramangala, Bangalore" |
| `description` | String | Yes | What happened |
| `harasserDetails` | String | No | Optional description of the harasser |
| `mediaUrl` | String | No | Cloudinary URL of an uploaded image or video |
| `safetyRating` | Number (1–5) | No | User's safety rating for the location |
| `createdAt` | Date | — | Auto-set to current time on creation |

A `2dsphere` geospatial index is created on the `location` field, which enables future "posts near me" queries using MongoDB's `$near` operator.

### `controllers/community/postController.js`
Contains two exported handler functions:

- **`createPost`**: Extracts `authorId`, `authorName`, `address`, `longitude`, `latitude`, `description`, `harasserDetails`, and `safetyRating` from `req.body`. If a file was uploaded via Multer (`req.file`), its Cloudinary URL is pulled from `req.file.path`. Validates that `authorId`, `authorName`, `address`, and `description` are all present. Only attaches the `location` GeoJSON object if both `longitude` and `latitude` are provided — this prevents MongoDB from throwing a `2dsphere` index error when coordinates are missing. Saves the post and returns the created document.

- **`getPosts`**: Fetches all posts sorted by `createdAt` descending (newest first). Accepts an optional `?authorId=` query parameter to filter posts to a specific user (used by the "My Reports" screen).

### `routes/community/postRoutes.js`
Maps HTTP methods to controller functions for the `/api/community/posts` path:

- `GET /api/community/posts` → `getPosts` (no file upload middleware needed)
- `POST /api/community/posts` → `upload.single('media')` middleware first, then `createPost`

The `upload.single('media')` middleware intercepts the `multipart/form-data` request, uploads the file to Cloudinary, and adds `req.file` to the request object before the controller runs.

---

## Environment Variables

File: `backend/community/src/.env`

```env
PORT=5000

MONGODB_URI=mongodb+srv://<username>:<password>@cluster0.xxxxx.mongodb.net/?retryWrites=true&w=majority&appName=Community

CLOUDINARY_CLOUD_NAME=your_cloud_name
CLOUDINARY_API_KEY=your_api_key
CLOUDINARY_API_SECRET=your_api_secret
```

---

## MongoDB Atlas Setup

1. Create a free account at [cloud.mongodb.com](https://cloud.mongodb.com).
2. Create a new **Project** and then **Build a Cluster** → select the free **M0** tier.
3. Create a **Database User** under **Database Access** (give it read/write privileges).
4. Under **Network Access**, add your IP or use `0.0.0.0/0` to allow all (fine for development).
5. Click **Connect** on your cluster → **Connect your application** → copy the connection string.
6. Replace `<username>` and `<password>` in the connection string with your database user's credentials.
7. Paste the full string into `.env` as `MONGODB_URI`.

MongoDB will automatically create the `posts` collection the first time a post is saved — you do not need to create it manually.

---

## Cloudinary Setup

1. Create a free account at [cloudinary.com](https://cloudinary.com).
2. After logging in, go to the **Dashboard**.
3. Copy the **Cloud name**, **API Key**, and **API Secret** shown there.
4. Paste them into `.env` as `CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`, and `CLOUDINARY_API_SECRET`.

Uploaded files will appear in your Cloudinary Media Library under the folder `aabha-community`.

---

## Install and Run

```bash
cd backend/community/src
npm install
npm run dev      # nodemon — restarts on changes
# or
npm start        # plain node
```

The server listens on port `5000`. Once running, you should see:

```
✅ Connected to MongoDB Atlas
✅ Server is running on port 5000
```

---

## API Endpoints

### `GET /api/community/posts`
Returns all community posts, newest first.

Optional query parameter:
- `?authorId=<userId>` — returns only posts by that user

Response:
```json
{
  "success": true,
  "count": 12,
  "data": [ ... ]
}
```

### `POST /api/community/posts`
Creates a new incident report.

Request must be sent as `multipart/form-data` (to support file upload).

| Field | Type | Required |
|---|---|---|
| `authorId` | text | Yes |
| `authorName` | text | Yes |
| `address` | text | Yes |
| `description` | text | Yes |
| `latitude` | text | No |
| `longitude` | text | No |
| `harasserDetails` | text | No |
| `safetyRating` | text (1–5) | No |
| `media` | file (image/video) | No |

Response:
```json
{
  "success": true,
  "data": { ... created post object ... }
}
```

---

## Notes

- This server does **not** validate JWTs. The `authorId` and `authorName` are passed directly from the frontend, which reads them from `AsyncStorage` after the user has logged in via the SQL backend.
- There is no delete or edit endpoint currently. Posts are permanent once submitted.
- The `2dsphere` index on `location` will only be applied if a valid GeoJSON object is stored. The `createPost` controller guards against storing an empty `location` field, which would cause a MongoDB index error.

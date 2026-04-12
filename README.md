# Smart Quiz App (One Deploy on Vercel)

Projekt je nastavljen za EN deploy na Vercel:
- frontend (Vite build iz `dist`)
- backend API (`/api/*` Vercel serverless funkcije)

## Lokalno

```bash
npm install
npm run dev
```

Lokalni `npm run dev` uporablja Vite + Express (`server/index.js`) za razvoj.

## Vercel Deploy (en deploy)

Deployaj isti repo na Vercel.

### Vercel Environment Variables

Nastavi v Vercel Project Settings -> Environment Variables:

- `DATABASE_URL`
- `JWT_SECRET`
- `ADMIN_EMAIL`
- `GOOGLE_CLIENT_ID`
- `GOOGLE_CLIENT_SECRET`
- `GOOGLE_REDIRECT_URI=https://quiz-app-ten-rouge-47.vercel.app/api/auth/google/callback`
- `FRONTEND_URL=https://quiz-app-ten-rouge-47.vercel.app`
- `CORS_ORIGIN=https://quiz-app-ten-rouge-47.vercel.app`
- `VITE_API_URL=` (prazno)

## Google Cloud Console

OAuth client nastavi:

- Authorized JavaScript origins:
  - `https://quiz-app-ten-rouge-47.vercel.app`
- Authorized redirect URIs:
  - `https://quiz-app-ten-rouge-47.vercel.app/api/auth/google/callback`

## API route-i (Vercel)

- `POST /api/auth/register`
- `POST /api/auth/login`
- `GET /api/auth/google/start`
- `GET /api/auth/google/callback`
- `GET /api/auth/me`
- `PUT /api/auth/profile`
- `GET /api/users`
- `DELETE /api/users/:id`
- `GET /api/health`

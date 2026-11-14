# ShopFest — demo e-commerce store

A small online store built with **Django REST Framework** (backend) and **React + Vite** (frontend).

## What it does

**Shoppers**
- Home page listing products, product page with a multi-photo gallery
- Cart, checkout, order history, profile (details + password)
- On placing an order, a WhatsApp message with the unique order ID (e.g. `ORD-20261113-7K2QX9`) goes to the number given at checkout

**Admins** (`/admin` in the React app)
- Create, edit and delete products and users; view orders and change their status
- Upload product photos — every photo goes through a crop step first
- **Events** (Diwali, Christmas, …): each has its own headline, colours, emoji and optional banner. Products are tagged with events. Activating an event re-themes the home page and lists only that event's products; "Switch to regular" goes back to the full store.

## Run it locally

Backend (Python 3.12+):

```bash
cd backend
python -m venv .venv
.venv\Scripts\activate          # macOS/Linux: source .venv/bin/activate
pip install -r requirements.txt
python manage.py migrate
python manage.py seed_demo      # demo events, 16 products with photos, 2 accounts
python manage.py runserver
```

Frontend (Node.js 20+), in a second terminal:

```bash
cd frontend
npm install
npm run dev
```

Open http://localhost:5173.

| Demo account | Email | Password |
|---|---|---|
| Admin | `admin@shopfest.demo` | `admin12345` |
| Customer | `customer@shopfest.demo` | `demo12345` |

Run the backend tests with `python manage.py test`.

## Run it with Docker

```bash
docker compose up --build
```

Starts Postgres, the backend (http://localhost:8000) and the frontend (http://localhost:5173).

## Tests and deployment pipeline

`.github/workflows/ci-cd.yml` runs on GitHub Actions:

- **Pull request to `main`** — builds both container images and runs the backend tests inside the backend container.
- **Merge to `main`** — repeats those checks, then calls the host's deploy hooks (`BACKEND_DEPLOY_HOOK` and `FRONTEND_DEPLOY_HOOK` repository secrets); the host builds each container from its Dockerfile. Nothing deploys if a test fails.

## Hosting

| Part | Service | Notes |
|---|---|---|
| Backend container | Render (`render.yaml`) | Built from `backend/Dockerfile`; free plan sleeps after 15 idle minutes |
| Frontend | Vercel (root directory `frontend`) | Needs `VITE_API_URL` set to the backend address |
| Database | Neon Postgres | Connection string goes in `DATABASE_URL` |
| Product photos | Cloudinary | `CLOUDINARY_URL`; without it uploads stay on the local disk |

Both hosts have automatic deploy-on-push switched off. The pipeline calls their deploy hooks
only after the tests pass on `main`.

## WhatsApp messages

Until a provider is configured, each confirmation is printed in the backend console and saved on the
order (visible under Admin → Orders → Details), so the whole flow works out of the box.

To send real messages with Twilio's free WhatsApp sandbox:

1. Create a Twilio account and open **Messaging → Try it out → Send a WhatsApp message**.
2. From the phone that will receive messages, send the `join <your-code>` text to the sandbox number.
   (Sandbox rule: every recipient number has to do this once.)
3. Set these environment variables for the backend and restart it:

```
TWILIO_ACCOUNT_SID=ACxxxxxxxx
TWILIO_AUTH_TOKEN=xxxxxxxx
TWILIO_WHATSAPP_FROM=whatsapp:+14155238886
```

Twilio **trial** accounts cannot send free text: set `TWILIO_CONTENT_SID` to the template id (`HX…`)
shown on the console's "Try out WhatsApp" page, and use the sender number shown there as
`TWILIO_WHATSAPP_FROM`. The trial sends the template's fixed sample wording and only to verified numbers.

For local runs, put these values in `backend/.env` (ignored by Git).
10-digit numbers are assumed to be Indian (+91); change `DEFAULT_COUNTRY_CODE` otherwise.

## Configuration

Backend settings come from environment variables — see `backend/.env.example`
(`SECRET_KEY`, `DEBUG`, `ALLOWED_HOSTS`, `CORS_ALLOWED_ORIGINS`, `DATABASE_URL`, Twilio keys).
The frontend needs one: `VITE_API_URL`, the backend's address (see `frontend/.env.example`).

## Project layout

```
backend/
  accounts/   custom user (email login), auth + profile API, admin user CRUD
  store/      events, products, product photos, storefront API, seed_demo command
  orders/     orders, unique order IDs, WhatsApp sender, tests
frontend/src/
  pages/      storefront pages          admin/       admin panel
  components/ shared UI + ImageCropper  context/     auth, cart, active-event theme
```

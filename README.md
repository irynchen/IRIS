# IRIS — Life Dashboard

Deploy steps:

1. Clone repository on the server
2. Copy `.env.example` to `.env` and fill the values
3. Generate bcrypt password hash:

```bash
python3 -c "import bcrypt; print(bcrypt.hashpw(b'mypassword', bcrypt.gensalt()).decode())"
```

4. Build and run with Docker Compose:

```bash
docker-compose up -d --build
```

5. Copy `nginx/iris.goeloria.de.conf` to `/etc/nginx/sites-available/` and enable it. Then obtain SSL with certbot:

```bash
certbot --nginx -d iris.goeloria.de
```

6. Open https://iris.goeloria.de


Notes:
- Fill `IRIS_PASSWORD_HASH` in `.env` with the bcrypt hash
- Frontend builds into a static site served by nginx
- Backend runs Uvicorn on port 8000

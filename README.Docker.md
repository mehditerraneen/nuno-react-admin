# Docker Installation Guide

This guide explains how to run the Nuno React Admin application using Docker.

## Prerequisites

- Docker Engine 20.10.0 or higher
- Docker Compose 2.0.0 or higher

## Quick Start

1. **Configure Environment Variables**

   Copy the production environment file and update with your actual values:
   ```bash
   cp .env.production .env.production.local
   ```

   Edit `.env.production.local` and update:
   - `VITE_SIMPLE_REST_URL`: Your backend API URL
   - `VITE_TEST_USERNAME`: Admin username
   - `VITE_TEST_PASSWORD`: Secure password
   - `VITE_JWT_SECRET`: Strong secret key for JWT
   - `FRONTEND_PORT`: Port to expose (default: 3000)

2. **Build and Run with Docker Compose**

   ```bash
   docker-compose up -d
   ```

   This will:
   - Build the application
   - Start the nginx server
   - Expose the app on the configured port (default: 3000)

3. **Access the Application**

   Open your browser and navigate to:
   ```
   http://localhost:3000
   ```

## Manual Docker Build

If you prefer to build and run without Docker Compose:

1. **Build the Docker Image**

   ```bash
   docker build \
     --build-arg VITE_SIMPLE_REST_URL=http://your-backend:8000/fast \
     --build-arg VITE_TEST_USERNAME=admin \
     --build-arg VITE_TEST_PASSWORD=yourpassword \
     --build-arg VITE_JWT_SECRET=your-secret \
     --build-arg VITE_ENV=production \
     --build-arg VITE_DEBUG=false \
     -t nuno-react-admin:latest .
   ```

2. **Run the Container**

   ```bash
   docker run -d \
     --name nuno-react-admin \
     -p 3000:80 \
     nuno-react-admin:latest
   ```

## Environment Variables

### Required Variables

| Variable | Description | Example |
|----------|-------------|---------|
| `VITE_SIMPLE_REST_URL` | Backend API endpoint | `http://api.example.com:8000/fast` |
| `VITE_TEST_USERNAME` | Admin username | `admin` |
| `VITE_TEST_PASSWORD` | Admin password | `SecurePassword123!` |
| `VITE_JWT_SECRET` | JWT secret key | `your-256-bit-secret` |

### Optional Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `VITE_ENV` | Environment name | `production` |
| `VITE_DEBUG` | Enable debug mode | `false` |
| `FRONTEND_PORT` | Host port to expose | `3000` |

## Docker Commands

### View Logs

```bash
docker-compose logs -f nuno-react-admin
```

### Stop the Application

```bash
docker-compose down
```

### Rebuild After Changes

```bash
docker-compose up -d --build
```

### Check Container Health

```bash
docker ps
docker inspect nuno-react-admin | grep -A 10 Health
```

### Execute Commands in Container

```bash
docker exec -it nuno-react-admin sh
```

## Production Deployment

### Security Recommendations

1. **Never commit `.env.production` with real credentials**
   - Add to `.gitignore`
   - Use environment-specific files (`.env.production.local`)

2. **Use Strong Secrets**
   - Generate strong JWT secrets: `openssl rand -base64 32`
   - Use complex passwords for admin accounts

3. **Enable HTTPS**
   - Use a reverse proxy (Traefik, Caddy, or nginx)
   - Obtain SSL certificates (Let's Encrypt recommended)

4. **Update nginx.conf for Production**
   - Add your domain to `server_name`
   - Configure SSL certificates
   - Set up proper CORS headers if needed

### Example with Reverse Proxy

If using a reverse proxy (like Traefik or Caddy):

```yaml
services:
  nuno-react-admin:
    labels:
      - "traefik.enable=true"
      - "traefik.http.routers.nuno.rule=Host(`your-domain.com`)"
      - "traefik.http.routers.nuno.entrypoints=websecure"
      - "traefik.http.routers.nuno.tls.certresolver=letsencrypt"
```

## Multi-Stage Build

The Dockerfile uses a multi-stage build:

1. **Builder Stage**: Installs dependencies and builds the React app
2. **Production Stage**: Serves the built files with nginx

This results in a smaller final image (~50MB vs ~1GB).

## Health Checks

The container includes health checks that verify the application is running:

- Endpoint: `http://localhost:80/health`
- Interval: 30 seconds
- Timeout: 10 seconds
- Retries: 3

## Troubleshooting

### Container Won't Start

Check logs:
```bash
docker-compose logs nuno-react-admin
```

### Build Fails

1. Clear Docker cache and rebuild:
   ```bash
   docker-compose build --no-cache
   ```

2. Check if all environment variables are set in `.env.production`

### Can't Connect to Backend

1. Ensure `VITE_SIMPLE_REST_URL` is accessible from the container
2. If backend is on localhost, use `host.docker.internal` on Mac/Windows or the host IP on Linux
3. Check network connectivity:
   ```bash
   docker exec -it nuno-react-admin wget -O- http://your-backend:8000/health
   ```

### Port Already in Use

Change the `FRONTEND_PORT` in `.env.production`:
```bash
FRONTEND_PORT=8080
```

## Development vs Production

- **Development**: Use `npm run dev` locally (Vite dev server with HMR)
- **Production**: Use Docker (optimized build with nginx)

## Updating the Application

1. Pull latest changes:
   ```bash
   git pull origin main
   ```

2. Rebuild and restart:
   ```bash
   docker-compose up -d --build
   ```

## Cleaning Up

Remove containers and images:
```bash
docker-compose down
docker rmi nuno-react-admin:latest
```

Remove all unused Docker resources:
```bash
docker system prune -a
```

## Support

For issues or questions:
- Check application logs
- Review Docker logs
- Verify environment configuration
- Ensure backend API is accessible

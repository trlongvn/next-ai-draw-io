# Docker Commands cho Next.js App với Subpath

## Build Docker Image

```bash
docker build \
  --build-arg NEXT_PUBLIC_BASE_PATH=/proxy-services/apps/next-drawio \
  --build-arg NEXT_PUBLIC_DRAWIO_BASE_URL=https://embed.diagrams.net \
  -t next-ai-draw-io:proxy-services \
  .
```

## Run Container

### Với docker-compose:
```bash
docker-compose -f docker-compose.app.yml up -d
```

### Với docker run:
```bash
docker run -d \
  --name next-ai-draw-io-app \
  -p 3000:3000 \
  --env-file .env \
  next-ai-draw-io:proxy-services
```

## Nginx Proxy Pass Configuration

Tạo nginx config trên host để proxy tới container:

```nginx
server {
    listen 80;
    server_name your-domain.com;

    location /proxy-services/apps/next-drawio {
        # Proxy tới container
        proxy_pass http://localhost:3000;
        
        # WebSocket support
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
        
        # Standard headers
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_set_header X-Forwarded-Host $host;
        proxy_set_header X-Forwarded-Port $server_port;
    }
}
```

## URLs

- Container URL: `http://localhost:3000/proxy-services/apps/next-drawio`
- Via Nginx Proxy: `http://your-domain.com/proxy-services/apps/next-drawio`

## Notes

- Subpath `/proxy-services/apps/next-drawio` đã được build vào image
- Container expose port 3000
- Nginx trên host sẽ proxy từ external URL tới container
- Đảm bảo file `.env` có đầy đủ các biến môi trường cần thiết (AI_MODEL, API keys, etc.)

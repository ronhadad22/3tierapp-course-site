# Docker Container Testing Guide

## ✅ Build Status
**Image built successfully!**
- Image: `course-site-backend:latest`
- Size: ~650MB
- Base: node:20-slim

## Testing Options

### Option 1: Test with Mock/Local Database (No AWS Required)

If you want to test without AWS credentials:

```bash
# Run with a direct DATABASE_URL
docker run -d \
  --name course-site-backend \
  -p 5001:5001 \
  -e DATABASE_URL="mysql://root:password@host.docker.internal:3306/coursedb" \
  -e NODE_ENV=development \
  course-site-backend:latest

# Check logs
docker logs -f course-site-backend

# Test health endpoint
curl http://localhost:5001/health
```

### Option 2: Test with Your AWS Configuration

**Requirements:**
- AWS credentials configured (for Secrets Manager access)
- Valid `DB_USERPASS_SECRET_ARN`
- Network access to RDS endpoint

#### Manual Test:

```bash
docker run -d \
  --name course-site-backend \
  -p 5001:5001 \
  -e AWS_REGION=us-east-1 \
  -e DB_USERPASS_SECRET_ARN=arn:aws:secretsmanager:us-east-1:ACCOUNT:secret:NAME \
  -e DB_HOST=be-myrdsinstance-qleoa2secpqo.c0bce4ksewhz.us-east-1.rds.amazonaws.com \
  -e DB_NAME=coursedb \
  -e DB_PORT=3306 \
  -e DB_PARAMS=sslmode=REQUIRED \
  -e NODE_ENV=production \
  -e PORT=5001 \
  -e AWS_ACCESS_KEY_ID=your_key \
  -e AWS_SECRET_ACCESS_KEY=your_secret \
  course-site-backend:latest
```

#### Using Test Script:

```bash
# Edit test-docker.sh and update DB_SECRET_ARN
# Then run:
./test-docker.sh
```

## Verification Steps

### 1. Check Container is Running
```bash
docker ps --filter name=course-site-backend
```

Expected output:
```
CONTAINER ID   NAMES                  STATUS         PORTS
abc123def456   course-site-backend    Up 10 seconds  0.0.0.0:5001->5001/tcp
```

### 2. View Logs
```bash
docker logs course-site-backend
```

Expected output (successful):
```
DATABASE_URL resolved. Starting server...
Server running on port 5001
Prisma Client initialized
```

Expected output (if error):
```
Failed to resolve DATABASE_URL before start: Error: ...
```

### 3. Test Health Endpoint
```bash
curl http://localhost:5001/health
```

Expected output:
```json
{"status":"ok","database":"connected"}
```

### 4. Check Environment Variables
```bash
docker exec course-site-backend env | grep -E "DB_|AWS_|NODE_"
```

Expected output:
```
AWS_REGION=us-east-1
DB_USERPASS_SECRET_ARN=arn:aws:...
DB_HOST=be-myrdsinstance-qleoa2secpqo.c0bce4ksewhz.us-east-1.rds.amazonaws.com
DB_NAME=coursedb
DB_PORT=3306
DB_PARAMS=sslmode=REQUIRED
NODE_ENV=production
```

### 5. Test Database Connection
```bash
docker exec course-site-backend npx prisma db pull
```

If successful, this will connect to the database and pull the schema.

### 6. Test API Endpoints
```bash
# Test courses endpoint
curl http://localhost:5001/api/courses

# Test auth endpoint
curl http://localhost:5001/api/auth/health
```

## Troubleshooting

### Container Exits Immediately

**Check logs:**
```bash
docker logs course-site-backend
```

**Common causes:**
1. Missing `DB_USERPASS_SECRET_ARN`
2. Invalid Secrets Manager ARN
3. No AWS credentials (if testing locally)
4. Network can't reach RDS endpoint

### "Failed to resolve DATABASE_URL"

**Possible issues:**
- Secrets Manager secret doesn't exist
- Secret doesn't have `username` and `password` keys
- No AWS credentials available
- Wrong AWS region

**Verify secret:**
```bash
aws secretsmanager get-secret-value --secret-id YOUR_ARN --region us-east-1
```

Expected format:
```json
{
  "username": "admin",
  "password": "your-password"
}
```

### "Database connection refused"

**Possible issues:**
- RDS security group doesn't allow inbound traffic
- Wrong DB_HOST
- Network connectivity issue
- RDS instance is stopped

**Test from container:**
```bash
docker exec course-site-backend sh -c 'nc -zv $DB_HOST $DB_PORT'
```

### Health Check Failing

**Check if /health endpoint exists:**
```bash
docker exec course-site-backend grep -r "'/health'" .
```

**Check if server is listening:**
```bash
docker exec course-site-backend netstat -tlnp | grep 5001
```

## Testing on EC2 (Production Simulation)

To simulate the CloudFormation deployment:

1. **Launch an EC2 instance** with:
   - IAM role with Secrets Manager permissions
   - Security group allowing outbound to RDS
   - Docker installed

2. **Install Docker:**
```bash
sudo dnf install -y docker
sudo systemctl start docker
sudo systemctl enable docker
```

3. **Pull from ECR (or build locally):**
```bash
# If pushed to ECR
aws ecr get-login-password --region us-east-1 | docker login --username AWS --password-stdin ACCOUNT.dkr.ecr.us-east-1.amazonaws.com
docker pull ACCOUNT.dkr.ecr.us-east-1.amazonaws.com/course-site-backend:latest

# Or build locally
docker build -t course-site-backend:latest .
```

4. **Run with CloudFormation-style env vars:**
```bash
docker run -d \
  --name course-site-backend \
  --restart unless-stopped \
  -p 5001:5001 \
  -e AWS_REGION=us-east-1 \
  -e DB_USERPASS_SECRET_ARN=arn:aws:secretsmanager:us-east-1:ACCOUNT:secret:NAME \
  -e DB_HOST=be-myrdsinstance-qleoa2secpqo.c0bce4ksewhz.us-east-1.rds.amazonaws.com \
  -e DB_NAME=coursedb \
  -e DB_PORT=3306 \
  -e DB_PARAMS=sslmode=REQUIRED \
  -e NODE_ENV=production \
  -e PORT=5001 \
  course-site-backend:latest
```

5. **Run Prisma migrations:**
```bash
docker exec course-site-backend npx prisma migrate deploy
```

6. **Test from ALB:**
```bash
curl http://ALB_DNS_NAME/health
curl http://ALB_DNS_NAME/api/courses
```

## Performance Testing

### Check Resource Usage
```bash
docker stats course-site-backend
```

### Load Testing
```bash
# Install Apache Bench
sudo dnf install -y httpd-tools

# Test health endpoint
ab -n 1000 -c 10 http://localhost:5001/health

# Test API endpoint
ab -n 100 -c 5 http://localhost:5001/api/courses
```

## Cleanup

```bash
# Stop container
docker stop course-site-backend

# Remove container
docker rm course-site-backend

# Remove image
docker rmi course-site-backend:latest

# Remove all stopped containers
docker container prune -f
```

## Next Steps

Once local testing is successful:

1. ✅ Build image
2. ✅ Test locally
3. 📦 Push to ECR
4. 🔧 Update CloudFormation User Data
5. 🚀 Deploy to AWS
6. ✅ Verify in production

## Success Criteria

- ✅ Container starts without errors
- ✅ Health endpoint returns 200 OK
- ✅ Database connection successful
- ✅ API endpoints respond correctly
- ✅ Logs show no errors
- ✅ Container restarts automatically on failure

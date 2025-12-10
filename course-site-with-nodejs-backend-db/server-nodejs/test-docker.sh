#!/bin/bash

# Test script for running the Docker container with AWS environment variables
# This simulates the CloudFormation User Data environment

echo "🐳 Testing course-site-backend Docker container"
echo "================================================"

# Your AWS configuration
DB_SECRET_ARN="arn:aws:secretsmanager:us-east-1:050752632489:secret:course-site-db-p2u3Bs"
DB_HOST="be-myrdsinstance-qleoa2secpqo.c0bce4ksewhz.us-east-1.rds.amazonaws.com"

echo ""
echo "Configuration:"
echo "  - AWS Region: us-east-1"
echo "  - DB Host: $DB_HOST"
echo "  - DB Name: coursedb"
echo "  - DB Port: 3306"
echo ""

# AWS Profile for local testing
AWS_PROFILE="iitc-profile"

echo "📋 Using AWS profile: $AWS_PROFILE"
echo "   (In production, EC2 will use IAM role automatically)"
echo ""

# Stop and remove existing container if it exists
echo "🧹 Cleaning up existing container..."
docker stop course-site-backend 2>/dev/null || true
docker rm course-site-backend 2>/dev/null || true

echo ""
echo "🚀 Starting container with AWS Secrets Manager configuration..."
echo ""

# Run the container with your environment variables
docker run -d \
  --name course-site-backend \
  -p 5001:5001 \
  -v $HOME/.aws:/root/.aws:ro \
  -e AWS_PROFILE="$AWS_PROFILE" \
  -e AWS_REGION=us-east-1 \
  -e DB_USERPASS_SECRET_ARN="$DB_SECRET_ARN" \
  -e DB_HOST="$DB_HOST" \
  -e DB_NAME=coursedb \
  -e DB_PORT=3306 \
  -e DB_PARAMS=sslmode=REQUIRED \
  -e NODE_ENV=production \
  -e PORT=5001 \
  course-site-backend:latest

if [ $? -eq 0 ]; then
  echo "✅ Container started successfully!"
  echo ""
  echo "📋 Container details:"
  docker ps --filter name=course-site-backend --format "table {{.ID}}\t{{.Names}}\t{{.Status}}\t{{.Ports}}"
  
  echo ""
  echo "⏳ Waiting for application to start (10 seconds)..."
  sleep 10
  
  echo ""
  echo "📊 Container logs:"
  echo "=================="
  docker logs course-site-backend
  
  echo ""
  echo "🏥 Health check:"
  echo "================"
  curl -s http://localhost:5001/health || echo "❌ Health check failed"
  
  echo ""
  echo ""
  echo "📝 Useful commands:"
  echo "  - View logs:        docker logs -f course-site-backend"
  echo "  - Check health:     curl http://localhost:5001/health"
  echo "  - Test API:         curl http://localhost:5001/api/courses"
  echo "  - Enter container:  docker exec -it course-site-backend sh"
  echo "  - Check env vars:   docker exec course-site-backend env | grep DB"
  echo "  - Stop container:   docker stop course-site-backend"
  echo "  - Remove container: docker rm course-site-backend"
else
  echo "❌ Failed to start container"
  exit 1
fi

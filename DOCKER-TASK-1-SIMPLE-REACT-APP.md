# Docker Task 1: Containerize Simple React Application

## Overview
In this task, you will containerize the `course-site` React application using Docker. This is a foundational exercise to understand how to package a frontend application into a Docker container and deploy it on AWS.

## Learning Objectives
- Understand Docker basics and Dockerfile syntax
- Learn multi-stage Docker builds for optimized production images
- Deploy a containerized React app to AWS EC2
- Use Docker Hub or Amazon ECR for image storage

---

## Prerequisites
- Docker installed on your local machine ([Install Docker](https://docs.docker.com/get-docker/))
- AWS Account with EC2 access
- Basic understanding of React applications
- Completed the ASG-ALB CloudFormation task

---

## Task Requirements

### Part 1: Create Dockerfile for React App

Navigate to the `course-site` directory and create a `Dockerfile` that:

1. **Uses multi-stage build** to optimize the final image size
2. **Stage 1 (Build Stage)**:
   - Use Node.js base image (node:20-alpine recommended)
   - Set working directory to `/app`
   - Copy `package*.json` files
   - Install dependencies with `npm ci`
   - Copy the rest of the application code
   - Build the production-ready React app using `npm run build`

3. **Stage 2 (Production Stage)**:
   - Use lightweight Nginx image (nginx:alpine)
   - Copy the built React app from Stage 1 to Nginx's html directory
   - Expose port 80
   - Configure Nginx to serve the React app

### Part 2: Build and Test Locally

1. **Build the Docker image**:
   ```bash
   docker build -t course-site:v1.0 .
   ```

2. **Run the container locally**:
   ```bash
   docker run -d -p 8080:80 --name course-site-container course-site:v1.0
   ```

3. **Test the application**:
   - Open browser and navigate to `http://localhost:8080`
   - Verify the React app loads correctly
   - Test all functionality

4. **View container logs**:
   ```bash
   docker logs course-site-container
   ```

5. **Stop and remove container**:
   ```bash
   docker stop course-site-container
   docker rm course-site-container
   ```

### Part 3: Optimize the Dockerfile

Add the following optimizations:

1. **Create `.dockerignore` file** to exclude unnecessary files:
   - node_modules
   - build
   - .git
   - README.md
   - .env files

2. **Add health check** to the Dockerfile
3. **Use build arguments** for versioning
4. **Minimize image layers** by combining RUN commands where appropriate

### Part 4: Push to Container Registry

Choose one of the following options:

#### Option A: Docker Hub
```bash
# Login to Docker Hub
docker login

# Tag your image
docker tag course-site:v1.0 your-dockerhub-username/course-site:v1.0

# Push to Docker Hub
docker push your-dockerhub-username/course-site:v1.0
```

#### Option B: Amazon ECR (Recommended for AWS)
```bash
# Create ECR repository
aws ecr create-repository --repository-name course-site --region us-east-1

# Get login credentials
aws ecr get-login-password --region us-east-1 | docker login --username AWS --password-stdin YOUR_AWS_ACCOUNT_ID.dkr.ecr.us-east-1.amazonaws.com

# Tag your image
docker tag course-site:v1.0 YOUR_AWS_ACCOUNT_ID.dkr.ecr.us-east-1.amazonaws.com/course-site:v1.0

# Push to ECR
docker push YOUR_AWS_ACCOUNT_ID.dkr.ecr.us-east-1.amazonaws.com/course-site:v1.0
```

### Part 5: Deploy to AWS EC2

1. **Launch an EC2 instance**:
   - Use Amazon Linux 2023 or Ubuntu AMI
   - Instance type: t2.micro (free tier eligible)
   - Configure security group to allow:
     - SSH (port 22) from your IP
     - HTTP (port 80) from anywhere (0.0.0.0/0)
   - Create or use existing key pair

2. **Connect to EC2 instance**:
   ```bash
   ssh -i your-key.pem ec2-user@your-ec2-public-ip
   ```

3. **Install Docker on EC2**:
   ```bash
   # For Amazon Linux 2023
   sudo yum update -y
   sudo yum install docker -y
   sudo systemctl start docker
   sudo systemctl enable docker
   sudo usermod -a -G docker ec2-user
   
   # Log out and log back in for group changes to take effect
   ```

4. **Pull and run your container**:
   ```bash
   # From Docker Hub
   docker pull your-dockerhub-username/course-site:v1.0
   docker run -d -p 80:80 --name course-site --restart unless-stopped your-dockerhub-username/course-site:v1.0
   
   # OR from ECR
   aws ecr get-login-password --region us-east-1 | docker login --username AWS --password-stdin YOUR_AWS_ACCOUNT_ID.dkr.ecr.us-east-1.amazonaws.com
   docker pull YOUR_AWS_ACCOUNT_ID.dkr.ecr.us-east-1.amazonaws.com/course-site:v1.0
   docker run -d -p 80:80 --name course-site --restart unless-stopped YOUR_AWS_ACCOUNT_ID.dkr.ecr.us-east-1.amazonaws.com/course-site:v1.0
   ```

5. **Verify deployment**:
   - Open browser and navigate to `http://your-ec2-public-ip`
   - Verify the application is running

### Part 6: (Bonus) Update ASG Launch Template to Use Docker

Modify your existing ASG CloudFormation template to:

1. Include Docker installation in UserData
2. Pull and run the containerized app on instance launch
3. Configure health checks to monitor the container
4. Update the stack and verify auto-scaling works with containerized app


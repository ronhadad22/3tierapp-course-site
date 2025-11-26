# Docker Task 2: Containerize Full-Stack Application with Docker Compose

## Overview
In this advanced task, you will containerize the complete 3-tier application (`course-site-with-nodejs-backend-db`) using Docker and Docker Compose. You'll create separate containers for the frontend, backend, and database, and orchestrate them to work together.

## Learning Objectives
- Create Dockerfiles for multiple application components
- Use Docker Compose to orchestrate multi-container applications
- Understand container networking and inter-service communication
- Manage environment variables and secrets in containerized apps
- Deploy a multi-container application to AWS using ECS or EC2

---

## Prerequisites
- Completed Docker Task 1
- Docker and Docker Compose installed
- AWS Account with RDS and ECS/EC2 access
- Understanding of Node.js, React, and MySQL/Prisma
- **Completed ASG-ALB CloudFormation deployment** (see Step 0 below)

---

## Step 0: Deploy ASG-ALB Infrastructure (Required Before Starting)

Before you begin containerizing the application, you must first deploy the Auto Scaling Group with Application Load Balancer infrastructure using CloudFormation.

### Download and Deploy the CloudFormation Template

1. **Download the template** from the course repository:
   ```bash
   wget https://raw.githubusercontent.com/ronhadad22/cloud-formation-course-site/main/asg-alb-scaling.yaml
   ```
   
   Or manually download from: [asg-alb-scaling.yaml](https://github.com/ronhadad22/cloud-formation-course-site/blob/main/asg-alb-scaling.yaml)

2. **Deploy using AWS Console**:
   - Navigate to CloudFormation in AWS Console
   - Click **Create stack** → **With new resources**
   - Upload the `asg-alb-scaling.yaml` template
   - Provide required parameters (VPC ID, Subnet IDs, KeyName, etc.)
   - Create the stack and wait for `CREATE_COMPLETE` status

3. **Or deploy using AWS CLI**:
   ```bash
   aws cloudformation create-stack \
     --stack-name ASG-ALB-Docker-Stack \
     --template-body file://asg-alb-scaling.yaml \
     --parameters \
       ParameterKey=KeyName,ParameterValue=your-key-name \
       ParameterKey=VpcId,ParameterValue=vpc-xxxxx \
       ParameterKey=SubnetIds,ParameterValue="subnet-xxxx,subnet-yyyy" \
     --capabilities CAPABILITY_NAMED_IAM
   ```

4. **Verify the deployment**:
   - Check that the Auto Scaling Group is created
   - Verify the Application Load Balancer is active
   - Note the ALB DNS name for later use

**Why is this required?**
This infrastructure will be used in Part 9 when deploying your containerized application to AWS. The ASG and ALB will distribute traffic across multiple EC2 instances running your Docker containers.

---

## Architecture Overview

Your application consists of three tiers:

1. **Frontend**: React application (course-site)
2. **Backend**: Node.js/Express API with Prisma ORM (server-nodejs)
3. **Database**: MySQL database

---

## Task Requirements

### Part 1: Create Dockerfile for Frontend (React App)

Navigate to `course-site-with-nodejs-backend-db/course-site/` and create a `Dockerfile`:

**Requirements**:
1. Use multi-stage build (build stage + nginx stage)
2. Build the React app with production optimizations
3. Serve with Nginx
4. Configure Nginx to proxy API requests to backend
5. Expose port 80

**Nginx Configuration**:
Create `nginx.conf` to handle React routing and API proxy:
- Serve static files from `/usr/share/nginx/html`
- Proxy `/api/*` requests to backend service
- Handle React Router (fallback to index.html)

### Part 2: Create Dockerfile for Backend (Node.js API)

The backend already has a Dockerfile in `server-nodejs/`. Review and understand it:

**Key Points**:
- Uses Node.js 20 slim image
- Installs OpenSSL for Prisma
- Generates Prisma client
- Rebuilds bcrypt for architecture compatibility
- Exposes port 5001

**Your Tasks**:
1. Review the existing Dockerfile
2. Add `.dockerignore` file if missing
3. Ensure it follows best practices
4. Test building the image locally

### Part 3: Create Docker Compose Configuration

Create a comprehensive `docker-compose.yml` in the root of `course-site-with-nodejs-backend-db/`:

**Services to Define**:

1. **MySQL Database Service**:
   - Use official MySQL 8.0 image
   - Set root password and create database
   - Configure persistent volume for data
   - Expose port 3306 (only to other containers)
   - Add health check

2. **Backend API Service**:
   - Build from `./server-nodejs`
   - Depends on database service
   - Set environment variables:
     - `DATABASE_URL` (connection to MySQL container)
     - `PORT=5001`
     - `NODE_ENV=production`
   - Expose port 5001
   - Add health check endpoint
   - Wait for database to be ready

3. **Frontend Service**:
   - Build from `./course-site`
   - Depends on backend service
   - Expose port 80 (map to 8080 on host)
   - Configure environment variable for API URL

4. **Networks**:
   - Create custom bridge network for all services
   - Ensure proper service discovery

5. **Volumes**:
   - Named volume for MySQL data persistence
   - Optional: volumes for logs

### Part 4: Environment Configuration

Create `.env` file for Docker Compose:

```env
# Database Configuration
MYSQL_ROOT_PASSWORD=your_secure_root_password
MYSQL_DATABASE=courses_db
MYSQL_USER=courses_user
MYSQL_PASSWORD=your_secure_password

# Backend Configuration
DATABASE_URL=mysql://courses_user:your_secure_password@db:3306/courses_db
NODE_ENV=production
PORT=5001

# Frontend Configuration
REACT_APP_API_URL=http://localhost:5001
```

**Security Note**: Never commit `.env` file to Git. Add it to `.gitignore`.

### Part 5: Database Initialization

Create a database initialization script:

1. **Create `init-scripts/` directory** in `course-site-with-nodejs-backend-db/`
2. **Add `init.sql`** with:
   - Database creation
   - User permissions
   - Initial schema (if not using Prisma migrations)

3. **Update docker-compose.yml** to mount init scripts:
   ```yaml
   volumes:
     - ./init-scripts:/docker-entrypoint-initdb.d
   ```

### Part 6: Build and Test Locally

1. **Build all services**:
   ```bash
   docker-compose build
   ```

2. **Start all services**:
   ```bash
   docker-compose up -d
   ```

3. **Run Prisma migrations** (first time only):
   ```bash
   docker-compose exec backend npx prisma migrate deploy
   ```

4. **View logs**:
   ```bash
   # All services
   docker-compose logs -f
   
   # Specific service
   docker-compose logs -f backend
   ```

5. **Test the application**:
   - Frontend: `http://localhost:8080`
   - Backend API: `http://localhost:5001/api/courses`
   - Verify database connectivity

6. **Check service health**:
   ```bash
   docker-compose ps
   ```

### Part 7: Advanced Docker Compose Features

Enhance your `docker-compose.yml` with:

1. **Health Checks** for all services:
   ```yaml
   healthcheck:
     test: ["CMD", "curl", "-f", "http://localhost:5001/health"]
     interval: 30s
     timeout: 10s
     retries: 3
     start_period: 40s
   ```

2. **Resource Limits**:
   ```yaml
   deploy:
     resources:
       limits:
         cpus: '0.5'
         memory: 512M
   ```

3. **Restart Policies**:
   ```yaml
   restart: unless-stopped
   ```

4. **Logging Configuration**:
   ```yaml
   logging:
     driver: "json-file"
     options:
       max-size: "10m"
       max-file: "3"
   ```

### Part 8: Create Helper Scripts

Create the following scripts in the project root:

1. **`start.sh`** - Start all services
2. **`stop.sh`** - Stop all services
3. **`rebuild.sh`** - Rebuild and restart services
4. **`logs.sh`** - View logs
5. **`clean.sh`** - Remove all containers, volumes, and images

Example `start.sh`:
```bash
#!/bin/bash
echo "Starting all services..."
docker-compose up -d
echo "Waiting for services to be healthy..."
sleep 10
docker-compose ps
echo "Application is running at http://localhost:8080"
```

Make scripts executable:
```bash
chmod +x *.sh
```

### Part 9: Deploy to AWS

Choose one of the following deployment options:

#### Option A: Deploy to EC2 with Docker Compose

1. **Launch EC2 instance** (t2.medium or larger recommended)
2. **Install Docker and Docker Compose**:
   ```bash
   sudo yum update -y
   sudo yum install docker -y
   sudo systemctl start docker
   sudo systemctl enable docker
   
   # Install Docker Compose
   sudo curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
   sudo chmod +x /usr/local/bin/docker-compose
   ```

3. **Clone your repository** or copy files to EC2
4. **Configure environment variables**
5. **Run Docker Compose**:
   ```bash
   docker-compose up -d
   ```

6. **Configure security groups**:
   - Port 80 (HTTP) - Frontend
   - Port 5001 (API) - Backend (optional, if accessing directly)
   - Port 22 (SSH) - For management

#### Option B: Deploy to Amazon ECS (Elastic Container Service)

1. **Push images to ECR**:
   ```bash
   # Create repositories
   aws ecr create-repository --repository-name course-site-frontend
   aws ecr create-repository --repository-name course-site-backend
   
   # Build and push
   docker-compose build
   docker tag course-site-frontend:latest YOUR_ACCOUNT.dkr.ecr.REGION.amazonaws.com/course-site-frontend:latest
   docker tag course-site-backend:latest YOUR_ACCOUNT.dkr.ecr.REGION.amazonaws.com/course-site-backend:latest
   docker push YOUR_ACCOUNT.dkr.ecr.REGION.amazonaws.com/course-site-frontend:latest
   docker push YOUR_ACCOUNT.dkr.ecr.REGION.amazonaws.com/course-site-backend:latest
   ```

2. **Create RDS MySQL instance** for production database

3. **Create ECS Task Definitions** for frontend and backend

4. **Create ECS Service** with:
   - Application Load Balancer
   - Auto Scaling
   - CloudWatch logging

5. **Configure environment variables** using ECS task definition or AWS Secrets Manager

#### Option C: Use AWS App Runner (Simplified)

1. **Push images to ECR** (as in Option B)
2. **Create App Runner services** for frontend and backend
3. **Use RDS for database**
4. **Configure service connections**

### Part 10: Production Considerations

Implement the following for production readiness:

1. **Use AWS RDS** instead of containerized MySQL:
   - Better reliability and backups
   - Managed updates and maintenance
   - Update `DATABASE_URL` to point to RDS endpoint

2. **Secrets Management**:
   - Use AWS Secrets Manager or Parameter Store
   - Never hardcode credentials
   - Update backend to fetch secrets from AWS

3. **SSL/TLS**:
   - Configure HTTPS using AWS Certificate Manager
   - Update ALB to handle SSL termination

4. **Monitoring and Logging**:
   - Configure CloudWatch Logs
   - Set up CloudWatch Alarms
   - Use AWS X-Ray for tracing

5. **Backup Strategy**:
   - Automated RDS snapshots
   - Backup strategy for uploaded files (if any)

---

## Deliverables

Submit the following:

1. **Dockerfiles**:
   - Frontend Dockerfile with nginx.conf
   - Backend Dockerfile (reviewed/updated)
   - Both with `.dockerignore` files

2. **Docker Compose Configuration**:
   - `docker-compose.yml` (production-ready)
   - `.env.example` (template without secrets)
   - `init-scripts/` directory with database initialization

3. **Helper Scripts**:
   - start.sh, stop.sh, rebuild.sh, logs.sh, clean.sh

4. **Documentation**:
   - `DEPLOYMENT.md` with:
     - Architecture diagram
     - Setup instructions
     - Environment variables documentation
     - Deployment steps
     - Troubleshooting guide

5. **Screenshots**:
   - `docker-compose ps` output showing all services running
   - Application running locally
   - Application running on AWS
   - CloudWatch logs (if using ECS)

6. **AWS Resources**:
   - ECR repository URLs
   - EC2/ECS public endpoint
   - RDS endpoint (if used)

---

## Evaluation Criteria

- **Dockerfiles Quality** (20%): Best practices, optimization, security
- **Docker Compose Configuration** (25%): Proper networking, volumes, health checks
- **Local Testing** (15%): All services work together locally
- **AWS Deployment** (25%): Successfully deployed and accessible
- **Production Readiness** (10%): Secrets management, monitoring, backups
- **Documentation** (5%): Clear, comprehensive documentation

---

## Helpful Commands

```bash
# Docker Compose Commands
docker-compose up -d                    # Start all services in background
docker-compose down                     # Stop and remove all containers
docker-compose down -v                  # Stop and remove containers + volumes
docker-compose ps                       # List running services
docker-compose logs -f [service]        # Follow logs
docker-compose exec [service] sh        # Execute command in service
docker-compose build --no-cache         # Rebuild without cache
docker-compose restart [service]        # Restart specific service

# Debugging
docker-compose config                   # Validate and view compose file
docker network ls                       # List networks
docker network inspect [network]        # Inspect network
docker volume ls                        # List volumes
docker volume inspect [volume]          # Inspect volume

# Database Access
docker-compose exec db mysql -u root -p # Access MySQL CLI

# Backend Shell
docker-compose exec backend sh          # Access backend container
```

---

## Common Issues and Solutions

### Issue 1: Database Connection Refused
**Solution**: Ensure database service is healthy before backend starts. Use `depends_on` with health checks.

### Issue 2: Prisma Client Not Generated
**Solution**: Run `npx prisma generate` in Dockerfile or as part of startup script.

### Issue 3: Frontend Can't Reach Backend
**Solution**: Check CORS configuration in backend and API URL in frontend environment variables.

### Issue 4: Port Already in Use
**Solution**: Change host port mapping in docker-compose.yml or stop conflicting service.

### Issue 5: Volume Permission Issues
**Solution**: Check file ownership and permissions. May need to adjust user in Dockerfile.

---

## Additional Resources

- [Docker Compose Documentation](https://docs.docker.com/compose/)
- [Docker Networking](https://docs.docker.com/network/)
- [Prisma with Docker](https://www.prisma.io/docs/guides/deployment/deployment-guides/deploying-to-aws-lambda)
- [AWS ECS Documentation](https://docs.aws.amazon.com/ecs/)
- [AWS RDS Documentation](https://docs.aws.amazon.com/rds/)
- [Nginx Docker Configuration](https://hub.docker.com/_/nginx)

---

## Bonus Challenges

1. **CI/CD Pipeline**: Create GitHub Actions workflow to build and push images automatically
2. **Blue-Green Deployment**: Implement zero-downtime deployments
3. **Database Migrations**: Automate Prisma migrations in container startup
4. **Monitoring Dashboard**: Set up Grafana + Prometheus for container monitoring
5. **Load Testing**: Use Apache Bench or k6 to test application under load

---

Good luck with your full-stack containerization! 🐳🚀

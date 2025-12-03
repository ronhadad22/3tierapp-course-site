# ECS Task: Deploy Containerized Application on Amazon ECS

## Overview
In this task, you will deploy your containerized 3-tier application to Amazon ECS (Elastic Container Service) using Fargate. You'll learn how to orchestrate containers in production, implement service discovery, configure load balancing, and manage secrets securely.

## Learning Objectives
- Understand Amazon ECS architecture and core concepts
- Create ECS Task Definitions for multi-container applications
- Deploy services using ECS Fargate (serverless containers)
- Configure Application Load Balancer with ECS services
- Implement service discovery and container networking
- Manage secrets and environment variables securely
- Set up auto-scaling and monitoring for containerized workloads
- Use Amazon RDS for production database

---

## Prerequisites
- Completed Docker Task 1 and Docker Task 2
- AWS Account with ECS, ECR, RDS, and VPC access
- AWS CLI installed and configured
- Docker images pushed to Amazon ECR
- Basic understanding of VPC, subnets, and security groups
- Familiarity with CloudFormation (optional but recommended)

---

## Getting Started

### Clone the Repository

If you haven't already cloned the repository from the previous Docker tasks, do so now:

```bash
# Clone the repository
git clone https://github.com/ronhadad22/3tierapp-course-site.git

# Navigate to the project directory
cd 3tierapp-course-site

# Checkout the docker-task branch
git checkout docker-task

# Verify you're on the correct branch
git branch
```

You should now have access to all the application code and Docker configurations needed for this ECS deployment task.

---

## Architecture Overview

Your ECS deployment will consist of:

```
Internet → ALB → ECS Service (Frontend) → ECS Service (Backend) → RDS (MySQL)
                      ↓                           ↓
                 Fargate Tasks              Fargate Tasks
                 (React/Nginx)              (Node.js/Express)
```

**Key Components**:
- **VPC**: Isolated network environment
- **Application Load Balancer**: Routes traffic to frontend and backend
- **ECS Cluster**: Logical grouping of tasks and services
- **ECS Services**: Maintain desired number of running tasks
- **Fargate Tasks**: Serverless container instances
- **ECR**: Docker image registry
- **RDS**: Managed MySQL database
- **CloudWatch**: Logging and monitoring
- **Secrets Manager**: Secure credential storage

---

## Task Requirements

### Part 1: Prepare Docker Images and Push to ECR

Before deploying to ECS, ensure your images are in Amazon ECR.

#### 1.1 Create ECR Repositories

```bash
# Create repository for frontend
aws ecr create-repository \
  --repository-name course-site-frontend \
  --region us-east-1 \
  --image-scanning-configuration scanOnPush=true

# Create repository for backend
aws ecr create-repository \
  --repository-name course-site-backend \
  --region us-east-1 \
  --image-scanning-configuration scanOnPush=true
```

#### 1.2 Authenticate Docker to ECR

```bash
# Get your AWS account ID
AWS_ACCOUNT_ID=$(aws sts get-caller-identity --query Account --output text)
AWS_REGION=us-east-1

# Login to ECR
aws ecr get-login-password --region $AWS_REGION | \
  docker login --username AWS --password-stdin \
  $AWS_ACCOUNT_ID.dkr.ecr.$AWS_REGION.amazonaws.com
```

#### 1.3 Build and Push Images

```bash
# Navigate to your project directory
cd course-site-with-nodejs-backend-db

# Build frontend image
cd course-site
docker build -t course-site-frontend:latest .
docker tag course-site-frontend:latest \
  $AWS_ACCOUNT_ID.dkr.ecr.$AWS_REGION.amazonaws.com/course-site-frontend:latest
docker push $AWS_ACCOUNT_ID.dkr.ecr.$AWS_REGION.amazonaws.com/course-site-frontend:latest

# Build backend image
cd ../server-nodejs
docker build -t course-site-backend:latest .
docker tag course-site-backend:latest \
  $AWS_ACCOUNT_ID.dkr.ecr.$AWS_REGION.amazonaws.com/course-site-backend:latest
docker push $AWS_ACCOUNT_ID.dkr.ecr.$AWS_REGION.amazonaws.com/course-site-backend:latest
```

**Verification**:
```bash
# List images in ECR
aws ecr list-images --repository-name course-site-frontend --region us-east-1
aws ecr list-images --repository-name course-site-backend --region us-east-1
```

---

### Part 2: Set Up RDS MySQL Database

Instead of running MySQL in a container, use Amazon RDS for production.

#### 2.1 Create RDS Subnet Group

```bash
aws rds create-db-subnet-group \
  --db-subnet-group-name course-site-db-subnet-group \
  --db-subnet-group-description "Subnet group for course site database" \
  --subnet-ids subnet-xxxxx subnet-yyyyy \
  --region us-east-1
```

#### 2.2 Create Security Group for RDS

```bash
# Create security group
aws ec2 create-security-group \
  --group-name course-site-rds-sg \
  --description "Security group for course site RDS" \
  --vpc-id vpc-xxxxx \
  --region us-east-1

# Get the security group ID
RDS_SG_ID=$(aws ec2 describe-security-groups \
  --filters "Name=group-name,Values=course-site-rds-sg" \
  --query 'SecurityGroups[0].GroupId' --output text)

# Allow MySQL access from ECS tasks (we'll update this later)
aws ec2 authorize-security-group-ingress \
  --group-id $RDS_SG_ID \
  --protocol tcp \
  --port 3306 \
  --source-group $ECS_SG_ID
```

#### 2.3 Create RDS MySQL Instance

```bash
aws rds create-db-instance \
  --db-instance-identifier course-site-db \
  --db-instance-class db.t3.micro \
  --engine mysql \
  --engine-version 8.0.35 \
  --master-username admin \
  --master-user-password 'YourSecurePassword123!' \
  --allocated-storage 20 \
  --db-subnet-group-name course-site-db-subnet-group \
  --vpc-security-group-ids $RDS_SG_ID \
  --backup-retention-period 7 \
  --preferred-backup-window "03:00-04:00" \
  --preferred-maintenance-window "mon:04:00-mon:05:00" \
  --publicly-accessible false \
  --region us-east-1
```

**Wait for RDS to be available** (this takes 5-10 minutes):
```bash
aws rds wait db-instance-available \
  --db-instance-identifier course-site-db \
  --region us-east-1

# Get the RDS endpoint
RDS_ENDPOINT=$(aws rds describe-db-instances \
  --db-instance-identifier course-site-db \
  --query 'DBInstances[0].Endpoint.Address' \
  --output text)

echo "RDS Endpoint: $RDS_ENDPOINT"
```

#### 2.4 Create Database and Run Migrations

```bash
# Connect to RDS using MySQL client
mysql -h $RDS_ENDPOINT -u admin -p

# In MySQL prompt:
CREATE DATABASE courses_db;
EXIT;

# Run Prisma migrations from local machine (temporary)
# Update DATABASE_URL in .env:
# DATABASE_URL="mysql://admin:YourSecurePassword123!@$RDS_ENDPOINT:3306/courses_db"

cd server-nodejs
npx prisma migrate deploy
```

---

### Part 3: Store Secrets in AWS Secrets Manager

Never hardcode credentials in task definitions. Use AWS Secrets Manager.

#### 3.1 Create Database Secret

```bash
aws secretsmanager create-secret \
  --name course-site/database \
  --description "Database credentials for course site" \
  --secret-string '{
    "username": "admin",
    "password": "YourSecurePassword123!",
    "host": "'$RDS_ENDPOINT'",
    "port": 3306,
    "database": "courses_db"
  }' \
  --region us-east-1
```

#### 3.2 Create Application Secrets

```bash
# Backend secrets
aws secretsmanager create-secret \
  --name course-site/backend \
  --description "Backend application secrets" \
  --secret-string '{
    "DATABASE_URL": "mysql://admin:YourSecurePassword123!@'$RDS_ENDPOINT':3306/courses_db",
    "JWT_SECRET": "your-jwt-secret-key-here",
    "NODE_ENV": "production"
  }' \
  --region us-east-1
```

---

### Part 4: Create ECS Cluster

#### 4.1 Create ECS Cluster

```bash
aws ecs create-cluster \
  --cluster-name course-site-cluster \
  --capacity-providers FARGATE FARGATE_SPOT \
  --default-capacity-provider-strategy \
    capacityProvider=FARGATE,weight=1,base=1 \
    capacityProvider=FARGATE_SPOT,weight=4 \
  --region us-east-1
```

**Explanation**:
- **FARGATE**: Serverless compute for containers
- **FARGATE_SPOT**: Cost-optimized Fargate (up to 70% cheaper)
- **Capacity Provider Strategy**: 1 base task on FARGATE, rest on SPOT

---

### Part 5: Create Security Groups for ECS Tasks

#### 5.1 Create Security Group for Backend Tasks

```bash
# Create backend security group
aws ec2 create-security-group \
  --group-name course-site-backend-sg \
  --description "Security group for backend ECS tasks" \
  --vpc-id vpc-xxxxx \
  --region us-east-1

BACKEND_SG_ID=$(aws ec2 describe-security-groups \
  --filters "Name=group-name,Values=course-site-backend-sg" \
  --query 'SecurityGroups[0].GroupId' --output text)

# Allow port 5001 from frontend (we'll add this after creating frontend SG)
# Allow port 5001 from ALB
aws ec2 authorize-security-group-ingress \
  --group-id $BACKEND_SG_ID \
  --protocol tcp \
  --port 5001 \
  --source-group $ALB_SG_ID
```

#### 5.2 Create Security Group for Frontend Tasks

```bash
# Create frontend security group
aws ec2 create-security-group \
  --group-name course-site-frontend-sg \
  --description "Security group for frontend ECS tasks" \
  --vpc-id vpc-xxxxx \
  --region us-east-1

FRONTEND_SG_ID=$(aws ec2 describe-security-groups \
  --filters "Name=group-name,Values=course-site-frontend-sg" \
  --query 'SecurityGroups[0].GroupId' --output text)

# Allow port 80 from ALB
aws ec2 authorize-security-group-ingress \
  --group-id $FRONTEND_SG_ID \
  --protocol tcp \
  --port 80 \
  --source-group $ALB_SG_ID
```

#### 5.3 Update Backend SG to Allow Frontend Access

```bash
aws ec2 authorize-security-group-ingress \
  --group-id $BACKEND_SG_ID \
  --protocol tcp \
  --port 5001 \
  --source-group $FRONTEND_SG_ID
```

#### 5.4 Update RDS SG to Allow Backend Access

```bash
aws ec2 authorize-security-group-ingress \
  --group-id $RDS_SG_ID \
  --protocol tcp \
  --port 3306 \
  --source-group $BACKEND_SG_ID
```

---

### Part 6: Create IAM Roles for ECS Tasks

#### 6.1 Create Task Execution Role

This role allows ECS to pull images from ECR and write logs to CloudWatch.

Create `task-execution-role-trust-policy.json`:
```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Principal": {
        "Service": "ecs-tasks.amazonaws.com"
      },
      "Action": "sts:AssumeRole"
    }
  ]
}
```

Create the role:
```bash
aws iam create-role \
  --role-name ecsTaskExecutionRole \
  --assume-role-policy-document file://task-execution-role-trust-policy.json

# Attach AWS managed policy
aws iam attach-role-policy \
  --role-name ecsTaskExecutionRole \
  --policy-arn arn:aws:iam::aws:policy/service-role/AmazonECSTaskExecutionRolePolicy

# Create custom policy for Secrets Manager access
cat > secrets-policy.json <<EOF
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
        "secretsmanager:GetSecretValue"
      ],
      "Resource": [
        "arn:aws:secretsmanager:us-east-1:$AWS_ACCOUNT_ID:secret:course-site/*"
      ]
    }
  ]
}
EOF

aws iam put-role-policy \
  --role-name ecsTaskExecutionRole \
  --policy-name SecretsManagerAccess \
  --policy-document file://secrets-policy.json
```

#### 6.2 Create Task Role (Optional)

This role gives permissions to the application running in the container.

```bash
aws iam create-role \
  --role-name ecsTaskRole \
  --assume-role-policy-document file://task-execution-role-trust-policy.json

# Add policies as needed (e.g., S3 access, DynamoDB, etc.)
```

---

### Part 7: Create ECS Task Definitions

#### 7.1 Create Backend Task Definition

Create `backend-task-definition.json`:

```json
{
  "family": "course-site-backend",
  "networkMode": "awsvpc",
  "requiresCompatibilities": ["FARGATE"],
  "cpu": "512",
  "memory": "1024",
  "executionRoleArn": "arn:aws:iam::YOUR_ACCOUNT_ID:role/ecsTaskExecutionRole",
  "taskRoleArn": "arn:aws:iam::YOUR_ACCOUNT_ID:role/ecsTaskRole",
  "containerDefinitions": [
    {
      "name": "backend",
      "image": "YOUR_ACCOUNT_ID.dkr.ecr.us-east-1.amazonaws.com/course-site-backend:latest",
      "essential": true,
      "portMappings": [
        {
          "containerPort": 5001,
          "protocol": "tcp"
        }
      ],
      "environment": [
        {
          "name": "PORT",
          "value": "5001"
        },
        {
          "name": "NODE_ENV",
          "value": "production"
        }
      ],
      "secrets": [
        {
          "name": "DATABASE_URL",
          "valueFrom": "arn:aws:secretsmanager:us-east-1:YOUR_ACCOUNT_ID:secret:course-site/backend:DATABASE_URL::"
        }
      ],
      "logConfiguration": {
        "logDriver": "awslogs",
        "options": {
          "awslogs-group": "/ecs/course-site-backend",
          "awslogs-region": "us-east-1",
          "awslogs-stream-prefix": "ecs"
        }
      },
      "healthCheck": {
        "command": ["CMD-SHELL", "curl -f http://localhost:5001/health || exit 1"],
        "interval": 30,
        "timeout": 5,
        "retries": 3,
        "startPeriod": 60
      }
    }
  ]
}
```

**Create CloudWatch Log Group**:
```bash
aws logs create-log-group \
  --log-group-name /ecs/course-site-backend \
  --region us-east-1
```

**Register Task Definition**:
```bash
# Replace YOUR_ACCOUNT_ID in the JSON file first
aws ecs register-task-definition \
  --cli-input-json file://backend-task-definition.json \
  --region us-east-1
```

#### 7.2 Create Frontend Task Definition

Create `frontend-task-definition.json`:

```json
{
  "family": "course-site-frontend",
  "networkMode": "awsvpc",
  "requiresCompatibilities": ["FARGATE"],
  "cpu": "256",
  "memory": "512",
  "executionRoleArn": "arn:aws:iam::YOUR_ACCOUNT_ID:role/ecsTaskExecutionRole",
  "containerDefinitions": [
    {
      "name": "frontend",
      "image": "YOUR_ACCOUNT_ID.dkr.ecr.us-east-1.amazonaws.com/course-site-frontend:latest",
      "essential": true,
      "portMappings": [
        {
          "containerPort": 80,
          "protocol": "tcp"
        }
      ],
      "environment": [
        {
          "name": "REACT_APP_API_URL",
          "value": "http://BACKEND_ALB_DNS:5001"
        }
      ],
      "logConfiguration": {
        "logDriver": "awslogs",
        "options": {
          "awslogs-group": "/ecs/course-site-frontend",
          "awslogs-region": "us-east-1",
          "awslogs-stream-prefix": "ecs"
        }
      },
      "healthCheck": {
        "command": ["CMD-SHELL", "curl -f http://localhost:80 || exit 1"],
        "interval": 30,
        "timeout": 5,
        "retries": 3,
        "startPeriod": 30
      }
    }
  ]
}
```

**Create CloudWatch Log Group**:
```bash
aws logs create-log-group \
  --log-group-name /ecs/course-site-frontend \
  --region us-east-1
```

**Register Task Definition**:
```bash
aws ecs register-task-definition \
  --cli-input-json file://frontend-task-definition.json \
  --region us-east-1
```

---

### Part 8: Create Application Load Balancer

#### 8.1 Create ALB Security Group

```bash
aws ec2 create-security-group \
  --group-name course-site-alb-sg \
  --description "Security group for course site ALB" \
  --vpc-id vpc-xxxxx \
  --region us-east-1

ALB_SG_ID=$(aws ec2 describe-security-groups \
  --filters "Name=group-name,Values=course-site-alb-sg" \
  --query 'SecurityGroups[0].GroupId' --output text)

# Allow HTTP from anywhere
aws ec2 authorize-security-group-ingress \
  --group-id $ALB_SG_ID \
  --protocol tcp \
  --port 80 \
  --cidr 0.0.0.0/0

# Allow HTTPS from anywhere (optional)
aws ec2 authorize-security-group-ingress \
  --group-id $ALB_SG_ID \
  --protocol tcp \
  --port 443 \
  --cidr 0.0.0.0/0
```

#### 8.2 Create Application Load Balancer

```bash
aws elbv2 create-load-balancer \
  --name course-site-alb \
  --subnets subnet-xxxxx subnet-yyyyy \
  --security-groups $ALB_SG_ID \
  --scheme internet-facing \
  --type application \
  --ip-address-type ipv4 \
  --region us-east-1

# Get ALB ARN
ALB_ARN=$(aws elbv2 describe-load-balancers \
  --names course-site-alb \
  --query 'LoadBalancers[0].LoadBalancerArn' \
  --output text)

# Get ALB DNS
ALB_DNS=$(aws elbv2 describe-load-balancers \
  --names course-site-alb \
  --query 'LoadBalancers[0].DNSName' \
  --output text)

echo "ALB DNS: $ALB_DNS"
```

#### 8.3 Create Target Groups

**Backend Target Group**:
```bash
aws elbv2 create-target-group \
  --name course-site-backend-tg \
  --protocol HTTP \
  --port 5001 \
  --vpc-id vpc-xxxxx \
  --target-type ip \
  --health-check-enabled \
  --health-check-protocol HTTP \
  --health-check-path /health \
  --health-check-interval-seconds 30 \
  --health-check-timeout-seconds 5 \
  --healthy-threshold-count 2 \
  --unhealthy-threshold-count 3 \
  --region us-east-1

BACKEND_TG_ARN=$(aws elbv2 describe-target-groups \
  --names course-site-backend-tg \
  --query 'TargetGroups[0].TargetGroupArn' \
  --output text)
```

**Frontend Target Group**:
```bash
aws elbv2 create-target-group \
  --name course-site-frontend-tg \
  --protocol HTTP \
  --port 80 \
  --vpc-id vpc-xxxxx \
  --target-type ip \
  --health-check-enabled \
  --health-check-protocol HTTP \
  --health-check-path / \
  --health-check-interval-seconds 30 \
  --health-check-timeout-seconds 5 \
  --healthy-threshold-count 2 \
  --unhealthy-threshold-count 3 \
  --region us-east-1

FRONTEND_TG_ARN=$(aws elbv2 describe-target-groups \
  --names course-site-frontend-tg \
  --query 'TargetGroups[0].TargetGroupArn' \
  --output text)
```

#### 8.4 Create ALB Listeners and Rules

**Create HTTP Listener**:
```bash
aws elbv2 create-listener \
  --load-balancer-arn $ALB_ARN \
  --protocol HTTP \
  --port 80 \
  --default-actions Type=forward,TargetGroupArn=$FRONTEND_TG_ARN \
  --region us-east-1

LISTENER_ARN=$(aws elbv2 describe-listeners \
  --load-balancer-arn $ALB_ARN \
  --query 'Listeners[0].ListenerArn' \
  --output text)
```

**Create Rule for Backend API**:
```bash
aws elbv2 create-rule \
  --listener-arn $LISTENER_ARN \
  --priority 10 \
  --conditions Field=path-pattern,Values='/api/*' \
  --actions Type=forward,TargetGroupArn=$BACKEND_TG_ARN \
  --region us-east-1
```

---

### Part 9: Create ECS Services

#### 9.1 Create Backend Service

```bash
aws ecs create-service \
  --cluster course-site-cluster \
  --service-name course-site-backend-service \
  --task-definition course-site-backend \
  --desired-count 2 \
  --launch-type FARGATE \
  --platform-version LATEST \
  --network-configuration "awsvpcConfiguration={
    subnets=[subnet-xxxxx,subnet-yyyyy],
    securityGroups=[$BACKEND_SG_ID],
    assignPublicIp=DISABLED
  }" \
  --load-balancers "targetGroupArn=$BACKEND_TG_ARN,containerName=backend,containerPort=5001" \
  --health-check-grace-period-seconds 60 \
  --deployment-configuration "maximumPercent=200,minimumHealthyPercent=100" \
  --region us-east-1
```

**Wait for service to stabilize**:
```bash
aws ecs wait services-stable \
  --cluster course-site-cluster \
  --services course-site-backend-service \
  --region us-east-1
```

#### 9.2 Create Frontend Service

```bash
aws ecs create-service \
  --cluster course-site-cluster \
  --service-name course-site-frontend-service \
  --task-definition course-site-frontend \
  --desired-count 2 \
  --launch-type FARGATE \
  --platform-version LATEST \
  --network-configuration "awsvpcConfiguration={
    subnets=[subnet-xxxxx,subnet-yyyyy],
    securityGroups=[$FRONTEND_SG_ID],
    assignPublicIp=DISABLED
  }" \
  --load-balancers "targetGroupArn=$FRONTEND_TG_ARN,containerName=frontend,containerPort=80" \
  --health-check-grace-period-seconds 60 \
  --deployment-configuration "maximumPercent=200,minimumHealthyPercent=100" \
  --region us-east-1
```

**Wait for service to stabilize**:
```bash
aws ecs wait services-stable \
  --cluster course-site-cluster \
  --services course-site-frontend-service \
  --region us-east-1
```

---

### Part 10: Configure Auto Scaling

#### 10.1 Register Scalable Targets

**Backend Auto Scaling**:
```bash
aws application-autoscaling register-scalable-target \
  --service-namespace ecs \
  --resource-id service/course-site-cluster/course-site-backend-service \
  --scalable-dimension ecs:service:DesiredCount \
  --min-capacity 2 \
  --max-capacity 10 \
  --region us-east-1
```

**Frontend Auto Scaling**:
```bash
aws application-autoscaling register-scalable-target \
  --service-namespace ecs \
  --resource-id service/course-site-cluster/course-site-frontend-service \
  --scalable-dimension ecs:service:DesiredCount \
  --min-capacity 2 \
  --max-capacity 10 \
  --region us-east-1
```

#### 10.2 Create Scaling Policies

**Backend CPU-based Scaling**:
```bash
aws application-autoscaling put-scaling-policy \
  --service-namespace ecs \
  --resource-id service/course-site-cluster/course-site-backend-service \
  --scalable-dimension ecs:service:DesiredCount \
  --policy-name backend-cpu-scaling \
  --policy-type TargetTrackingScaling \
  --target-tracking-scaling-policy-configuration '{
    "TargetValue": 70.0,
    "PredefinedMetricSpecification": {
      "PredefinedMetricType": "ECSServiceAverageCPUUtilization"
    },
    "ScaleInCooldown": 300,
    "ScaleOutCooldown": 60
  }' \
  --region us-east-1
```

**Frontend Request-based Scaling**:
```bash
aws application-autoscaling put-scaling-policy \
  --service-namespace ecs \
  --resource-id service/course-site-cluster/course-site-frontend-service \
  --scalable-dimension ecs:service:DesiredCount \
  --policy-name frontend-request-scaling \
  --policy-type TargetTrackingScaling \
  --target-tracking-scaling-policy-configuration '{
    "TargetValue": 1000.0,
    "PredefinedMetricSpecification": {
      "PredefinedMetricType": "ALBRequestCountPerTarget",
      "ResourceLabel": "app/course-site-alb/xxx/targetgroup/course-site-frontend-tg/yyy"
    },
    "ScaleInCooldown": 300,
    "ScaleOutCooldown": 60
  }' \
  --region us-east-1
```

---

### Part 11: Set Up CloudWatch Monitoring and Alarms

#### 11.1 Create CloudWatch Dashboard

```bash
aws cloudwatch put-dashboard \
  --dashboard-name CourseSiteECS \
  --dashboard-body file://dashboard.json \
  --region us-east-1
```

Create `dashboard.json`:
```json
{
  "widgets": [
    {
      "type": "metric",
      "properties": {
        "metrics": [
          ["AWS/ECS", "CPUUtilization", {"stat": "Average"}],
          [".", "MemoryUtilization", {"stat": "Average"}]
        ],
        "period": 300,
        "stat": "Average",
        "region": "us-east-1",
        "title": "ECS Resource Utilization"
      }
    }
  ]
}
```

#### 11.2 Create CloudWatch Alarms

**High CPU Alarm**:
```bash
aws cloudwatch put-metric-alarm \
  --alarm-name course-site-backend-high-cpu \
  --alarm-description "Alert when backend CPU exceeds 80%" \
  --metric-name CPUUtilization \
  --namespace AWS/ECS \
  --statistic Average \
  --period 300 \
  --evaluation-periods 2 \
  --threshold 80 \
  --comparison-operator GreaterThanThreshold \
  --dimensions Name=ServiceName,Value=course-site-backend-service Name=ClusterName,Value=course-site-cluster \
  --region us-east-1
```

**Unhealthy Target Alarm**:
```bash
aws cloudwatch put-metric-alarm \
  --alarm-name course-site-unhealthy-targets \
  --alarm-description "Alert when targets are unhealthy" \
  --metric-name UnHealthyHostCount \
  --namespace AWS/ApplicationELB \
  --statistic Average \
  --period 60 \
  --evaluation-periods 2 \
  --threshold 1 \
  --comparison-operator GreaterThanOrEqualToThreshold \
  --dimensions Name=TargetGroup,Value=targetgroup/course-site-backend-tg/xxx Name=LoadBalancer,Value=app/course-site-alb/yyy \
  --region us-east-1
```

---

### Part 12: Testing and Verification

#### 12.1 Verify Services are Running

```bash
# Check cluster status
aws ecs describe-clusters \
  --clusters course-site-cluster \
  --region us-east-1

# Check services
aws ecs describe-services \
  --cluster course-site-cluster \
  --services course-site-backend-service course-site-frontend-service \
  --region us-east-1

# List running tasks
aws ecs list-tasks \
  --cluster course-site-cluster \
  --service-name course-site-backend-service \
  --region us-east-1
```

#### 12.2 Check Target Health

```bash
# Backend targets
aws elbv2 describe-target-health \
  --target-group-arn $BACKEND_TG_ARN \
  --region us-east-1

# Frontend targets
aws elbv2 describe-target-health \
  --target-group-arn $FRONTEND_TG_ARN \
  --region us-east-1
```

#### 12.3 Test Application

```bash
# Test frontend
curl http://$ALB_DNS

# Test backend API
curl http://$ALB_DNS/api/courses

# Test health endpoint
curl http://$ALB_DNS/api/health
```

#### 12.4 View Logs

```bash
# Backend logs
aws logs tail /ecs/course-site-backend --follow --region us-east-1

# Frontend logs
aws logs tail /ecs/course-site-frontend --follow --region us-east-1
```

---

### Part 13: Implement CI/CD with GitHub Actions (Bonus)

Create `.github/workflows/deploy-ecs.yml`:

```yaml
name: Deploy to Amazon ECS

on:
  push:
    branches:
      - main

env:
  AWS_REGION: us-east-1
  ECR_REPOSITORY_BACKEND: course-site-backend
  ECR_REPOSITORY_FRONTEND: course-site-frontend
  ECS_SERVICE_BACKEND: course-site-backend-service
  ECS_SERVICE_FRONTEND: course-site-frontend-service
  ECS_CLUSTER: course-site-cluster
  ECS_TASK_DEFINITION_BACKEND: backend-task-definition.json
  ECS_TASK_DEFINITION_FRONTEND: frontend-task-definition.json
  CONTAINER_NAME_BACKEND: backend
  CONTAINER_NAME_FRONTEND: frontend

jobs:
  deploy:
    name: Deploy
    runs-on: ubuntu-latest
    environment: production

    steps:
      - name: Checkout
        uses: actions/checkout@v3

      - name: Configure AWS credentials
        uses: aws-actions/configure-aws-credentials@v2
        with:
          aws-access-key-id: ${{ secrets.AWS_ACCESS_KEY_ID }}
          aws-secret-access-key: ${{ secrets.AWS_SECRET_ACCESS_KEY }}
          aws-region: ${{ env.AWS_REGION }}

      - name: Login to Amazon ECR
        id: login-ecr
        uses: aws-actions/amazon-ecr-login@v1

      - name: Build, tag, and push backend image to Amazon ECR
        id: build-backend-image
        env:
          ECR_REGISTRY: ${{ steps.login-ecr.outputs.registry }}
          IMAGE_TAG: ${{ github.sha }}
        run: |
          cd server-nodejs
          docker build -t $ECR_REGISTRY/$ECR_REPOSITORY_BACKEND:$IMAGE_TAG .
          docker push $ECR_REGISTRY/$ECR_REPOSITORY_BACKEND:$IMAGE_TAG
          echo "image=$ECR_REGISTRY/$ECR_REPOSITORY_BACKEND:$IMAGE_TAG" >> $GITHUB_OUTPUT

      - name: Build, tag, and push frontend image to Amazon ECR
        id: build-frontend-image
        env:
          ECR_REGISTRY: ${{ steps.login-ecr.outputs.registry }}
          IMAGE_TAG: ${{ github.sha }}
        run: |
          cd course-site
          docker build -t $ECR_REGISTRY/$ECR_REPOSITORY_FRONTEND:$IMAGE_TAG .
          docker push $ECR_REGISTRY/$ECR_REPOSITORY_FRONTEND:$IMAGE_TAG
          echo "image=$ECR_REGISTRY/$ECR_REPOSITORY_FRONTEND:$IMAGE_TAG" >> $GITHUB_OUTPUT

      - name: Fill in the new backend image ID in the Amazon ECS task definition
        id: task-def-backend
        uses: aws-actions/amazon-ecs-render-task-definition@v1
        with:
          task-definition: ${{ env.ECS_TASK_DEFINITION_BACKEND }}
          container-name: ${{ env.CONTAINER_NAME_BACKEND }}
          image: ${{ steps.build-backend-image.outputs.image }}

      - name: Deploy backend Amazon ECS task definition
        uses: aws-actions/amazon-ecs-deploy-task-definition@v1
        with:
          task-definition: ${{ steps.task-def-backend.outputs.task-definition }}
          service: ${{ env.ECS_SERVICE_BACKEND }}
          cluster: ${{ env.ECS_CLUSTER }}
          wait-for-service-stability: true

      - name: Fill in the new frontend image ID in the Amazon ECS task definition
        id: task-def-frontend
        uses: aws-actions/amazon-ecs-render-task-definition@v1
        with:
          task-definition: ${{ env.ECS_TASK_DEFINITION_FRONTEND }}
          container-name: ${{ env.CONTAINER_NAME_FRONTEND }}
          image: ${{ steps.build-frontend-image.outputs.image }}

      - name: Deploy frontend Amazon ECS task definition
        uses: aws-actions/amazon-ecs-deploy-task-definition@v1
        with:
          task-definition: ${{ steps.task-def-frontend.outputs.task-definition }}
          service: ${{ env.ECS_SERVICE_FRONTEND }}
          cluster: ${{ env.ECS_CLUSTER }}
          wait-for-service-stability: true
```

---

### Part 14: Cost Optimization

#### 14.1 Use Fargate Spot

Update your services to use Fargate Spot for cost savings:

```bash
aws ecs update-service \
  --cluster course-site-cluster \
  --service course-site-backend-service \
  --capacity-provider-strategy \
    capacityProvider=FARGATE,weight=1,base=1 \
    capacityProvider=FARGATE_SPOT,weight=4 \
  --region us-east-1
```

#### 14.2 Right-size Your Tasks

Monitor CPU and memory usage and adjust task definitions:

```bash
# View metrics
aws cloudwatch get-metric-statistics \
  --namespace AWS/ECS \
  --metric-name CPUUtilization \
  --dimensions Name=ServiceName,Value=course-site-backend-service Name=ClusterName,Value=course-site-cluster \
  --start-time 2024-01-01T00:00:00Z \
  --end-time 2024-01-02T00:00:00Z \
  --period 3600 \
  --statistics Average \
  --region us-east-1
```

#### 14.3 Set Up Auto-scaling Schedules

Scale down during off-peak hours:

```bash
aws application-autoscaling put-scheduled-action \
  --service-namespace ecs \
  --resource-id service/course-site-cluster/course-site-backend-service \
  --scalable-dimension ecs:service:DesiredCount \
  --scheduled-action-name scale-down-night \
  --schedule "cron(0 22 * * ? *)" \
  --scalable-target-action MinCapacity=1,MaxCapacity=2 \
  --region us-east-1
```

---

## Deliverables

Submit the following:

1. **Task Definition Files**:
   - `backend-task-definition.json`
   - `frontend-task-definition.json`

2. **Infrastructure as Code** (Choose one):
   - CloudFormation template for entire ECS stack
   - Terraform configuration files
   - AWS CDK code

3. **Documentation**:
   - `ECS-DEPLOYMENT.md` with:
     - Architecture diagram
     - Step-by-step deployment guide
     - Environment variables documentation
     - Troubleshooting guide
     - Cost analysis

4. **Screenshots**:
   - ECS cluster with running services
   - Task definitions
   - ALB with target groups
   - CloudWatch dashboard
   - Application running via ALB DNS
   - Auto-scaling in action

5. **CI/CD Pipeline**:
   - GitHub Actions workflow file
   - Evidence of successful automated deployment

6. **Monitoring Setup**:
   - CloudWatch dashboard JSON
   - List of configured alarms
   - Sample logs from CloudWatch

---

## Evaluation Criteria

- **Infrastructure Setup** (25%): Proper VPC, security groups, RDS, ECR configuration
- **ECS Configuration** (25%): Task definitions, services, cluster setup
- **Load Balancing** (15%): ALB configuration, target groups, routing rules
- **Security** (15%): Secrets management, IAM roles, security groups
- **Monitoring & Logging** (10%): CloudWatch setup, alarms, dashboards
- **Auto-scaling** (5%): Proper scaling policies and testing
- **Documentation** (5%): Clear, comprehensive documentation

---

## Common Issues and Troubleshooting

### Issue 1: Tasks Failing to Start
**Symptoms**: Tasks start and immediately stop

**Solutions**:
```bash
# Check task logs
aws ecs describe-tasks \
  --cluster course-site-cluster \
  --tasks TASK_ID \
  --region us-east-1

# Check CloudWatch logs
aws logs tail /ecs/course-site-backend --since 10m
```

Common causes:
- Incorrect environment variables
- Database connection issues
- Missing secrets
- Image pull errors

### Issue 2: Unhealthy Targets
**Symptoms**: Targets showing as unhealthy in target group

**Solutions**:
- Verify health check path is correct
- Check security group allows ALB to reach tasks
- Ensure application is listening on correct port
- Increase health check grace period

### Issue 3: Cannot Pull Image from ECR
**Symptoms**: "CannotPullContainerError"

**Solutions**:
- Verify task execution role has ECR permissions
- Check image URI is correct
- Ensure ECR repository exists in same region

### Issue 4: Database Connection Timeout
**Symptoms**: Backend cannot connect to RDS

**Solutions**:
- Verify RDS security group allows traffic from backend SG
- Check DATABASE_URL is correct
- Ensure tasks are in same VPC as RDS
- Verify RDS is in available state

### Issue 5: High Costs
**Solutions**:
- Use Fargate Spot for non-critical workloads
- Right-size task CPU and memory
- Implement auto-scaling to scale down during low traffic
- Use RDS reserved instances for database

---

## Additional Resources

- [Amazon ECS Documentation](https://docs.aws.amazon.com/ecs/)
- [AWS Fargate Pricing](https://aws.amazon.com/fargate/pricing/)
- [ECS Best Practices](https://docs.aws.amazon.com/AmazonECS/latest/bestpracticesguide/)
- [CloudWatch Container Insights](https://docs.aws.amazon.com/AmazonCloudWatch/latest/monitoring/ContainerInsights.html)
- [AWS Secrets Manager](https://docs.aws.amazon.com/secretsmanager/)
- [Application Load Balancer](https://docs.aws.amazon.com/elasticloadbalancing/latest/application/)

---

## Bonus Challenges

1. **Blue-Green Deployment**: Implement CodeDeploy for zero-downtime deployments
2. **Service Mesh**: Set up AWS App Mesh for advanced traffic management
3. **Multi-Region**: Deploy to multiple regions with Route 53 failover
4. **Container Security**: Implement ECR image scanning and runtime security
5. **Cost Dashboard**: Create custom cost tracking dashboard
6. **Disaster Recovery**: Implement backup and recovery procedures
7. **Performance Testing**: Use AWS Distributed Load Testing solution

---

Good luck with your ECS deployment! 🚀☁️

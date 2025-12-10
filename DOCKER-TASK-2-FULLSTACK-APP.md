# Docker Task 2: Containerize Backend API and Deploy to AWS

## Overview
In this task, you will containerize the Node.js backend API from the 3-tier application (`course-site-with-nodejs-backend-db`) and deploy it to AWS. The frontend is already deployed via S3/CloudFront, and the database is already running on RDS. You'll focus on containerizing the backend and updating the ASG-ALB CloudFormation stack to run your Docker container.

## What's Already Deployed? 🎯

**You DON'T need to containerize or deploy:**
- ✅ **Frontend (React)**: Already deployed on S3/CloudFront via the `simple-frontend-s3-cloudfront.yaml` template
- ✅ **Database (MySQL)**: Already deployed on RDS via the `asg-alb-scaling.yaml` template

**What YOU need to do:**
- 🐳 **Containerize the Backend API** (Node.js/Express)
- 📦 **Push the image to Amazon ECR**
- 🔧 **Update the User Data in `asg-alb-scaling.yaml`** to pull and run your Docker container
- 🚀 **Update the CloudFormation stack** to deploy your containerized backend

## Architecture Diagram

```
                    ┌─────────────────┐
                    │  User Browser   │
                    └────────┬────────┘
                             │
                ┌────────────┴────────────┐
                │                         │
                │ (Static Files)          │ (API Calls)
                ▼                         ▼
┌───────────────────────────┐   ┌──────────────────────────┐
│  CloudFront Distribution  │   │         ALB              │
│  (ALREADY DEPLOYED)       │   │  (ALREADY DEPLOYED)      │
└───────────┬───────────────┘   └──────────┬───────────────┘
            │                              │
            │                              ▼
            ▼                   ┌─────────────────────────────────┐
┌──────────────────┐            │   Auto Scaling Group (ASG)      │
│   S3 Bucket      │            │   ◄─── YOU UPDATE USER DATA     │
│  (React Build)   │            │  ┌────────────────────────┐     │
│ (ALREADY DEPLOYED)│            │  │ EC2 Instance           │     │
└──────────────────┘            │  │ ┌────────────────────┐ │     │
                                │  │ │ Docker Container   │ │     │
                                │  │ │ (Backend API)      │◄┼─────┼─ YOU CONTAINERIZE
                                │  │ │  Port 5001         │ │     │
                                │  │ └────────────────────┘ │     │
                                │  └────────────────────────┘     │
                                └─────────────┬───────────────────┘
                                              │
                                              ▼
                                ┌──────────────────────┐
                                │   RDS MySQL          │
                                │   (Database)         │
                                │ (ALREADY DEPLOYED)   │
                                └──────────────────────┘

FLOW:
1. User browser requests static files (HTML/CSS/JS) from CloudFront
2. CloudFront serves React app from S3
3. React app (in browser) makes API calls to ALB
4. ALB routes requests to EC2 instances running Docker containers
5. Backend containers connect to RDS database
```

## Learning Objectives
- Create a production-ready Dockerfile for a Node.js backend
- Use Docker Compose for local development and testing
- Push Docker images to Amazon ECR (Elastic Container Registry)
- Update CloudFormation User Data to deploy containerized applications
- Integrate containerized backend with existing AWS infrastructure (RDS, ALB, S3/CloudFront)
- Manage environment variables and secrets in production

---

## Prerequisites
- Completed Docker Task 1
- Docker and Docker Compose installed locally
- AWS Account with ECR, EC2, and CloudFormation access
- Understanding of Node.js and MySQL/Prisma
- **Completed ASG-ALB CloudFormation deployment** - This includes:
  - RDS MySQL database (already deployed)
  - Auto Scaling Group with Application Load Balancer
  - S3/CloudFront frontend (already deployed from previous task)

---

## Getting Started

### Clone the Repository

If you haven't already cloned the repository from Docker Task 1, do so now:

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

You should now have access to the full-stack application code in the `course-site-with-nodejs-backend-db` directory.

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
This infrastructure includes:
- **RDS MySQL Database**: Already configured and running - your backend will connect to this
- **Auto Scaling Group + ALB**: You'll update the User Data to run your Docker container
- **S3/CloudFront Frontend**: Already deployed - will communicate with your backend via the ALB

You'll only need to update the User Data section of this stack to deploy your containerized backend.

---

## Architecture Overview

Your application consists of three tiers:

1. **Frontend**: React application (course-site) - **Already deployed via S3/CloudFront**
2. **Backend**: Node.js/Express API with Prisma ORM (server-nodejs) - **You will containerize this**
3. **Database**: MySQL database (RDS) - **Already configured in CloudFormation**

**Important Note**: The frontend has already been deployed using the S3/CloudFront CloudFormation template from the previous task. In this Docker task, you will focus on containerizing the **backend API only** and deploying it to the ASG-ALB infrastructure.

---

## Task Requirements

### Part 1: Create Dockerfile for Backend (Node.js API)

Navigate to `course-site-with-nodejs-backend-db/server-nodejs/` and review the existing Dockerfile:

**Key Points**:
- Uses Node.js 20 slim image
- Installs OpenSSL for Prisma
- Generates Prisma client
- Rebuilds bcrypt for architecture compatibility
- Exposes port 5001

**Your Tasks**:
1. Review the existing Dockerfile
2. Add `.dockerignore` file if missing to exclude:
   - `node_modules/`
   - `.env`
   - `.git/`
   - `*.log`
   - `dist/`
3. Ensure it follows Docker best practices
4. Test building the image locally:
   ```bash
   cd course-site-with-nodejs-backend-db/server-nodejs
   docker build -t course-site-backend:latest .
   ```

### Part 2: Test Backend Locally (Optional)

You can optionally test the backend container locally before deploying to AWS:

1. **Run the container locally**:
   ```bash
   docker run -d \
     --name course-site-backend-test \
     -p 5001:5001 \
     -e DATABASE_URL="mysql://user:pass@host:3306/dbname" \
     -e NODE_ENV=development \
     -e PORT=5001 \
     course-site-backend:latest
   ```

2. **Test the API**:
   ```bash
   curl http://localhost:5001/api/courses
   ```

3. **View logs**:
   ```bash
   docker logs -f course-site-backend-test
   ```

4. **Stop and remove**:
   ```bash
   docker stop course-site-backend-test
   docker rm course-site-backend-test
   ```

**Note**: You'll need a valid `DATABASE_URL` pointing to a MySQL database (you can use a local MySQL instance or a test RDS instance).

### Part 3: Push Backend Image to Amazon ECR

1. **Create ECR repository**:
   ```bash
   aws ecr create-repository --repository-name course-site-backend --region eu-west-1
   ```

2. **Authenticate Docker to ECR**:
   ```bash
   aws ecr get-login-password --region eu-west-1 | docker login --username AWS --password-stdin YOUR_ACCOUNT_ID.dkr.ecr.eu-west-1.amazonaws.com
   ```

3. **Tag your backend image**:
   ```bash
   docker tag course-site-backend:latest YOUR_ACCOUNT_ID.dkr.ecr.eu-west-1.amazonaws.com/course-site-backend:latest
   ```

4. **Push to ECR**:
   ```bash
   docker push YOUR_ACCOUNT_ID.dkr.ecr.eu-west-1.amazonaws.com/course-site-backend:latest
   ```

5. **Verify the push**:
   ```bash
   aws ecr describe-images --repository-name course-site-backend --region eu-west-1
   ```

### Part 4: Update ASG-ALB CloudFormation User Data

Now you'll update the CloudFormation template to deploy your Docker container instead of running Node.js directly.

#### Step 4.1: Download and Locate the User Data Section

1. **Download the CloudFormation template** (if you haven't already):
   ```bash
   wget https://raw.githubusercontent.com/ronhadad22/cloud-formation-course-site/main/asg-alb-scaling.yaml
   ```

2. **Open the template** and locate the `UserData` section in the `LaunchTemplate` resource.

3. **Current User Data** (Node.js setup):
   The current User Data installs Node.js and runs the application directly:
   ```bash
   set -euxo pipefail
   dnf update -y
   dnf install -y nodejs
   node --version > /var/log/node-version.log 2>&1 || true

   sudo yum install git -y
   APP_DIR="/home/ec2-user/3tierapp-course-site/course-site-with-nodejs-backend-db/server-nodejs"
   if [ ! -d "/home/ec2-user/3tierapp-course-site" ]; then
     su - ec2-user -c "git clone https://github.com/ronhadad22/3tierapp-course-site.git /home/ec2-user/3tierapp-course-site"
   fi
   chown -R ec2-user:ec2-user /home/ec2-user/3tierapp-course-site

   # Creates systemd service for Node.js app...
   ```

#### Step 4.2: Replace with Docker-Based User Data

Replace the entire User Data section with the following Docker-based deployment:

```yaml
UserData:
  Fn::Base64: !Sub |
    #!/bin/bash
    set -euxo pipefail
    
    # Update system
    dnf update -y
    
    # Install Docker
    dnf install -y docker
    systemctl enable docker
    systemctl start docker
    usermod -aG docker ec2-user || true
    
    # Install jq for JSON parsing
    dnf install -y jq
    
    # Authenticate Docker to ECR
    aws ecr get-login-password --region ${AWS::Region} | docker login --username AWS --password-stdin ${AWS::AccountId}.dkr.ecr.${AWS::Region}.amazonaws.com
    
    # Pull the backend image from ECR
    docker pull ${AWS::AccountId}.dkr.ecr.${AWS::Region}.amazonaws.com/course-site-backend:latest
    
    # Get DB credentials from Secrets Manager
    DB_SECRET=$(aws secretsmanager get-secret-value --secret-id ${DBSecretArn} --region ${AWS::Region} --query SecretString --output text)
    DB_USERNAME=$(echo $DB_SECRET | jq -r .username)
    DB_PASSWORD=$(echo $DB_SECRET | jq -r .password)
    DB_HOST=${MyRDSInstance.Endpoint.Address}
    DB_NAME=coursedb
    
    # Remove old container if exists
    docker rm -f course-site-backend || true
    
    # Run the backend container
    docker run -d \
      --name course-site-backend \
      --restart unless-stopped \
      -p 5001:5001 \
      -e DATABASE_URL="mysql://${!DB_USERNAME}:${!DB_PASSWORD}@${!DB_HOST}:3306/${!DB_NAME}" \
      -e NODE_ENV=production \
      -e PORT=5001 \
      -e AWS_REGION=${AWS::Region} \
      ${AWS::AccountId}.dkr.ecr.${AWS::Region}.amazonaws.com/course-site-backend:latest
    
    # Wait for container to start
    sleep 10
    
    # Run Prisma migrations
    docker exec course-site-backend npx prisma migrate deploy || true
    docker exec course-site-backend npx prisma generate || true
```

#### Step 4.3: Update IAM Role Permissions

The `InstanceRole` in the CloudFormation template needs ECR permissions. Locate the `InstanceRole` resource and add the ECR policy:

```yaml
- PolicyName: ECRAccess
  PolicyDocument:
    Version: '2012-10-17'
    Statement:
      - Effect: Allow
        Action:
          - ecr:GetAuthorizationToken
          - ecr:BatchCheckLayerAvailability
          - ecr:GetDownloadUrlForLayer
          - ecr:BatchGetImage
        Resource: '*'
```

**Note**: The template should already have Secrets Manager permissions for accessing `DBSecretArn`. If not, add:

```yaml
- Effect: Allow
  Action:
    - secretsmanager:GetSecretValue
  Resource: !Ref DBSecretArn
```

#### Step 4.4: Update the CloudFormation Stack

1. **Update the stack** with the modified template:
   ```bash
   aws cloudformation update-stack \
     --stack-name ASG-ALB-Docker-Stack \
     --template-body file://asg-alb-scaling.yaml \
     --capabilities CAPABILITY_NAMED_IAM
   ```

2. **Wait for the update to complete**:
   ```bash
   aws cloudformation wait stack-update-complete --stack-name ASG-ALB-Docker-Stack
   ```

3. **Verify the deployment**:
   - Check that new instances are launched with Docker
   - SSH into an instance and verify the container is running:
     ```bash
     docker ps
     docker logs course-site-backend
     ```
   - Test the backend API through the ALB endpoint
   - Verify the frontend (S3/CloudFront) can communicate with the backend

### Part 5: Configure CORS and Frontend Integration

#### Step 5.1: Configure CORS for Backend

Ensure your backend allows requests from the CloudFront domain. Update your backend CORS configuration:

```javascript
// In your Express app
const cors = require('cors');

app.use(cors({
  origin: [
    'https://your-cloudfront-domain.cloudfront.net',
    'http://localhost:3000' // for local development
  ],
  credentials: true
}));
```

#### Step 5.2: Update Frontend Environment Variables

The frontend (deployed on S3/CloudFront) needs to know the backend API URL. Update the frontend build with the ALB endpoint:

1. **Get the ALB DNS name** from CloudFormation outputs:
   ```bash
   aws cloudformation describe-stacks --stack-name ASG-ALB-Docker-Stack --query 'Stacks[0].Outputs[?OutputKey==`LoadBalancerDNS`].OutputValue' --output text
   ```

2. **Update frontend environment** and rebuild:
   ```bash
   cd course-site-with-nodejs-backend-db/course-site
   echo "REACT_APP_API_URL=http://YOUR-ALB-DNS-NAME" > .env.production
   npm run build
   ```

3. **Upload to S3**:
   ```bash
   aws s3 sync build/ s3://your-frontend-bucket/ --delete
   aws cloudfront create-invalidation --distribution-id YOUR_DIST_ID --paths "/*"
   ```

### Part 6: Production Considerations

The ASG-ALB CloudFormation template already includes many production-ready features. Ensure you've configured:

1. **RDS Database** (Already in CloudFormation):
   - The template creates an RDS MySQL instance
   - Automated backups are configured
   - Multi-AZ deployment for high availability (optional)
   - Database credentials stored in Secrets Manager

2. **SSL/TLS**:
   - Add HTTPS listener to ALB using AWS Certificate Manager
   - Update the `SSLCertificateArns` parameter in the CloudFormation template
   - Redirect HTTP to HTTPS

3. **Monitoring and Logging**:
   - Enable CloudWatch Container Insights
   - Configure CloudWatch Logs for Docker containers
   - Set up CloudWatch Alarms for:
     - High CPU/Memory usage
     - ALB target health
     - RDS connections
   - Use AWS X-Ray for distributed tracing (optional)

4. **Auto Scaling**:
   - The ASG is already configured with target tracking
   - Adjust `MinSize`, `MaxSize`, and `DesiredCapacity` parameters
   - Monitor scaling activities in CloudWatch

5. **Security Best Practices**:
   - Never commit secrets to Git
   - Use Secrets Manager for all credentials
   - Configure security groups to allow only necessary traffic
   - Enable VPC Flow Logs
   - Regular security updates via User Data script

6. **CI/CD Pipeline** (Bonus):
   - Automate Docker image builds on code push
   - Push to ECR automatically
   - Trigger ASG instance refresh on new image
   - Use CodePipeline + CodeBuild

---

## Deliverables

Submit the following:

1. **Backend Dockerfile**:
   - Reviewed/updated Dockerfile in `server-nodejs/`
   - `.dockerignore` file
   - Documentation of any changes made

2. **Updated CloudFormation Template**:
   - Modified `asg-alb-scaling.yaml` with:
     - Updated User Data for Docker deployment
     - ECR permissions in IAM role
     - Any other necessary changes

3. **Documentation**:
   - `DEPLOYMENT.md` with:
     - Architecture diagram showing S3/CloudFront frontend + ASG/ALB backend + RDS
     - Docker build instructions
     - ECR push instructions
     - CloudFormation update steps
     - Environment variables documentation
     - Troubleshooting guide

4. **Screenshots**:
   - Docker build successful
   - ECR repository with pushed image
   - CloudFormation stack update successful
   - EC2 instance with `docker ps` showing running container
   - `docker logs` output from backend container
   - ALB health checks passing
   - Backend API responding through ALB (curl/Postman)
   - Full application working (frontend on CloudFront + backend on ALB)

5. **AWS Resources Documentation**:
   - ECR repository URL
   - ALB DNS name
   - CloudFront distribution URL
   - RDS endpoint
   - CloudFormation stack name

---

## Evaluation Criteria

- **Backend Dockerfile Quality** (20%): Best practices, optimization, security
- **ECR Image Push** (15%): Successfully built and pushed to ECR
- **CloudFormation Update** (30%): Correctly updated User Data and IAM permissions
- **AWS Deployment** (25%): Backend successfully deployed on ASG instances, accessible via ALB
- **Full Stack Integration** (15%): Frontend (CloudFront) successfully communicates with backend (ALB)
- **Production Readiness** (10%): Secrets management, monitoring, security
- **Documentation** (10%): Clear, comprehensive documentation

---

## Helpful Commands

```bash
# Docker Commands
docker build -t course-site-backend:latest .    # Build image
docker images                                    # List images
docker ps                                        # List running containers
docker ps -a                                     # List all containers
docker logs -f course-site-backend              # Follow container logs
docker exec -it course-site-backend sh          # Access container shell
docker stop course-site-backend                 # Stop container
docker rm course-site-backend                   # Remove container
docker rmi course-site-backend:latest           # Remove image

# ECR Commands
aws ecr get-login-password --region eu-west-1 | docker login --username AWS --password-stdin ACCOUNT_ID.dkr.ecr.eu-west-1.amazonaws.com
aws ecr describe-repositories                   # List ECR repositories
aws ecr describe-images --repository-name course-site-backend  # List images in repo
docker push ACCOUNT_ID.dkr.ecr.eu-west-1.amazonaws.com/course-site-backend:latest

# CloudFormation Commands
aws cloudformation update-stack --stack-name ASG-ALB-Docker-Stack --template-body file://asg-alb-scaling.yaml --capabilities CAPABILITY_NAMED_IAM
aws cloudformation describe-stacks --stack-name ASG-ALB-Docker-Stack
aws cloudformation wait stack-update-complete --stack-name ASG-ALB-Docker-Stack

# EC2 Debugging (SSH into instance)
docker ps                                        # Check running containers
docker logs course-site-backend                 # View container logs
docker exec course-site-backend env             # Check environment variables
curl http://localhost:5001/api/courses          # Test API locally
```

---

## Common Issues and Solutions

### Issue 1: ECR Authentication Failed
**Solution**: Ensure you're authenticated to ECR and using the correct region:
```bash
aws ecr get-login-password --region eu-west-1 | docker login --username AWS --password-stdin ACCOUNT_ID.dkr.ecr.eu-west-1.amazonaws.com
```

### Issue 2: Container Not Starting on EC2
**Solution**: 
- SSH into the instance and check Docker logs: `docker logs course-site-backend`
- Verify environment variables are set correctly
- Check that RDS endpoint is accessible from the EC2 instance

### Issue 3: Database Connection Refused
**Solution**: 
- Verify RDS security group allows inbound traffic from EC2 instances
- Check that DATABASE_URL is correctly formatted
- Ensure Secrets Manager credentials are correct

### Issue 4: Prisma Migrations Fail
**Solution**: 
- Ensure the database exists and is accessible
- Run migrations manually: `docker exec course-site-backend npx prisma migrate deploy`
- Check Prisma schema matches database structure

### Issue 5: Frontend Can't Reach Backend
**Solution**: 
- Verify CORS is configured to allow CloudFront origin
- Check ALB security group allows inbound traffic on port 5001
- Ensure frontend is using correct ALB DNS name
- Verify ALB target health checks are passing

### Issue 6: CloudFormation Stack Update Fails
**Solution**: 
- Check IAM permissions include ECR access
- Verify template syntax is correct
- Review CloudFormation events for specific error messages
- Ensure all referenced resources (DBSecretArn, RDS instance) exist

---

## Additional Resources

- [Docker Documentation](https://docs.docker.com/)
- [Amazon ECR Documentation](https://docs.aws.amazon.com/ecr/)
- [AWS CloudFormation User Data](https://docs.aws.amazon.com/AWSEC2/latest/UserGuide/user-data.html)
- [Prisma with Docker](https://www.prisma.io/docs/guides/deployment/deployment)
- [AWS RDS Documentation](https://docs.aws.amazon.com/rds/)
- [AWS Secrets Manager](https://docs.aws.amazon.com/secretsmanager/)
- [Application Load Balancer](https://docs.aws.amazon.com/elasticloadbalancing/latest/application/)

---

## Bonus Challenges

1. **CI/CD Pipeline**: Create GitHub Actions workflow to build and push images to ECR automatically
2. **Blue-Green Deployment**: Implement zero-downtime deployments using ASG instance refresh
3. **Database Migrations**: Automate Prisma migrations in container startup script
4. **Monitoring Dashboard**: Set up CloudWatch Dashboard for container metrics
5. **Load Testing**: Use Apache Bench or k6 to test backend API under load
6. **Multi-Region Deployment**: Deploy the backend to multiple AWS regions

---

## Summary

In this task, you've learned to:
- ✅ Create a production-ready Dockerfile for a Node.js backend API
- ✅ Build and test Docker images locally
- ✅ Push Docker images to Amazon ECR
- ✅ Update CloudFormation User Data to deploy containers on EC2
- ✅ Integrate containerized backend with existing AWS infrastructure (RDS, ALB, S3/CloudFront)
- ✅ Manage secrets and environment variables in production

**Key Takeaway**: The frontend (S3/CloudFront) and database (RDS) were already deployed via CloudFormation. You only needed to:
1. Containerize the backend API
2. Push the image to ECR
3. Update the User Data in the CloudFormation template to run the Docker container

This demonstrates how Docker simplifies deployment by packaging the application and its dependencies into a single, portable container!

Good luck with your backend containerization! 🐳🚀

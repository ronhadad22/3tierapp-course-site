# Lambda Task: EC2 Scheduler with Docker and ECR

## Overview
In this task, you will create a containerized AWS Lambda function that automatically shuts down all EC2 instances every night. You'll build a Docker image, push it to Amazon ECR, and deploy it as a Lambda function triggered by EventBridge (CloudWatch Events).

## Learning Objectives
- Create a Docker image for AWS Lambda
- Push Docker images to Amazon ECR
- Write Python code to interact with AWS EC2 API
- Deploy containerized Lambda functions
- Schedule Lambda functions with EventBridge
- Implement AWS resource automation
- Use IAM roles and policies for Lambda

---

## Prerequisites
- AWS Account with EC2 and Lambda access
- Docker installed locally
- AWS CLI configured
- Basic Python knowledge
- Understanding of EC2 instances

---

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────┐
│                                                              │
│  ┌──────────────────┐         ┌──────────────────┐         │
│  │  EventBridge     │────────▶│  Lambda Function │         │
│  │  (Cron: Daily    │         │  (Docker/ECR)    │         │
│  │   at 11 PM)      │         └────────┬─────────┘         │
│  └──────────────────┘                  │                    │
│                                         │                    │
│                                         │ Stop Instances     │
│                                         ▼                    │
│                              ┌─────────────────────┐        │
│                              │   EC2 Instances     │        │
│                              │   (All Regions)     │        │
│                              └─────────────────────┘        │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

---

## Task Requirements

### Part 1: Create Lambda Function Code

Create a directory for your Lambda function:

```bash
mkdir ec2-scheduler-lambda
cd ec2-scheduler-lambda
```

#### 1.1: Create Python Lambda Handler

Create `lambda_function.py`:

```python
import json
import boto3
import os
from datetime import datetime

def lambda_handler(event, context):
    """
    Lambda function to stop all running EC2 instances across all regions
    """
    
    # Initialize results
    results = {
        'timestamp': datetime.utcnow().isoformat(),
        'regions_checked': [],
        'instances_stopped': [],
        'errors': []
    }
    
    # Get all AWS regions
    ec2_client = boto3.client('ec2')
    regions = [region['RegionName'] for region in ec2_client.describe_regions()['Regions']]
    
    print(f"Checking {len(regions)} regions for running EC2 instances...")
    
    # Iterate through all regions
    for region in regions:
        try:
            results['regions_checked'].append(region)
            
            # Create EC2 client for this region
            regional_ec2 = boto3.client('ec2', region_name=region)
            
            # Find all running instances
            response = regional_ec2.describe_instances(
                Filters=[
                    {
                        'Name': 'instance-state-name',
                        'Values': ['running']
                    }
                ]
            )
            
            # Extract instance IDs
            instance_ids = []
            for reservation in response['Reservations']:
                for instance in reservation['Instances']:
                    instance_ids.append(instance['InstanceId'])
                    
                    # Get instance name tag if exists
                    instance_name = 'N/A'
                    if 'Tags' in instance:
                        for tag in instance['Tags']:
                            if tag['Key'] == 'Name':
                                instance_name = tag['Value']
                                break
                    
                    print(f"Found running instance in {region}: {instance['InstanceId']} ({instance_name})")
            
            # Stop instances if any found
            if instance_ids:
                print(f"Stopping {len(instance_ids)} instances in {region}...")
                regional_ec2.stop_instances(InstanceIds=instance_ids)
                
                for instance_id in instance_ids:
                    results['instances_stopped'].append({
                        'region': region,
                        'instance_id': instance_id
                    })
                    
                print(f"Successfully stopped {len(instance_ids)} instances in {region}")
            else:
                print(f"No running instances found in {region}")
                
        except Exception as e:
            error_msg = f"Error in region {region}: {str(e)}"
            print(error_msg)
            results['errors'].append(error_msg)
    
    # Summary
    total_stopped = len(results['instances_stopped'])
    print(f"\n=== Summary ===")
    print(f"Total regions checked: {len(results['regions_checked'])}")
    print(f"Total instances stopped: {total_stopped}")
    print(f"Errors encountered: {len(results['errors'])}")
    
    return {
        'statusCode': 200,
        'body': json.dumps(results, indent=2)
    }
```

#### 1.2: Create Requirements File

Create `requirements.txt`:

```txt
boto3>=1.26.0
```

---

### Part 2: Create Dockerfile for Lambda

Create `Dockerfile`:

```dockerfile
# Use AWS Lambda Python base image
FROM public.ecr.aws/lambda/python:3.11

# Copy requirements file
COPY requirements.txt ${LAMBDA_TASK_ROOT}

# Install Python dependencies
RUN pip install --no-cache-dir -r requirements.txt

# Copy function code
COPY lambda_function.py ${LAMBDA_TASK_ROOT}

# Set the CMD to your handler
CMD [ "lambda_function.lambda_handler" ]
```

**Dockerfile Explanation**:
- Uses official AWS Lambda Python 3.11 base image
- Installs boto3 for AWS SDK
- Copies Lambda function code
- Sets the handler function as the entry point

---

### Part 3: Build and Test Docker Image Locally

#### 3.1: Build the Docker Image

```bash
docker build -t ec2-scheduler-lambda:latest .
```

#### 3.2: Test Locally (Optional)

You can test the Lambda function locally using the Lambda Runtime Interface Emulator:

```bash
# Run the container
docker run -p 9000:8080 \
  -e AWS_ACCESS_KEY_ID=your_access_key \
  -e AWS_SECRET_ACCESS_KEY=your_secret_key \
  -e AWS_DEFAULT_REGION=us-east-1 \
  ec2-scheduler-lambda:latest

# In another terminal, invoke the function
curl -XPOST "http://localhost:9000/2015-03-31/functions/function/invocations" \
  -d '{}'
```

**Note**: For local testing, use IAM credentials with EC2 read/stop permissions. Never commit credentials to Git!

---

### Part 4: Push Image to Amazon ECR

#### 4.1: Create ECR Repository

```bash
aws ecr create-repository \
  --repository-name ec2-scheduler-lambda \
  --region us-east-1
```

#### 4.2: Authenticate Docker to ECR

```bash
aws ecr get-login-password --region us-east-1 | \
  docker login --username AWS --password-stdin \
  YOUR_ACCOUNT_ID.dkr.ecr.us-east-1.amazonaws.com
```

Replace `YOUR_ACCOUNT_ID` with your AWS account ID.

#### 4.3: Tag and Push Image

```bash
# Tag the image
docker tag ec2-scheduler-lambda:latest \
  YOUR_ACCOUNT_ID.dkr.ecr.us-east-1.amazonaws.com/ec2-scheduler-lambda:latest

# Push to ECR
docker push YOUR_ACCOUNT_ID.dkr.ecr.us-east-1.amazonaws.com/ec2-scheduler-lambda:latest
```

#### 4.4: Verify Image in ECR

```bash
aws ecr describe-images \
  --repository-name ec2-scheduler-lambda \
  --region us-east-1
```

---

### Part 5: Create IAM Role for Lambda

#### 5.1: Create Trust Policy

Create `lambda-trust-policy.json`:

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Principal": {
        "Service": "lambda.amazonaws.com"
      },
      "Action": "sts:AssumeRole"
    }
  ]
}
```

#### 5.2: Create IAM Role

```bash
aws iam create-role \
  --role-name EC2SchedulerLambdaRole \
  --assume-role-policy-document file://lambda-trust-policy.json
```

#### 5.3: Create EC2 Stop Policy

Create `ec2-stop-policy.json`:

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
        "ec2:DescribeRegions",
        "ec2:DescribeInstances",
        "ec2:StopInstances"
      ],
      "Resource": "*"
    },
    {
      "Effect": "Allow",
      "Action": [
        "logs:CreateLogGroup",
        "logs:CreateLogStream",
        "logs:PutLogEvents"
      ],
      "Resource": "arn:aws:logs:*:*:*"
    }
  ]
}
```

#### 5.4: Attach Policies to Role

```bash
# Attach custom EC2 policy
aws iam put-role-policy \
  --role-name EC2SchedulerLambdaRole \
  --policy-name EC2StopPolicy \
  --policy-document file://ec2-stop-policy.json

# Attach AWS managed policy for Lambda basic execution
aws iam attach-role-policy \
  --role-name EC2SchedulerLambdaRole \
  --policy-arn arn:aws:iam::aws:policy/service-role/AWSLambdaBasicExecutionRole
```

---

### Part 6: Create Lambda Function

#### 6.1: Create Lambda Function from ECR Image

```bash
aws lambda create-function \
  --function-name EC2NightlyScheduler \
  --package-type Image \
  --code ImageUri=YOUR_ACCOUNT_ID.dkr.ecr.us-east-1.amazonaws.com/ec2-scheduler-lambda:latest \
  --role arn:aws:iam::YOUR_ACCOUNT_ID:role/EC2SchedulerLambdaRole \
  --timeout 300 \
  --memory-size 256 \
  --region us-east-1
```

**Parameters Explained**:
- `--timeout 300`: 5 minutes (enough time to check all regions)
- `--memory-size 256`: 256 MB (sufficient for this task)
- `--package-type Image`: Indicates this is a container image

#### 6.2: Test Lambda Function

```bash
aws lambda invoke \
  --function-name EC2NightlyScheduler \
  --region us-east-1 \
  response.json

# View the response
cat response.json
```

---

### Part 7: Schedule Lambda with EventBridge

#### 7.1: Create EventBridge Rule

Create a rule that triggers every night at 11 PM UTC:

```bash
aws events put-rule \
  --name EC2NightlyShutdown \
  --schedule-expression "cron(0 23 * * ? *)" \
  --state ENABLED \
  --description "Trigger EC2 shutdown Lambda every night at 11 PM UTC" \
  --region us-east-1
```

**Cron Expression Explained**:
- `cron(0 23 * * ? *)` = Every day at 23:00 (11 PM) UTC
- Format: `cron(Minutes Hours Day-of-month Month Day-of-week Year)`

**Other Schedule Examples**:
```bash
# Every night at 10 PM UTC
cron(0 22 * * ? *)

# Every weekday at 11 PM UTC
cron(0 23 ? * MON-FRI *)

# Every day at 11:30 PM UTC
cron(30 23 * * ? *)
```

#### 7.2: Add Lambda Permission for EventBridge

```bash
aws lambda add-permission \
  --function-name EC2NightlyScheduler \
  --statement-id EventBridgeInvoke \
  --action lambda:InvokeFunction \
  --principal events.amazonaws.com \
  --source-arn arn:aws:events:us-east-1:YOUR_ACCOUNT_ID:rule/EC2NightlyShutdown \
  --region us-east-1
```

#### 7.3: Add Lambda as Target to EventBridge Rule

```bash
aws events put-targets \
  --rule EC2NightlyShutdown \
  --targets "Id"="1","Arn"="arn:aws:lambda:us-east-1:YOUR_ACCOUNT_ID:function:EC2NightlyScheduler" \
  --region us-east-1
```

#### 7.4: Verify EventBridge Rule

```bash
aws events describe-rule \
  --name EC2NightlyShutdown \
  --region us-east-1

aws events list-targets-by-rule \
  --rule EC2NightlyShutdown \
  --region us-east-1
```

---

### Part 8: Monitor and Verify

#### 8.1: View CloudWatch Logs

```bash
# List log streams
aws logs describe-log-streams \
  --log-group-name /aws/lambda/EC2NightlyScheduler \
  --order-by LastEventTime \
  --descending \
  --max-items 5 \
  --region us-east-1

# View latest log stream
aws logs tail /aws/lambda/EC2NightlyScheduler --follow --region us-east-1
```

#### 8.2: Check Lambda Metrics

```bash
aws cloudwatch get-metric-statistics \
  --namespace AWS/Lambda \
  --metric-name Invocations \
  --dimensions Name=FunctionName,Value=EC2NightlyScheduler \
  --start-time $(date -u -d '1 day ago' +%Y-%m-%dT%H:%M:%S) \
  --end-time $(date -u +%Y-%m-%dT%H:%M:%S) \
  --period 3600 \
  --statistics Sum \
  --region us-east-1
```

---

## Enhancements and Variations

### Enhancement 1: Add Tag-Based Filtering

Modify the Lambda function to only stop instances with specific tags:

```python
# In lambda_function.py, add tag filtering
response = regional_ec2.describe_instances(
    Filters=[
        {
            'Name': 'instance-state-name',
            'Values': ['running']
        },
        {
            'Name': 'tag:AutoShutdown',
            'Values': ['true']
        }
    ]
)
```

### Enhancement 2: Add SNS Notifications

Send an email notification with the summary:

```python
import boto3

sns_client = boto3.client('sns')

# At the end of lambda_handler
sns_client.publish(
    TopicArn='arn:aws:sns:us-east-1:YOUR_ACCOUNT_ID:EC2ShutdownNotifications',
    Subject='EC2 Nightly Shutdown Report',
    Message=json.dumps(results, indent=2)
)
```

### Enhancement 3: Add Environment Variables

Make the schedule configurable via environment variables:

```bash
aws lambda update-function-configuration \
  --function-name EC2NightlyScheduler \
  --environment Variables={SHUTDOWN_TAG=AutoShutdown,REGIONS=us-east-1,eu-west-1} \
  --region us-east-1
```

### Enhancement 4: Create Start Function

Create a companion function to start instances in the morning:

```python
# In start_instances.py
regional_ec2.start_instances(InstanceIds=instance_ids)
```

Schedule it for 7 AM:
```bash
aws events put-rule \
  --name EC2MorningStartup \
  --schedule-expression "cron(0 7 * * ? *)" \
  --state ENABLED
```

---

## Deliverables

Submit the following:

1. **Lambda Function Code**:
   - `lambda_function.py`
   - `requirements.txt`
   - `Dockerfile`

2. **IAM Policies**:
   - `lambda-trust-policy.json`
   - `ec2-stop-policy.json`

3. **Documentation**:
   - `README.md` with:
     - Setup instructions
     - How to modify the schedule
     - How to add tag-based filtering
     - Troubleshooting guide

4. **Screenshots**:
   - ECR repository with pushed image
   - Lambda function created from ECR image
   - EventBridge rule configuration
   - CloudWatch logs showing successful execution
   - EC2 instances being stopped

5. **Testing Evidence**:
   - Manual Lambda invocation results
   - CloudWatch logs showing instances stopped
   - EventBridge rule execution history

---

## Evaluation Criteria

- **Docker Image Quality** (20%): Proper Dockerfile, optimized layers, correct base image
- **Lambda Function Code** (25%): Clean code, error handling, logging, multi-region support
- **IAM Permissions** (15%): Least privilege principle, correct policies
- **ECR Push** (10%): Successfully built and pushed to ECR
- **EventBridge Configuration** (15%): Correct cron expression, proper triggers
- **Testing and Verification** (10%): Proof of successful execution
- **Documentation** (5%): Clear instructions and explanations

---

## Helpful Commands

```bash
# Docker Commands
docker build -t ec2-scheduler-lambda:latest .
docker images
docker run -p 9000:8080 ec2-scheduler-lambda:latest

# ECR Commands
aws ecr get-login-password --region us-east-1 | docker login --username AWS --password-stdin ACCOUNT_ID.dkr.ecr.us-east-1.amazonaws.com
aws ecr describe-repositories
aws ecr describe-images --repository-name ec2-scheduler-lambda

# Lambda Commands
aws lambda list-functions
aws lambda get-function --function-name EC2NightlyScheduler
aws lambda invoke --function-name EC2NightlyScheduler response.json
aws lambda update-function-code --function-name EC2NightlyScheduler --image-uri NEW_IMAGE_URI

# EventBridge Commands
aws events list-rules
aws events describe-rule --name EC2NightlyShutdown
aws events disable-rule --name EC2NightlyShutdown  # Temporarily disable
aws events enable-rule --name EC2NightlyShutdown   # Re-enable

# CloudWatch Logs
aws logs tail /aws/lambda/EC2NightlyScheduler --follow
aws logs filter-log-events --log-group-name /aws/lambda/EC2NightlyScheduler --filter-pattern "ERROR"

# IAM Commands
aws iam get-role --role-name EC2SchedulerLambdaRole
aws iam list-attached-role-policies --role-name EC2SchedulerLambdaRole
```

---

## Common Issues and Solutions

### Issue 1: Lambda Timeout
**Solution**: Increase timeout if checking many regions:
```bash
aws lambda update-function-configuration \
  --function-name EC2NightlyScheduler \
  --timeout 600
```

### Issue 2: Permission Denied Errors
**Solution**: Verify IAM role has correct permissions:
```bash
aws iam get-role-policy --role-name EC2SchedulerLambdaRole --policy-name EC2StopPolicy
```

### Issue 3: EventBridge Not Triggering
**Solution**: 
- Check rule is enabled: `aws events describe-rule --name EC2NightlyShutdown`
- Verify Lambda has permission: `aws lambda get-policy --function-name EC2NightlyScheduler`

### Issue 4: Image Too Large
**Solution**: Optimize Dockerfile:
```dockerfile
# Use slim base image
FROM public.ecr.aws/lambda/python:3.11

# Install only required packages
RUN pip install --no-cache-dir boto3
```

### Issue 5: Can't Access ECR Image
**Solution**: Ensure Lambda execution role has ECR permissions:
```json
{
  "Effect": "Allow",
  "Action": [
    "ecr:GetDownloadUrlForLayer",
    "ecr:BatchGetImage"
  ],
  "Resource": "*"
}
```

---

## Additional Resources

- [AWS Lambda Container Images](https://docs.aws.amazon.com/lambda/latest/dg/images-create.html)
- [Amazon ECR Documentation](https://docs.aws.amazon.com/ecr/)
- [EventBridge Cron Expressions](https://docs.aws.amazon.com/eventbridge/latest/userguide/eb-create-rule-schedule.html)
- [Boto3 EC2 Documentation](https://boto3.amazonaws.com/v1/documentation/api/latest/reference/services/ec2.html)
- [Lambda Best Practices](https://docs.aws.amazon.com/lambda/latest/dg/best-practices.html)

---

## Bonus Challenges

1. **Cost Optimization**: Add logic to skip stopping instances with specific tags (e.g., `AlwaysOn=true`)
2. **Slack Notifications**: Send shutdown reports to Slack webhook
3. **Dry Run Mode**: Add environment variable to test without actually stopping instances
4. **Instance State Tracking**: Store instance states in DynamoDB before stopping
5. **Multi-Account Support**: Use AWS Organizations to stop instances across multiple accounts
6. **Smart Scheduling**: Only stop instances that have been running for more than X hours
7. **Web Dashboard**: Create API Gateway + Lambda to view shutdown history

---

## Cost Considerations

**Estimated Monthly Costs** (assuming 30 executions/month):
- Lambda executions: ~$0.00 (within free tier)
- CloudWatch Logs: ~$0.50
- ECR storage: ~$0.10/GB
- **Total**: < $1.00/month

**Cost Savings**:
- If shutting down 10 t3.medium instances for 12 hours/day
- Savings: ~$200-300/month
- ROI: Immediate!

---

Good luck with your EC2 Scheduler Lambda function! 🚀⏰

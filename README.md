# 🚀 Deployment Architecture & Setup

This project consists of **three independently deployed components**:

1. **Backend (Node.js API)** – Core business logic  
2. **Next.js User Application** – Frontend for end users  
3. **React Admin Portal** – Frontend for administrators  

This document focuses on **Part 1: Backend Deployment**, which was the most complex and critical component.

---

## Part 1: Deploying the Backend (Node.js API)

The backend was deployed using a **containerized, CI/CD-driven, cloud-native approach** on AWS.  
The deployment process was divided into **three phases**:

---

## Phase A: Containerization with Docker

The first step was to package the backend into a **portable Docker image**.

### Dockerfile

A custom `Dockerfile` was created to define the application image:

- Used a lightweight base image: `node:18-alpine`
- Installed **Redis** directly inside the container
- Copied backend source code into the image
- Installed all npm dependencies
- Exposed the application port

```bash

# Stage 1: Use the official Node.js 18 Alpine image as a base
# Alpine Linux is very lightweight, which makes our final image smaller.
FROM node:18-alpine

# Install Redis server using the Alpine package manager (apk)
RUN apk add --no-cache redis

# Set the working directory inside the container
WORKDIR /app

# Copy package.json and package-lock.json first to leverage Docker's layer caching.
# This step will only be re-run if these files change.
COPY package*.json ./

# Install only production dependencies to keep the image size down
RUN npm install --only=production

# Copy the rest of your application's code into the container
COPY . .

# Copy the entrypoint script that will start our services
COPY entrypoint.sh /entrypoint.sh

# Make the entrypoint script executable
RUN chmod +x /entrypoint.sh

# Expose the port your Node.js application runs on
EXPOSE 5001

# Define the entrypoint for the container. This script will be executed when the container starts.
ENTRYPOINT ["/entrypoint.sh"]
```



### Entrypoint Script

An `entrypoint.sh` script was created to manage container startup:

- Starts the Redis server in the background
- Starts the Node.js application in the foreground

This ensured both services run within the same container lifecycle.

```bash
#!/bin/sh

# Start the Redis server in the background
# The '--daemonize yes' flag tells Redis to run as a background process.
redis-server --daemonize yes

# Start the Node.js application in the foreground
# 'exec' replaces the shell process with the Node process, which is a best practice
# for container entrypoints as it ensures signals (like stop commands) are handled correctly.
exec node server.js
```

### Local Build & Testing

The image was built and tested locally:

```bash
docker build -t fleet-backend .
docker run -p 5001:5001 -e VAR=value fleet-backend
```
## Phase B: Automation with GitHub Actions (CI/CD)

After stabilizing the container, the build and deployment pipeline was fully automated using GitHub Actions.

---

### AWS IAM Setup

- Created a dedicated **IAM User**
- Assigned permission:
  - `AmazonEC2ContainerRegistryPowerUser`
- Generated secure credentials:
  - `AWS_ACCESS_KEY_ID`
  - `AWS_SECRET_ACCESS_KEY`
  <img width="1470" height="711" alt="image" src="https://github.com/user-attachments/assets/7b9da00b-902a-4fd2-b34f-8e90f6cd9739" />

---

### Amazon ECR Repository

- Created a private Amazon ECR repository:
fleet-management-backend:
  - Collected required details:
  - Repository URI
  - AWS Region
<img width="1469" height="723" alt="image" src="https://github.com/user-attachments/assets/6b21da4e-6fc1-4f43-a3ac-c847e5385737" />


---

### GitHub Secrets:
```bash
# Server Configuration
NODE_ENV=development
PORT=5001

# MongoDB Connection
MONGO_URI=mongodb://127.0.0.1:27017/fleet-management-system

# Access Token (short-lived)
JWT_ACCESS_SECRET=your-very-strong-jwt-access-secret-key-123
JWT_ACCESS_EXPIRES_IN=15m

# Refresh Token (long-lived)
JWT_REFRESH_Sc=your-very-strong-jwt-refresh-sc-key-456
JWT_REFRESH_EXPIRES_IN=7d

# Redis Configuration (for local instance)
REDIS_HOST=127.0.0.1
REDIS_PORT=6379

# Email Configuration (using Mailtrap for development)
EMAIL_HOST=sandbox.smtp.mailtrap.io  # <-- IMPORTANT: Use the new host
EMAIL_PORT=2525
EMAIL_USER=a5353ebcb91e43
EMAIL_PASS=bd745c59f6c75e
EMAIL_FROM="Fleet Management" <noreply@fleet.com>
```
<img width="1463" height="747" alt="image" src="https://github.com/user-attachments/assets/444ac247-6ec9-4f04-82cd-496d7a267b16" />

---

### CI/CD Workflow (`deploy.yml`)

A GitHub Actions workflow was created to trigger automatically on every push to the `main` branch.

The workflow performs the following steps:

1. Authenticates with AWS using IAM credentials
2. Logs in to Amazon ECR
3. Builds the Docker image
4. Tags the image using the Git commit hash
5. Pushes the image to the ECR repository

This ensures that **every commit produces a uniquely versioned, deployable backend image**.
### github actions workflow
```bash 

# This is the name of the workflow that will appear in the "Actions" tab of your GitHub repository.
name: Build and Push Backend to AWS ECR

# This section defines when the workflow should automatically run.
on:
  push:
    # We are targeting only the 'main' branch. A push to any other branch will not trigger this workflow.
    branches: [ "main" ]

# Environment variables that are available to all jobs within this workflow.
# This makes it easy to reference these values without repeating them.
env:
  # The AWS region where your ECR repository exists. It reads from the GitHub secret.
  AWS_REGION: ${{ sc.AWS_REGION }}
# 'jobs' defines a sequence of tasks to be executed.
jobs:
  # We have one job named 'build-and-push'.
  build-and-push:
    name: Build and Push to ECR
    # This specifies that the job will run on a fresh virtual machine hosted by GitHub, running the latest version of Ubuntu.
    runs-on: ubuntu-latest
  # 'steps' are the individual commands or actions that make up the job.
    steps:
      # Step 1: Check out the repository code
      # This downloads your source code (including the Dockerfile) onto the virtual machine.
      - name: Checkout code
        uses: actions/checkout@v3
  # Step 2: Configure AWS credentials
      # This action securely logs in to your AWS account using the temporary credentials
      # stored as sc in your GitHub repository settings.
      - name: Configure AWS credentials
        uses: aws-actions/configure-aws-credentials@v2
        with:
          aws-access-ke-id: ${{ secrets.AWS_ACCESS_KEY_ID }}
          aws-secret-access-ke: ${{ secrets.AWS_SECRET_ACCESS_ke }}
          aws-region: ${{ env.AWS_REGION }}
 # Step 3: Log in to Amazon ECR
      # This step uses the credentials from the previous step to authenticate the Docker client
      # on the virtual machine against your private Amazon ECR registry.
      - name: Log in to Amazon ECR
        id: login-ecr
        uses: aws-actions/amazon-ecr-login@v1

      # Step 4: Build, tag, and push the image to Amazon ECR
      # This is the core step where your Docker image is built and uploaded.
      - name: Build, tag, and push image to ECR
        id: build-image
  run: |
          # Define a unique tag for the Docker image. Using the Git commit hash (`github.sha`)
          # is a best practice as it ensures every commit has a unique, traceable image version.
          IMAGE_TAG=${{ github.sha }}
          
          # This command runs the 'docker build' process, just like you did locally.
          # It tags the image with the ECR repository URI and the unique commit hash.
          docker build -t $ECR_REPOSITORY_URI:$IMAGE_TAG .
          
          # This command uploads the built image to your private ECR repository.
          docker push $ECR_REPOSITORY_URI:$IMAGE_TAG
          
          # This line is optional but useful. It prints the full image URI and tag,
          # which can be seen in the workflow logs.
          echo "Pushed image: $ECR_REPOSITORY_URI:$IMAGE_TAG"

```


---

## Phase C: Infrastructure Setup & Deployment on AWS ECS

This phase involved a **one-time cloud infrastructure setup** to run the backend in a production environment.

---

### Database Setup (MongoDB Atlas)

- Local MongoDB could not be accessed from the cloud environment
- Created a **MongoDB Atlas free-tier cluster**
- Generated a cloud-based connection URI
- Configured network access to allow inbound connections
<img width="1459" height="875" alt="image" src="https://github.com/user-attachments/assets/0168e0d0-0c7f-40ec-8bbf-2274ddd0d994" />


---

### Networking (VPC)

- Used the AWS **Default VPC** for simplicity
- Avoided custom subnet configuration to speed up deployment

---

### Security Group
Created a security group:
fleet-mgmt-sg-default

Configured inbound rules to:

- Allow traffic from the **Application Load Balancer**
- Allow traffic on backend port `5001`
<img width="1462" height="711" alt="image" src="https://github.com/user-attachments/assets/13e5904c-a35e-4401-b0e2-92b283d5f5e3" />

---

### ECS Cluster

- Created an ECS cluster:
fleet-management-cluster

- Launch type:
- **AWS Fargate** (serverless container execution)
<img width="1455" height="687" alt="image" src="https://github.com/user-attachments/assets/1f8ed09b-bac9-4843-a13b-b62d164877f0" />


---

### ECS Task Definition

Configured the ECS task definition with:

- Full Amazon ECR image URI and tag
- CPU and memory allocation
- Environment variables:
- MongoDB Atlas URI
- Redis configuration
- Application secrets
<img width="1461" height="808" alt="image" src="https://github.com/user-attachments/assets/5b4f9a74-b6c1-40e2-94c6-774d208c052a" />


---

### ECS Service & Load Balancer

Created an ECS service:
fleet-management-service


Key features:

- Runs a single container instance
- Automatically provisions an **Application Load Balancer (ALB)**
- Exposes a public backend URL
- Continuously monitors container health and restarts on failure
<img width="1464" height="715" alt="image" src="https://github.com/user-attachments/assets/99ce4fae-9511-4d6c-b3d0-761ddb3f8b31" />

---

### Debugging & Finalization

Issues encountered and resolved during deployment:

- `CannotPullContainerError`
- Request timeouts
- Unhealthy target group

Resolution steps included:

- Inspecting stopped ECS tasks
- Reviewing logs in **CloudWatch**
- Correcting image URI, IAM permissions, and security group rules

---

### Final State

- ECS target group status: **Healthy**
- Backend API is **publicly accessible** and production-ready
<img width="1462" height="722" alt="image" src="https://github.com/user-attachments/assets/3921d430-0060-48aa-be88-bcea23d94a7b" />


## Part 2 & 3: Deploying the Frontend Applications (Amazon S3)

Once the backend was live and publicly accessible via the **Application Load Balancer (ALB) DNS URL**, deploying the frontend applications became a simpler and repeatable process.

Both frontend applications were deployed as **static websites** using **Amazon S3**.

---

### Frontend Applications

- **Frontend 1:** Next.js User Application  
- **Frontend 2:** React Admin Portal  

---

### Configuration

For both frontend projects, the environment configuration was updated to point to the live backend API.

- Updated environment variable files:
  - Next.js: `.env.local`
  - React: `.env`

- Changed API base URL from:
  NEXT_PUBLIC_API_URL= http://localhost:5001/api
to:
   NEXT_PUBLIC_API_URL= http://fleet-mgmt-alb-default-1630791645.eu-north-1.elb.amazonaws.com/api


- **Frontend 1:** Next.js User Application  
- **Frontend 2:** React Admin Portal  

This ensured all API requests from the frontend hit the production backend.

---

### Build Process

Each application was built locally to generate static assets.

- **Next.js User App**
```bash
npm run build
```
Output:

out/

-**React Admin Portal**
```bash
npm run build
```
Output:

dist/


---
## Amazon S3 Bucket Setup (Performed Twice)

For **each frontend application**, the following steps were performed in AWS S3:

- Created a new **globally unique S3 bucket**
<img width="1461" height="647" alt="image" src="https://github.com/user-attachments/assets/e0fbc57a-cc65-403f-ba4e-48e483be7e75" />

- Disabled **“Block all public access”**

<img width="1470" height="777" alt="image" src="https://github.com/user-attachments/assets/4ebe4b67-8efe-48c4-92ce-62b63b6b739f" />

- Enabled **Static website hosting**
  - Index document: `index.html`
  - Error document: `index.html`
<img width="1451" height="737" alt="image" src="https://github.com/user-attachments/assets/fc1ff922-35fc-424e-8f88-a3a5847f5db8" />

  
- Applied a **public read bucket policy** to allow visitors to access the files
<img width="1453" height="719" alt="image" src="https://github.com/user-attachments/assets/70c9420d-077d-45c6-940b-0918667b76e4" />



---

## Upload & Deployment

For each frontend application:

- Uploaded the contents of the build folder directly to the **root of the S3 bucket**:
  - Next.js → `out/`
  - <img width="1176" height="687" alt="image" src="https://github.com/user-attachments/assets/b92045ca-538e-4a0b-b060-ac2f6bf78661" />

  - React → `dist/`
  - <img width="1177" height="592" alt="image" src="https://github.com/user-attachments/assets/3972c5c4-7476-4b98-9070-aca6b8f1f491" />

- Used drag-and-drop via the AWS S3 Console

Once uploaded, each application became accessible via its **S3 Static Website Endpoint**.

---

## ✅ Result

- Both frontend applications deployed as **static websites**
- Successfully integrated with the **live backend API**
- Highly scalable and **low-cost hosting** using Amazon S3
- Simple, repeatable, and production-ready deployment process



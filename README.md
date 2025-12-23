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

### Entrypoint Script

An `entrypoint.sh` script was created to manage container startup:

- Starts the Redis server in the background
- Starts the Node.js application in the foreground

This ensured both services run within the same container lifecycle.

### Local Build & Testing

The image was built and tested locally:

```bash
docker build -t fleet-backend .
docker run -p 5001:5001 -e VAR=value fleet-backend

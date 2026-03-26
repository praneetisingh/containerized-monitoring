# Deployment Guide

Because everything in this project is already fully containerized with **Docker** and managed by **Docker Compose**, deploying this application to production is incredibly simple! 

The most effective way to deploy a multi-service application that requires a shared disk volume (like our internal `shared-logs` directory) is to use a **Virtual Private Server (VPS)**.

## Recommended Cloud Providers
- **DigitalOcean** (Droplet)
- **AWS** (EC2 Instance)
- **Linode / Akamai**
- **Google Cloud** (Compute Engine)

## Step-by-Step Deployment Instructions

### 1. Provision a Linux Server
Spin up a basic Ubuntu server (Ubuntu 22.04 LTS is highly recommended). A standard affordable machine with 1GB or 2GB of RAM is perfectly adequate for this stack. 

*🚨 Ensure your server's security group / firewall is configured to allow inbound traffic on port `3000` (HTTP).*

### 2. Connect to the Server
SSH into your new server from your terminal:
```bash
ssh root@<YOUR_SERVER_IP_ADDRESS>
```

### 3. Install Docker and Git
Update your package manager and install the necessary deployment tools:
```bash
sudo apt-get update
sudo apt-get install -y git docker.io docker-compose
```

### 4. Clone Your Repository
Download your code securely from GitHub:
```bash
git clone https://github.com/praneetisingh/containerized-monitoring.git
cd containerized-monitoring
```

### 5. Launch the Application
Start the entire stack in detached mode. Since Docker Compose heavily utilizes Infrastructure as Code (IaC), it handles all the internal networking, port mapping, and volume creation automatically via a single command:
```bash
sudo docker-compose up --build -d
```

### 6. Access Your Dashboard!
Open your web browser and navigate to:
`http://<YOUR_SERVER_IP_ADDRESS>:3000`

You will instantly see the Nexus Telemetry Dashboard live on the internet! 

## Internal Port Architecture
- **Frontend Dashboard**: `Port 3000` (This is the only port users interact with!)
- **Demo App**: `Port 5000` (Backend log generator)
- **Monitor API**: `Port 8000` (Backend telemetry server)

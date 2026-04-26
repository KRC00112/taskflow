#!/bin/bash
apt-get update -y
apt-get install -y docker.io git
systemctl start docker
systemctl enable docker
curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
chmod +x /usr/local/bin/docker-compose
usermod -aG docker ubuntu

cd /home/ubuntu
git clone https://github.com/KRC00112/taskflow.git
cd taskflow
docker-compose up --build -d
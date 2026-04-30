# Taskflow

A distributed task processing system built with a microservices architecture. Demonstrates asynchronous job processing, message queuing, containerization, cloud deployment, and CI/CD automation.

## What it is

Taskflow is a two-service backend system that separates HTTP request handling from background processing. When a task is created via the API, it is published to a message queue and processed asynchronously by a worker service. This mirrors real-world patterns used in order processing, notification, and job queue systems.

## Architecture

```
HTTP Client
     │
     ▼
API Service (Node.js)
     │
     ├──── PostgreSQL (stores tasks + status)
     │
     └──── RabbitMQ (publishes job)
                │
                ▼
         Worker Service (Node.js)
                │
                └──── PostgreSQL (updates status: pending → processing → done)
```

All services run as Docker containers on AWS EC2, provisioned with Terraform and deployed automatically via GitHub Actions.

## Tech Stack

| Layer | Technology |
|-------|-----------|
| API Service | Node.js, Express |
| Worker Service | Node.js |
| Message Queue | RabbitMQ (quorum queues) |
| Database | PostgreSQL |
| Logging | Winston (structured JSON logs) |
| Containerization | Docker, Docker Compose |
| Infrastructure | AWS EC2, Terraform |
| CI/CD | GitHub Actions |
| Observability | CloudWatch, /metrics endpoint, structured logs |

## API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/` | Create a task |
| GET | `/` | Get all tasks |
| GET | `/:id` | Get a task by ID |
| GET | `/metrics` | Get task counts by status |

**Creating a task with Postman:**

Send a POST request to `http://<PUBLIC_IP>:3000` with the following JSON body:

```json
{
  "title": "my task"
}
```

**Response:**

```json
{
  "id": 1,
  "title": "my task",
  "status": "pending",
  "created_at": "2026-04-27T10:00:00.000Z"
}
```

The worker picks up the job and updates the status: `pending → processing → done`.

## CI/CD Pipeline

Every push to `main` triggers a GitHub Actions workflow that:

1. SSHs into the EC2 instance
2. Pulls the latest code from GitHub
3. Rebuilds Docker images
4. Restarts the stack

Secrets stored in GitHub: `EC2_HOST`, `EC2_USER`, `EC2_SSH_KEY`.

## Infrastructure

Provisioned with Terraform:

- AWS EC2 `t3.micro` instance (Ubuntu 24.04)
- Security group with ports 22, 3000, 15672
- SSH key pair

```bash
cd terraform
terraform init
terraform apply
```

## Observability

- **Structured logs** - Winston emits JSON logs with `task_id`, `title`, `duration_ms`, and `error` fields
- **Metrics endpoint** - `GET /metrics` returns live counts of tasks by status
- **CloudWatch** - both containers ship logs to the `taskflow` log group in AWS CloudWatch via the `awslogs` Docker driver

## Design Decisions

**Separating API and Worker services**

The API can respond immediately without waiting for processing to complete. If the worker is slow or crashes, the API stays unaffected. This is the foundation of any resilient backend system.

**Choosing RabbitMQ over direct HTTP calls between services**

Direct HTTP between services creates tight coupling. If the worker is down, the API fails too. RabbitMQ acts as a buffer: jobs queue up and are processed when the worker is ready. Quorum queues ensure no jobs are lost even if RabbitMQ restarts.

**Docker Compose over Kubernetes**

Kubernetes adds significant operational overhead that isn't justified for a two-service system. Docker Compose keeps the deployment simple and reproducible while still demonstrating containerization and multi-service orchestration.

**Terraform over manual AWS setup**

Infrastructure as code means the entire AWS setup can be recreated from scratch with one command. No clicking through consoles, no undocumented manual steps.

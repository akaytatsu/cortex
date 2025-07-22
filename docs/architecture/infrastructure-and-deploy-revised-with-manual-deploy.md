# Infrastructure and Deploy (Revised with Manual Deploy)

## Infrastructure as Code (IaC)

- **Tool:** Docker and Docker Compose.
- **Approach:** A `Dockerfile` with multi-stage builds for optimized production images and a `docker-compose.yml` for local development.

## Deployment Strategy (Manual)

The deployment will be a manual process:

1.  **Build Image:** Build the production Docker image locally.
2.  **Publish Image:** Push the image to a container registry.
3.  **Access Server:** SSH into the target server.
4.  **Update:** Pull the new image and restart the service using Docker Compose.

## Environments

- **Development (Local):** Run via `docker-compose up`.
- **Staging:** A server for pre-production testing.
- **Production:** The live server for users.

## Rollback Strategy (Manual)

- Rollback consists of manually re-deploying the previous stable image tag from the container registry.

---

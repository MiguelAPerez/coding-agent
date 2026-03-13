FROM ubuntu:24.04

# Avoid prompts from apt
ENV DEBIAN_FRONTEND=noninteractive

# Install git, ssh, and ca-certificates
RUN apt-get update && apt-get install -y \
    git \
    openssh-client \
    ca-certificates \
    && rm -rf /var/lib/apt/lists/*

# Create a non-root user
RUN useradd -m -s /bin/bash agent

# Set the working directory
WORKDIR /workspace

# Switch to the non-root user
USER agent

# Default command
CMD ["git", "--version"]

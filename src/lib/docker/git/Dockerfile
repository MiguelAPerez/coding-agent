FROM ubuntu:24.04

# Avoid prompts from apt
ENV DEBIAN_FRONTEND=noninteractive

# Install git, ssh, ca-certificates and sudo
RUN apt-get update && apt-get install -y \
    git \
    openssh-client \
    ca-certificates \
    sudo \
    && rm -rf /var/lib/apt/lists/*

# Create a non-root user and give them sudo access
RUN useradd -m -s /bin/bash agent && \
    echo "agent ALL=(ALL) NOPASSWD:ALL" >> /etc/etc/sudoers.d/agent || \
    echo "agent ALL=(ALL) NOPASSWD:ALL" >> /etc/sudoers

# Set the working directory
WORKDIR /workspace

# Switch to the non-root user
USER agent

# Default command
CMD ["git", "--version"]

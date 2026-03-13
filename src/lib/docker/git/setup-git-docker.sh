#!/bin/bash

# Get the directory where this script is located
DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" >/dev/null 2>&1 && pwd )"

echo "Building coding-agent-git Docker image..."
docker build -t coding-agent-git "$DIR"

if [ $? -eq 0 ]; then
    echo "Successfully built coding-agent-git image."
else
    echo "Failed to build coding-agent-git image."
    exit 1
fi

#!/usr/bin/env bash
cd "$(dirname "$0")" || exit 1

if ! command -v node >/dev/null 2>&1; then
    echo "Error: Node.js is not found."
    echo "Please install Node.js 22.13 or newer from https://nodejs.org/"
    exit 1
fi

node server.js


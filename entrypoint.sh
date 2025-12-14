#!/bin/sh

# Start the Redis server in the background
# The '--daemonize yes' flag tells Redis to run as a background process.
redis-server --daemonize yes

# Start the Node.js application in the foreground
# 'exec' replaces the shell process with the Node process, which is a best practice
# for container entrypoints as it ensures signals (like stop commands) are handled correctly.
exec node server.js
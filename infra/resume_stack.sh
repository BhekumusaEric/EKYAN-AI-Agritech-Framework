#!/bin/bash
# EKYAN — Resume Stack (restarts Aurora)
# Run this when you're ready to work again: ./infra/resume_stack.sh

set -e

CLUSTER_ID="ekyanstack-ekyanaurora0be84d10-hvohfzooofjd"
REGION="af-south-1"

echo "▶️  Starting EKYAN Aurora cluster..."
aws rds start-db-cluster \
  --db-cluster-identifier "$CLUSTER_ID" \
  --region "$REGION" \
  --output text --query 'DBCluster.Status'

echo ""
echo "⏳ Cluster is starting — takes ~2 minutes to become available."
echo "   Waiting for available status..."

aws rds wait db-cluster-available \
  --db-cluster-identifier "$CLUSTER_ID" \
  --region "$REGION"

echo ""
echo "✅ Aurora cluster is AVAILABLE. Backend is ready."

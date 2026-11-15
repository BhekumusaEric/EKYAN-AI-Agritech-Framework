#!/bin/bash
# EKYAN — Pause Stack (stops billing on Aurora)
# Run this when you want to stop costs: ./infra/pause_stack.sh
# Aurora Serverless v2 is the ONLY resource with a continuous cost (~$43/mo at min ACU).
# DynamoDB, SQS, S3 are pay-per-use — they cost $0 when idle.

set -e

CLUSTER_ID="ekyanstack-ekyanaurora0be84d10-hvohfzooofjd"
REGION="af-south-1"

echo "⏸  Pausing EKYAN Aurora cluster..."
aws rds stop-db-cluster \
  --db-cluster-identifier "$CLUSTER_ID" \
  --region "$REGION" \
  --output text --query 'DBCluster.Status'

echo ""
echo "✅ Aurora cluster stopped. You will NOT be billed for ACU compute while stopped."
echo "   Storage costs (~\$0.10/GB/month) still apply but are negligible."
echo ""
echo "   To resume: ./infra/resume_stack.sh"

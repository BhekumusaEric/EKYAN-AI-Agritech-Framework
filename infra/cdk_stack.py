"""
EKYAN Connect — AWS CDK Infrastructure Stack
Replaces Supabase with: Aurora Serverless v2 (PostgreSQL), DynamoDB, SQS, S3
Region: af-south-1 (Cape Town — closest to Kenya)
"""

import os
import aws_cdk as cdk
from aws_cdk import (
    aws_rds as rds,
    aws_dynamodb as dynamodb,
    aws_sqs as sqs,
    aws_s3 as s3,
    aws_ec2 as ec2,
    aws_secretsmanager as secretsmanager,
    aws_budgets as budgets,
    Duration, RemovalPolicy,
)
from constructs import Construct

BUDGET_LIMIT_USD = float(os.getenv("EKYAN_BUDGET_USD", "20"))
BUDGET_ALERT_EMAIL = os.getenv("EKYAN_BUDGET_EMAIL", "bhekumusa.eric@gmail.com")


class EkyanStack(cdk.Stack):
    def __init__(self, scope: Construct, id: str, **kwargs):
        super().__init__(scope, id, **kwargs)

        # ── VPC ───────────────────────────────────────────────────────────────
        vpc = ec2.Vpc(self, "EkyanVpc",
            max_azs=2,
            nat_gateways=0,
            subnet_configuration=[
                ec2.SubnetConfiguration(name="public", subnet_type=ec2.SubnetType.PUBLIC),
                ec2.SubnetConfiguration(name="isolated", subnet_type=ec2.SubnetType.PRIVATE_ISOLATED),
            ],
        )

        # ── Aurora Serverless v2 (PostgreSQL 15 + PostGIS) ────────────────────
        db_secret = secretsmanager.Secret(self, "EkyanDbSecret",
            generate_secret_string=secretsmanager.SecretStringGenerator(
                secret_string_template='{"username":"ekyan_admin"}',
                generate_string_key="password",
                exclude_punctuation=True,
            ),
        )

        db_sg = ec2.SecurityGroup(self, "EkyanDbSg", vpc=vpc, allow_all_outbound=False)

        db_sg.add_ingress_rule(ec2.Peer.any_ipv4(), ec2.Port.tcp(5432), "public access for MVP")

        self.aurora = rds.DatabaseCluster(self, "EkyanAurora",
            engine=rds.DatabaseClusterEngine.aurora_postgres(
                version=rds.AuroraPostgresEngineVersion.VER_16_8
            ),
            credentials=rds.Credentials.from_secret(db_secret),
            serverless_v2_min_capacity=0.5,
            serverless_v2_max_capacity=4,
            writer=rds.ClusterInstance.serverless_v2("writer",
                publicly_accessible=True,
            ),
            vpc=vpc,
            vpc_subnets=ec2.SubnetSelection(subnet_type=ec2.SubnetType.PUBLIC),
            security_groups=[db_sg],
            default_database_name="ekyan",
            removal_policy=RemovalPolicy.SNAPSHOT,
        )

        # ── DynamoDB — farmer sessions & chat history ─────────────────────────
        self.sessions_table = dynamodb.Table(self, "EkyanSessions",
            partition_key=dynamodb.Attribute(name="phone", type=dynamodb.AttributeType.STRING),
            sort_key=dynamodb.Attribute(name="ts", type=dynamodb.AttributeType.STRING),
            billing_mode=dynamodb.BillingMode.PAY_PER_REQUEST,
            time_to_live_attribute="ttl",
            removal_policy=RemovalPolicy.DESTROY,
        )

        # ── DynamoDB — credit decisions cache ────────────────────────────────
        self.credit_table = dynamodb.Table(self, "EkyanCreditDecisions",
            partition_key=dynamodb.Attribute(name="farmer_id", type=dynamodb.AttributeType.STRING),
            billing_mode=dynamodb.BillingMode.PAY_PER_REQUEST,
            removal_policy=RemovalPolicy.DESTROY,
        )

        # ── SQS — climate nudge dispatch (WhatsApp/SMS) ───────────────────────
        nudge_dlq = sqs.Queue(self, "EkyanNudgeDlq", retention_period=Duration.days(14))
        self.nudge_queue = sqs.Queue(self, "EkyanNudgeQueue",
            visibility_timeout=Duration.seconds(60),
            dead_letter_queue=sqs.DeadLetterQueue(max_receive_count=3, queue=nudge_dlq),
        )

        # ── SQS — blocker reports (async persistence) ─────────────────────────
        self.blocker_queue = sqs.Queue(self, "EkyanBlockerQueue",
            visibility_timeout=Duration.seconds(30),
        )

        # ── S3 — crop images + NDVI tiles + Bedrock KB docs ──────────────────
        self.data_bucket = s3.Bucket(self, "EkyanDataBucket",
            versioned=True,
            encryption=s3.BucketEncryption.S3_MANAGED,
            block_public_access=s3.BlockPublicAccess.BLOCK_ALL,
            removal_policy=RemovalPolicy.RETAIN,
        )

        # ── Outputs ───────────────────────────────────────────────────────────
        cdk.CfnOutput(self, "AuroraEndpoint", value=self.aurora.cluster_endpoint.hostname)
        cdk.CfnOutput(self, "SessionsTable", value=self.sessions_table.table_name)
        cdk.CfnOutput(self, "NudgeQueueUrl", value=self.nudge_queue.queue_url)
        cdk.CfnOutput(self, "BlockerQueueUrl", value=self.blocker_queue.queue_url)
        cdk.CfnOutput(self, "DataBucketName", value=self.data_bucket.bucket_name)


class EkyanBudgetStack(cdk.Stack):
    def __init__(self, scope: Construct, id: str, **kwargs):
        super().__init__(scope, id, **kwargs)

        budgets.CfnBudget(self, "EkyanBudget",
            budget=budgets.CfnBudget.BudgetDataProperty(
                budget_type="COST",
                time_unit="MONTHLY",
                budget_limit=budgets.CfnBudget.SpendProperty(
                    amount=BUDGET_LIMIT_USD,
                    unit="USD",
                ),
                budget_name="EKYAN-Monthly-Budget",
            ),
            notifications_with_subscribers=[
                budgets.CfnBudget.NotificationWithSubscribersProperty(
                    notification=budgets.CfnBudget.NotificationProperty(
                        notification_type="ACTUAL",
                        comparison_operator="GREATER_THAN",
                        threshold=80,
                        threshold_type="PERCENTAGE",
                    ),
                    subscribers=[budgets.CfnBudget.SubscriberProperty(
                        subscription_type="EMAIL",
                        address=BUDGET_ALERT_EMAIL,
                    )],
                ),
                budgets.CfnBudget.NotificationWithSubscribersProperty(
                    notification=budgets.CfnBudget.NotificationProperty(
                        notification_type="ACTUAL",
                        comparison_operator="GREATER_THAN",
                        threshold=100,
                        threshold_type="PERCENTAGE",
                    ),
                    subscribers=[budgets.CfnBudget.SubscriberProperty(
                        subscription_type="EMAIL",
                        address=BUDGET_ALERT_EMAIL,
                    )],
                ),
            ],
        )


app = cdk.App()
EkyanStack(app, "EkyanStack",
    env=cdk.Environment(account="774525420097", region="af-south-1"),
)
# Budgets is a global service — must deploy to us-east-1
EkyanBudgetStack(app, "EkyanBudgetStack",
    env=cdk.Environment(account="774525420097", region="us-east-1"),
)
app.synth()

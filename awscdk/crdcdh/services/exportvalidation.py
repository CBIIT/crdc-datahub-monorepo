from aws_cdk import Duration

from aws_cdk import aws_elasticloadbalancingv2 as elbv2
from aws_cdk import aws_ecs as ecs
from aws_cdk import aws_ecr as ecr
from aws_cdk import aws_secretsmanager as secretsmanager
from datetime import date
from aws_cdk import Duration
from aws_cdk import aws_applicationautoscaling as appscaling
from aws_cdk import aws_cloudwatch as cloudwatch
from aws_cdk import aws_cloudwatch_actions as cw_actions
from aws_cdk import aws_sqs as sqs
from aws_cdk import aws_iam as iam

class exportvalidationService:
  def createService(self, config):

    ### ExportValidation Service ############################################################################################################
    service = "exportvalidation"

    # Set container configs
    if config.has_option(service, 'entrypoint'):
        entry_point = ["/bin/sh", "-c", config[service]['entrypoint']]
    else:
        entry_point = None

    environment={
            "DATE":date.today().isoformat(),
            "PROJECT":"crdc-hub",
            "VERSION":config[service]['image'],
            "FARGATE":"true",
            "SESSION_SECRET":"abcd256asghaaamnkloofghj",
            "NEW_RELIC_APP_NAME":"{}-{}-{}".format(self.namingPrefix, service),
            "NEW_RELIC_DISTRIBUTED_TRACING_ENABLED":"true",
            "NEW_RELIC_HOST":"gov-collector.newrelic.com",
            "NEW_RELIC_LABELS":"Project:{};Environment:{}".format('crdc-hub', config['main']['tier']),
            "NEW_RELIC_LOG_FILE_NAME":"STDOUT",
            "NRIA_IS_FORWARD_ONLY":"true",
            "NRIA_PASSTHROUGH_ENVIRONMENT":"ECS_CONTAINER_METADATA_URI,ECS_CONTAINER_METADATA_URI_V4,FARGATE",
            "NRIA_CUSTOM_ATTRIBUTES":"{\"nrDeployMethod\":\"downloadPage\"}",
            "NRIA_OVERRIDE_HOST_ROOT":"",
            "JAVA_OPTS": "-javaagent:/usr/local/tomcat/newrelic/newrelic.jar",
        }

    secrets={
            "NEW_RELIC_LICENSE_KEY":ecs.Secret.from_secrets_manager(secretsmanager.Secret.from_secret_name_v2(self, "export_newrelic", secret_name='monitoring/newrelic'), 'api_key'),
            "MONGO_DB_HOST":ecs.Secret.from_secrets_manager(self.secret, 'mongo_db_host'),
            "MONGO_DB_PORT":ecs.Secret.from_secrets_manager(self.secret, 'mongo_db_port'),
            "MONGO_DB_PASSWORD":ecs.Secret.from_secrets_manager(self.secret, 'mongo_db_password'),
            "MONGO_DB_USER":ecs.Secret.from_secrets_manager(self.secret, 'mongo_db_user'),
            "DATABASE_NAME":ecs.Secret.from_secrets_manager(self.secret, 'database_name'),
        }   
    
    # create sqs
    queue = sqs.Queue(self, f"{self.namingPrefix}-{service}-queue",
        queue_name=f"{config['main']['resource_prefix']}-{config['main']['tier']}-{config[service]['queue_name']}-queue.fifo",
        fifo=True
    )
 
    taskDefinition = ecs.FargateTaskDefinition(self,
        "{}-{}-taskDef".format(self.namingPrefix, service),
        family=f"{config['main']['resource_prefix']}-{config['main']['tier']}-exportvalidation",
        cpu=config.getint(service, 'cpu'),
        memory_limit_mib=config.getint(service, 'memory')
    )
    
    ecr_repo = ecr.Repository.from_repository_arn(self, "{}_repo".format(service), repository_arn=config[service]['repo'])
    
    taskDefinition.add_container(
        service,
        #image=ecs.ContainerImage.from_registry("{}:{}".format(config[service]['repo'], config[service]['image'])),
        image=ecs.ContainerImage.from_ecr_repository(repository=ecr_repo, tag=config[service]['image']),
        cpu=config.getint(service, 'cpu'),
        memory_limit_mib=config.getint(service, 'memory'),
        #port_mappings=[ecs.PortMapping(app_protocol=ecs.AppProtocol.http, container_port=config.getint(service, 'port'), name=service)],
        entry_point=entry_point,
        environment=environment,
        secrets=secrets,
        logging=ecs.LogDrivers.aws_logs(
            stream_prefix="{}-{}".format(self.namingPrefix, service)
        )
    )


    # attach amazon full access to the task role
    taskDefinition.task_role.add_managed_policy(
        iam.ManagedPolicy.from_aws_managed_policy_name("AmazonSQSFullAccess")
    )

    # Grant SQS permissions to the task role
    queue.grant_send_messages(taskDefinition.task_role)
    queue.grant_consume_messages(taskDefinition.task_role)

    ecsService = ecs.FargateService(self,
        "{}-{}-service".format(self.namingPrefix, service),
        service_name=f"{config['main']['resource_prefix']}-{config['main']['tier']}-exportvalidation",
        cluster=self.ECSCluster,
        task_definition=taskDefinition,
        enable_execute_command=True,
        desired_count=1,
        min_healthy_percent=50,
        max_healthy_percent=200,
        circuit_breaker=ecs.DeploymentCircuitBreaker(
            enable=True,
            rollback=True
        ),
    )

    #Attach scalable target
    scalable_target = appscaling.ScalableTarget(self,
        "{}-{}-scalableTarget".format(self.namingPrefix, service),
        #service_name=f"{config['main']['resource_prefix']}-{config['main']['tier']}-exportvalidation",
        service_namespace=appscaling.ServiceNamespace.ECS,
        #min_capacity=1,  # adjust as needed
        #max_capacity=20  # adjust as needed
        min_capacity=config.getint(service, 'autoscaling_min_capacity'),
        max_capacity=config.getint(service, 'autoscaling_max_capacity'),
        resource_id=f"service/{self.ECSCluster.cluster_name}/{ecsService.service_name}",
        scalable_dimension="ecs:service:DesiredCount"
    )

    # Define CloudWatch metric for SQS ApproximateNumberOfMessagesVisible

    sqs_metric = cloudwatch.Metric(
        namespace="AWS/SQS",
        metric_name="ApproximateNumberOfMessagesVisible",
        dimensions_map={"QueueName": queue.queue_name},
        statistic="Minimum",
        period=Duration.seconds(10)
    )

    # Cloudwatch Scale-out Alarm
    scale_out_alarm = cloudwatch.Alarm(self,
        "{}-{}-scaleoutAlarm".format(self.namingPrefix, service),
        alarm_name=f"{config['main']['resource_prefix']}-{config['main']['tier']}-export-scaleout-alarm",
        metric=sqs_metric,
        threshold=1,
        evaluation_periods=2,
        datapoints_to_alarm=2,
        comparison_operator=cloudwatch.ComparisonOperator.GREATER_THAN_OR_EQUAL_TO_THRESHOLD
    )

    # Define step-out policy
    scale_out_action = scalable_target.scale_on_metric(
        f"{config['main']['resource_prefix']}-{config['main']['tier']}-export-scale-out",
        metric=sqs_metric,
        scaling_steps=[
            appscaling.ScalingInterval(lower=1, upper=21, change=5),   # when 1 ≤ messages < 21 → add 5 tasks
            appscaling.ScalingInterval(lower=21, change=20),           # when ≥ 21 → add 20 tasks
        ],
        adjustment_type=appscaling.AdjustmentType.CHANGE_IN_CAPACITY,
        cooldown=Duration.seconds(300)
    )

    # Cloudwatch Scale-in alarm
    scale_in_alarm = cloudwatch.Alarm(self,
        "{}-{}-scaleinAlarm".format(self.namingPrefix, service),
        alarm_name=f"{config['main']['resource_prefix']}-{config['main']['tier']}-export-scalein-alarm",
        metric=sqs_metric,
        threshold=0,
        evaluation_periods=3,
        datapoints_to_alarm=3,
        comparison_operator=cloudwatch.ComparisonOperator.LESS_THAN_OR_EQUAL_TO_THRESHOLD
    )

    # Define step-in policy
    scale_in_action = scalable_target.scale_on_metric(
        f"{config['main']['resource_prefix']}-{config['main']['tier']}-export-scale-in",
        metric=sqs_metric,
        scaling_steps=[
            appscaling.ScalingInterval(upper=0, change=-1),   # remove 1 task if < or = 0
            appscaling.ScalingInterval(lower=0, change=0),
        ],
        adjustment_type=appscaling.AdjustmentType.CHANGE_IN_CAPACITY,
        cooldown=Duration.seconds(10)    
    )

    # Connect alarm to scale out policy
    #scale_out_alarm.add_alarm_action(
    #    cw_actions.ApplicationScalingAction(scale_out_action)
    #)

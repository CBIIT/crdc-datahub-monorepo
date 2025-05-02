from aws_cdk import Duration

from aws_cdk import aws_elasticloadbalancingv2 as elbv2
from aws_cdk import aws_ecs as ecs
from aws_cdk import aws_ecr as ecr
from aws_cdk import aws_secretsmanager as secretsmanager
from datetime import date
from aws_cdk import Duration
from aws_cdk import aws_applicationautoscaling as appscaling

class backendService:
  def createService(self, config):

    ### Backend Service ###############################################################################################################
    service = "backend"

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
            "EMAILS_ENABLED":"true",
            "EMAIL_SMTP_HOST":"email-smtp.us-east-1.amazonaws.com",
            "EMAIL_SMTP_PORT":"587",
            "NEW_RELIC_APP_NAME":"{}-{}-{}".format(self.namingPrefix, config['main']['tier'], service),
            "NEW_RELIC_DISTRIBUTED_TRACING_ENABLED":"true",
            "NEW_RELIC_HOST":"gov-collector.newrelic.com",
            "NEW_RELIC_LABELS":"Project:{};Environment:{}".format('crdc-hub', config['main']['tier']),
            "NEW_RELIC_LOG_FILE_NAME":"STDOUT",
            "NRIA_IS_FORWARD_ONLY":"true",
            "NRIA_PASSTHROUGH_ENVIRONMENT":"ECS_CONTAINER_METADATA_URI,ECS_CONTAINER_METADATA_URI_V4,FARGATE",
            "NRIA_CUSTOM_ATTRIBUTES":"{\"nrDeployMethod\":\"downloadPage\"}",
            "NRIA_OVERRIDE_HOST_ROOT":"",
            "JAVA_OPTS": "-javaagent:/usr/local/tomcat/newrelic/newrelic.jar",
            "AUTH_ENABLED":"true",
#            "AUTH_ENDPOINT":"/api/auth/",
#            "BENTO_API_VERSION":config[service]['image'],
#            "MYSQL_SESSION_ENABLED":"true",
#            "NEO4J_URL":"bolt://{}:7687".format(config['db']['neo4j_ip']),
#            "REDIS_ENABLE":"false",
#            "REDIS_FILTER_ENABLE":"false",
#            "REDIS_HOST":"localhost",
#            "REDIS_PORT":"6379",
#            "REDIS_USE_CLUSTER":"true",
        }

    secrets={
            "NEW_RELIC_LICENSE_KEY":ecs.Secret.from_secrets_manager(secretsmanager.Secret.from_secret_name_v2(self, "be_newrelic", secret_name='monitoring/newrelic'), 'api_key'),
            "MONGO_DB_HOST":ecs.Secret.from_secrets_manager(self.secret, 'mongo_db_host'),
            "MONGO_DB_PORT":ecs.Secret.from_secrets_manager(self.secret, 'mongo_db_port'),
            "MONGO_DB_PASSWORD":ecs.Secret.from_secrets_manager(self.secret, 'mongo_db_password'),
            "MONGO_DB_USER":ecs.Secret.from_secrets_manager(self.secret, 'mongo_db_user'),
            "DATABASE_NAME":ecs.Secret.from_secrets_manager(self.secret, 'database_name'),
            "EMAIL_USER":ecs.Secret.from_secrets_manager(self.secret, 'email_user'),
            "EMAIL_PASSWORD":ecs.Secret.from_secrets_manager(self.secret, 'email_password'),
            "EMAIL_URL":ecs.Secret.from_secrets_manager(self.secret, 'email_url'),
            "SUBMISSION_BUCKET":ecs.Secret.from_secrets_manager(self.secret, 'submission_bucket'),
        }   
    
    taskDefinition = ecs.FargateTaskDefinition(self,
        "{}-{}-taskDef".format(self.namingPrefix, service),
        family=f"{config['main']['resource_prefix']}-{config['main']['tier']}-backend",
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
        port_mappings=[ecs.PortMapping(app_protocol=ecs.AppProtocol.http, container_port=config.getint(service, 'port'), name=service)],
        entry_point=entry_point,
        environment=environment,
        secrets=secrets,
        logging=ecs.LogDrivers.aws_logs(
            stream_prefix="{}-{}".format(self.namingPrefix, service)
        )
    )

    ecsService = ecs.FargateService(self,
        "{}-{}-service".format(self.namingPrefix, service),
        service_name=f"{config['main']['resource_prefix']}-{config['main']['tier']}-backend",
        cluster=self.ECSCluster,
        task_definition=taskDefinition,
        enable_execute_command=True,
        min_healthy_percent=50,
        max_healthy_percent=200,
        circuit_breaker=ecs.DeploymentCircuitBreaker(
            enable=True,
            rollback=True
        ),
    )

    scalable_target = ecsService.auto_scale_task_count(
        min_capacity=1,  # adjust as needed
        max_capacity=2  # adjust as needed
    )

    scalable_target.scale_on_cpu_utilization(
        "CpuScalingPolicy",
        target_utilization_percent=80,  # target average CPU utilization
        scale_in_cooldown=Duration.seconds(60),   # wait 60s before scaling in
        scale_out_cooldown=Duration.seconds(60)   # wait 60s before scaling out
    )
    ecsTarget = self.listener.add_targets("ECS-{}-Target".format(service),
        port=int(config[service]['port']),
        protocol=elbv2.ApplicationProtocol.HTTP,
        target_group_name=f"{config['main']['resource_prefix']}-{config['main']['tier']}-backend",
        health_check = elbv2.HealthCheck(
            path=config[service]['health_check_path'],
            timeout=Duration.seconds(config.getint(service, 'health_check_timeout')),
            interval=Duration.seconds(config.getint(service, 'health_check_interval')),),
        targets=[ecsService],)

    elbv2.ApplicationListenerRule(self, id="alb-{}-rule".format(service),
        conditions=[
            elbv2.ListenerCondition.host_headers(config[service]['host'].split(',')),
            elbv2.ListenerCondition.path_patterns(config[service]['path'].split(','))
        ],
        priority=int(config[service]['priority_rule_number']),
        listener=self.listener,
        target_groups=[ecsTarget])

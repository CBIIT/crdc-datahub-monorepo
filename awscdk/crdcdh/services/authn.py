from aws_cdk import Duration

from aws_cdk import aws_elasticloadbalancingv2 as elbv2
from aws_cdk import aws_ecs as ecs
from aws_cdk import aws_ecr as ecr
from aws_cdk import aws_secretsmanager as secretsmanager
from datetime import date

class authnService:
  def createService(self, config):

    ### AuthN Service ###############################################################################################################
    service = "authn"

    # Set container configs
    if config.has_option(service, 'entrypoint'):
        entry_point = ["/bin/sh", "-c", config[service]['entrypoint']]
    else:
        entry_point = None

    environment={
            "FARGATE":"true",
            "NRIA_IS_FORWARD_ONLY":"true",
            "NEW_RELIC_DISTRIBUTED_TRACING_ENABLED":"true",
            "NRIA_PASSTHROUGH_ENVIRONMENT":"ECS_CONTAINER_METADATA_URI,ECS_CONTAINER_METADATA_URI_V4,FARGATE",
            "NEW_RELIC_HOST":"gov-collector.newrelic.com",
            "NEW_RELIC_LABELS":"Project:{};Environment:{}".format('crdc-hub', config['main']['tier']),
            "NEW_RELIC_LOG_FILE_NAME":"STDOUT",
            "NRIA_CUSTOM_ATTRIBUTES":"{\"nrDeployMethod\":\"downloadPage\"}",
            "NEW_RELIC_APP_NAME":"{}-{}-{}".format(self.namingPrefix, service),
            "NRIA_OVERRIDE_HOST_ROOT":"",
            "PROJECT":"crdc-hub",
            "DATE":date.today().isoformat(),
            "VERSION":config[service]['image'],
            "SESSION_SECRET":"abcd256asghaaamnkloofghj",
            "NIH_SCOPE":"openid email profile",
            "NIH_PROMPT":"login",
            "JAVA_OPTS": "-javaagent:/usr/local/tomcat/newrelic/newrelic.jar"
            #"NIH_REDIRECT_URL":self.app_url,
            #"SESSION_TIMEOUT":"1800",
        }

    secrets={
            "NEW_RELIC_LICENSE_KEY":ecs.Secret.from_secrets_manager(secretsmanager.Secret.from_secret_name_v2(self, "authn_newrelic", secret_name='monitoring/newrelic'), 'api_key'),
            "DATABASE_NAME":ecs.Secret.from_secrets_manager(self.secret, 'database_name'),
            "MONGO_DB_HOST":ecs.Secret.from_secrets_manager(self.secret, 'mongo_db_host'),
            "MONGO_DB_PORT":ecs.Secret.from_secrets_manager(self.secret, 'mongo_db_port'),
            "MONGO_DB_PASSWORD":ecs.Secret.from_secrets_manager(self.secret, 'mongo_db_password'),
            "MONGO_DB_USER":ecs.Secret.from_secrets_manager(self.secret, 'mongo_db_user'),
            "NIH_CLIENT_ID":ecs.Secret.from_secrets_manager(self.secret, 'nih_client_id'),
            "NIH_CLIENT_SECRET":ecs.Secret.from_secrets_manager(self.secret, 'nih_client_secret'),
            "NIH_BASE_URL":ecs.Secret.from_secrets_manager(self.secret, 'nih_base_url'),
            "NIH_REDIRECT_URL":ecs.Secret.from_secrets_manager(self.secret, 'nih_redirect_url'),
            "NIH_USERINFO_URL":ecs.Secret.from_secrets_manager(self.secret, 'nih_userinfo_url'),
            "NIH_AUTHORIZE_URL":ecs.Secret.from_secrets_manager(self.secret, 'nih_authorize_url'),
            "NIH_TOKEN_URL":ecs.Secret.from_secrets_manager(self.secret, 'nih_token_url'),
            "NIH_LOGOUT_URL":ecs.Secret.from_secrets_manager(self.secret, 'nih_logout_url'),
      
        }
    
    taskDefinition = ecs.FargateTaskDefinition(self,
        "{}-{}-taskDef".format(self.namingPrefix, service),
        family=f"{config['main']['resource_prefix']}-{config['main']['tier']}-authn",
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
        port_mappings=[ecs.PortMapping(container_port=config.getint(service, 'port'), name=service)],
        entry_point=entry_point,
        environment=environment,
        secrets=secrets,
        logging=ecs.LogDrivers.aws_logs(
            stream_prefix="{}-{}".format(self.namingPrefix, service)
        )
    )

    ecsService = ecs.FargateService(self,
        "{}-{}-service".format(self.namingPrefix, service),
        service_name=f"{config['main']['resource_prefix']}-{config['main']['tier']}-authn",
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
    #ecsService.connections.allow_to_default_port(self.auroraCluster)

    ecsTarget = self.listener.add_targets("ECS-{}-Target".format(service),
        port=int(config[service]['port']),
        protocol=elbv2.ApplicationProtocol.HTTP,
        target_group_name=f"{config['main']['resource_prefix']}-{config['main']['tier']}-authn",
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

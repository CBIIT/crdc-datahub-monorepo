from aws_cdk import aws_elasticloadbalancingv2 as elbv2
from aws_cdk import aws_ecs as ecs
from aws_cdk import aws_ecr as ecr
from aws_cdk import aws_secretsmanager as secretsmanager
from datetime import date

class frontendService:
  def createService(self, config):

    ### Frontend Service ###############################################################################################################
    service = "frontend"

    # Set container configs
    if config.has_option(service, 'entrypoint'):
        entry_point = ["/bin/sh", "-c", config[service]['entrypoint']]
    else:
        entry_point = None

    if config.has_option('main', 'subdomain'):
        self.app_url = "https://{}.{}".format(config['main']['subdomain'], config['main']['domain'])
    else:
        self.app_url = "https://{}".format(config['main']['domain'])
    
    environment={
            "FARGATE":"true",
            "NRIA_IS_FORWARD_ONLY":"true",
            "NEW_RELIC_DISTRIBUTED_TRACING_ENABLED":"true",
            "NRIA_PASSTHROUGH_ENVIRONMENT":"ECS_CONTAINER_METADATA_URI,ECS_CONTAINER_METADATA_URI_V4,FARGATE",
            "NEW_RELIC_HOST":"gov-collector.newrelic.com",
            "NEW_RELIC_LABELS":"Project:{};Environment:{}".format('crdc-hub', config['main']['tier']),
            "NEW_RELIC_LOG_FILE_NAME":"STDOUT",
            "NEW_RELIC_NO_CONFIG_FILE":"true",
            "NRIA_CUSTOM_ATTRIBUTES":"{\"nrDeployMethod\":\"downloadPage\"}",
            "NEW_RELIC_APP_NAME":"{}-{}-{}".format(self.namingPrefix, config['main']['tier'], service),
            "NRIA_OVERRIDE_HOST_ROOT":"",
            "PROJECT":"crdc-hub",
            "DATE":date.today(),
            "VERSION":config[service]['image'],
            "SESSION_SECRET":"abcd256asghaaamnkloofghj",
            "TIER":config['main']['tier'],
            "JAVA_OPTS": "-javaagent:/usr/local/tomcat/newrelic/newrelic.jar",
            #"REACT_APP_BACKEND_API":"{}/api/graphql".format(self.app_url),
            "REACT_APP_BACKEND_API":f"{self.app_url}/api/graphql",
            "REACT_APP_BE_VERSION":config['backend']['image'],
            "REACT_APP_FE_VERSION":config[service]['image'],
            "REACT_APP_UPLOADER_CLI":"https://github.com/CBIIT/crdc-datahub-cli-uploader/releases/download/{}/crdc-datahub-cli-uploader-src.zip".format(config['main']['upload_cli_version']),
            "REACT_APP_UPLOADER_CLI_WINDOWS":"https://github.com/CBIIT/crdc-datahub-cli-uploader/releases/download/{}/crdc-datahub-cli-uploader-windows.zip".format(config['main']['upload_cli_version']),
            "REACT_APP_UPLOADER_CLI_MAC_X64":"https://github.com/CBIIT/crdc-datahub-cli-uploader/releases/download/{}/crdc-datahub-cli-uploader-mac-x64.zip".format(config['main']['upload_cli_version']),
            "REACT_APP_UPLOADER_CLI_MAC_ARM":"https://github.com/CBIIT/crdc-datahub-cli-uploader/releases/download/{}/crdc-datahub-cli-uploader-mac-arm.zip".format(config['main']['upload_cli_version']),
            "REACT_APP_UPLOADER_CLI_VERSION":config['main']['upload_cli_version'],
            "HIDDEN_MODELS":config['main']['hidden_models'],
            "DEV_TIER":config['main']['tier'],
            "REACT_APP_GA_TRACKING_ID":config['main']['react_app_ga_tracking_id']

#            "REACT_APP_ABOUT_CONTENT_URL":config[service]['about_content_url'],
#            "REACT_APP_AUTH_API":self.app_url,
#            "REACT_APP_AUTH_SERVICE_API":"/api/auth/",
#            "REACT_APP_BACKEND_API":"/v1/graphql/",
#            "REACT_APP_BACKEND_PUBLIC_API":"/v1/public-graphql/",
#            "REACT_APP_BE_VERSION":config['backend']['image'],
#            "REACT_APP_FE_VERSION":config[service]['image'],
#            "REACT_APP_FILE_SERVICE_API":"/api/files/",
#            "REACT_APP_GA_TRACKING_ID":"",
#            "REACT_APP_USER_SERVICE_API":"/api/users/",
        }

    secrets={
            "NEW_RELIC_LICENSE_KEY":ecs.Secret.from_secrets_manager(secretsmanager.Secret.from_secret_name_v2(self, "fe_newrelic", secret_name='monitoring/newrelic'), 'api_key'),
            "NIH_CLIENT_ID":ecs.Secret.from_secrets_manager(self.secret, 'nih_client_id'),
            "NIH_REDIRECT_URL":ecs.Secret.from_secrets_manager(self.secret, 'nih_redirect_url'),
            "NIH_AUTHORIZE_URL":ecs.Secret.from_secrets_manager(self.secret, 'nih_authorize_url'),
            "REACT_APP_NIH_CLIENT_ID":ecs.Secret.from_secrets_manager(self.secret, 'nih_client_id'),
            "REACT_APP_NIH_AUTHENTICATION_URL":ecs.Secret.from_secrets_manager(self.secret, 'nih_authorize_url'),
            "REACT_APP_NIH_REDIRECT_URL":ecs.Secret.from_secrets_manager(self.secret, 'nih_redirect_url')
        }

    
    taskDefinition = ecs.FargateTaskDefinition(self,
        "{}-{}-taskDef".format(self.namingPrefix, service),
        family=f"{config['main']['resource_prefix']}-{config['main']['tier']}-frontend",
        cpu=config.getint(service, 'cpu'),
        memory_limit_mib=config.getint(service, 'memory')
    )
    
    ecr_repo = ecr.Repository.from_repository_arn(self, "{}_repo".format(service), repository_arn=config[service]['repo'])
    
    taskDefinition.add_container(
        service,
        #image=ecs.ContainerImage.from_registry("{}:{}".format(fe_repo.repository_uri, config[service]['image'])),
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
        service_name=f"{config['main']['resource_prefix']}-{config['main']['tier']}-frontend",
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

    ecsTarget = self.listener.add_targets("ECS-{}-Target".format(service),
        port=int(config[service]['port']),
        target_group_name=f"{config['main']['resource_prefix']}-{config['main']['tier']}-frontend",
        protocol=elbv2.ApplicationProtocol.HTTP,
        health_check = elbv2.HealthCheck(
            path=config[service]['health_check_path']),
        targets=[ecsService],)

    elbv2.ApplicationListenerRule(self, id="alb-{}-rule".format(service),
        conditions=[
            elbv2.ListenerCondition.path_patterns(config[service]['path'].split(','))
        ],
        priority=int(config[service]['priority_rule_number']),
        listener=self.listener,
        target_groups=[ecsTarget])

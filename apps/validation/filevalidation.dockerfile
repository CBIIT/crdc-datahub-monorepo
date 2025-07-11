#FROM python:3.12.5-alpine3.19 AS fnl_base_image
#FROM python:3.12.10-alpine3.21 AS fnl_base_image
FROM python:3.13.5-alpine3.21 AS fnl_base_image
 
WORKDIR /usr/validator
COPY . .
#RUN pip3 install -r requirements.txt
RUN pip3 install -r apps/validation/requirements.txt
 
#CMD ["/usr/local/bin/python3", "src/validator.py", "-u", "$MONGO_DB_USER", "-p", "$MONGO_DB_PASSWORD", "-d", "$DATABASE_NAME", "-s", "$MONGO_DB_HOST", "-o", "27017", "-q", "$FILE_QUEUE", "-m", "https://raw.githubusercontent.com/CBIIT/crdc-datahub-models/", "configs/validate-file-config-deploy.yml"]
#CMD ["/usr/local/bin/python3", "src/validator.py", "configs/validate-file-config-deploy.yml"]
CMD ["/usr/local/bin/python3", "apps/validation/src/validator.py", "apps/validation/configs/validate-file-config-deploy.yml"]

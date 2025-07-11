#FROM python:3.12.5-alpine3.19 AS fnl_base_image
#FROM python:3.12.9-alpine3.21 AS fnl_base_image 
#FROM python:3.12.10-alpine3.21 AS fnl_base_image
FROM python:3.13.5-alpine3.21 AS fnl_base_image
 
WORKDIR /usr/validator
COPY . .
#RUN pip3 install -r requirements.txt
RUN pip3 install -r apps/validation/requirements.txt
 
#CMD ["/usr/local/bin/python3", "src/validator.py", "configs/pv-puller-config-deploy.yml"]
CMD ["/usr/local/bin/python3", "apps/validation/src/validator.py", "apps/validation/configs/pv-puller-config-deploy.yml"]

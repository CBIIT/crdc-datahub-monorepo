const aws = require('aws-sdk');
class AWS {
    constructor() {
    }

    static s3(accessKeyID, secret, region) {
        const aws = setConfig(accessKeyID, secret, region)
        return new aws.S3();
    }
}

const setConfig = (accessKeyID, secret, region) => {
    aws.config.update({
        accessKeyId: accessKeyID,
        secretAccessKey: secret,
        region: region
    });
    return aws;
}

module.exports = {
    AWS
}
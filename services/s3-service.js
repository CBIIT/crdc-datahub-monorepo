class S3Service {

    constructor(s3Auth) {
        this.s3Auth = s3Auth;
    }

    async createPreSignedURL(bucketName, submissionID, fileName) {
        try {
            const params = {
                Bucket: bucketName,
                Key: `${submissionID}/${fileName}`,
                Expires: 3600, // 1 hour
                ACL: 'private', // files to be publicly inaccessible
                ContentType: 'application/octet-stream',
                ContentDisposition: `attachment; filename="${fileName}"`,
            };
            return new Promise((resolve, reject) => {
                this.s3Auth.getSignedUrl('putObject', params, (error, url) => {
                    if (error) {
                        reject(error);
                    } else {
                        resolve(url);
                    }
                });
            });
        } catch (error) {
            console.error('Error generating pre-signed URL:', error);
        }
    }
}

module.exports = {
    S3Service
}
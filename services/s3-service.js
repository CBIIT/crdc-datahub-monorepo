const AWS = require('aws-sdk');
class S3Service {

    constructor() {
        this.s3 = new AWS.S3();
    }

    async createPreSignedURL(bucketName, prefix, fileName) {
        try {
            const params = {
                Bucket: bucketName,
                Key: `${prefix}/${fileName}`,
                Expires: 3600, // 1 hour
                ACL: 'private', // files to be publicly inaccessible
                ContentType: 'text/tab-separated-values',
                ContentDisposition: `attachment; filename="${fileName}"`,
            };
            return new Promise((resolve, reject) => {
                this.s3.getSignedUrl('putObject', params, (error, url) => {
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

    /**
     * Asynchronously deletes a file from an AWS S3 bucket.
     * @param {string} bucketName - The name of the S3 bucket from which the file will be deleted.
     * @param {string} fileKey - The key (path including the filename) of the file to delete.
     * @returns {Promise<Object>} A promise that resolves to the result of the delete operation if successful.
     */
    async deleteFile(bucketName, fileKey) {
        return new Promise((resolve, reject) => {
            try {
                this.s3.deleteObject({Bucket: bucketName, Key: fileKey}, (err, data)=> {
                    if (err) {
                        console.error(`Failed to delete file "${fileKey}" from bucket "${bucketName}": ${err.message}`);
                        reject(err);
                    } else {
                        resolve(data);
                    }
                });
            } catch (err) {
                console.error(`Failed to delete file "${fileKey}" from bucket "${bucketName}": ${err.message}`);
                reject(err);
            }
        });
    }

    async listFile(bucketName, fileKey) {
        return new Promise((resolve, reject) => {
            this.s3.listObjects({Bucket: bucketName, Prefix: fileKey}, (err, data) => {
                if (err) {
                    reject(err);
                } else {
                    resolve(data);
                }
            });
        });
    }
}

module.exports = {
    S3Service
}
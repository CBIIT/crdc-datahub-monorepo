const ERROR = require("../constants/error-constants");

function verifyBatch(batch) {
    return new BatchVerifier(batch);
}

class BatchVerifier {
    constructor(batch) {
        this.submissionID = batch?.submissionID;
        this.batchType = batch?.type;
        this.files = batch?.files;
        // Optional
        this.intention = batch?.metadataIntention;
    }

    isUndefined() {
        if (!Array.isArray(this.files)) {
            throw new Error(ERROR.VERIFY.UNDEFINED_BATCH_FILE);
        }
        if (!this.submissionID) {
            throw new Error(ERROR.VERIFY.UNDEFINED_BATCH_SUBMISSION_ID);
        }
        if (!this.batchType) {
            throw new Error(ERROR.VERIFY.UNDEFINED_BATCH_TYPE);
        }
        return this;
    }

    notEmpty() {
        if (!this.files||!this.files?.length || this.files.length === 0) {
            throw new Error(ERROR.VERIFY.EMPTY_BATCH_FILE);
        }
        return this;
    }

    type(type) {
        if (!Array.isArray(type)){
            type = [type];
        }
        if (!type.includes(this.batchType.toLowerCase())) {
            throw Error(ERROR.VERIFY.INVALID_BATCH_TYPE);
        }
        return this;
    }

    metadataIntention(intention) {
        if (!Array.isArray(intention)){
            intention = [intention];
        }
        const isValidIntentionType = this.intention && intention.includes(this.intention.toLowerCase());
        if (!isValidIntentionType || this.intention === "") {
            throw Error(ERROR.VERIFY.INVALID_METADATA_INTENTION_TYPE);
        }
        return this;
    }
}

module.exports = {
    verifyBatch
}
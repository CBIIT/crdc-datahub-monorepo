class SubmissionService {

    constructor(submissionCollection) {
        this.submissionCollection = submissionCollection;
    }

    async findByID(id) {
        const result = await this.submissionCollection.aggregate([{
            "$match": {
                _id: id
            }
        }, {"$limit": 1}]);
        return (result?.length > 0) ? result[0] : null;
    }
}

module.exports = {
    SubmissionService
}

class Sessions {
    constructor(sessionsCollection) {
        this.sessionsCollection = sessionsCollection
    }

    async getSession(sessionID) {
        let result = await this.sessionsCollection.aggregate([{
            "$match": {
                _id: sessionID
            }
        }, {"$limit": 1}]);

        if(!result[0]){
            return 0
        }else{
            let dt = new Date(result[0].expires);
            return Math.round((dt.valueOf() - Date.now()))
        }
    }
}

module.exports = {
    Sessions
}
const {getCurrentTimeYYYYMMDDSS} = require("../utility/time-utility");
const {v4} = require("uuid")

class User {
    constructor(userCollection) {
        this.userCollection = userCollection
    }

    async getUser(userID) {
        let result = await this.userCollection.aggregate([{
            "$match": {
                _id: userID
            }
        }, {"$limit": 1}]);
        return (result?.length > 0) ? result[0] : null;
    }

    async getMyUser(params, context) {
        if (!context?.userInfo?.email || !context?.userInfo?.IDP) throw new Error("A user must be logged in to call this API");
        let session_currentTime = getCurrentTimeYYYYMMDDSS();
        const user_email = {
            "$match": {
                email: context.userInfo.email,
                IDP: context.userInfo.IDP,
            }
        }
        const sortCreatedAtDescending = {"$sort": {createdAt: -1}};
        const limitReturnToOneApplication = {"$limit": 1};
        const pipeline = [
            user_email,
            sortCreatedAtDescending,
            limitReturnToOneApplication
        ];
        let result = await this.userCollection.aggregate(pipeline);
        let user
        if (result.length < 1) {
            user = {
                _id: v4(),
                email: context.userInfo.email,
                IDP: context.userInfo.IDP,
                userStatus: "Active",
                role: "User",
                organizations: [],
                firstName: context.userInfo.firstName,
                lastName: context.userInfo.lastName,
                createdAt: session_currentTime,
                updateAt: session_currentTime
            }
            await this.userCollection.insert(user);
        } else {
            user = result[0];
        }
        if (result.matchedCount < 1) {
            let error = "there is an error getting the result";
            console.error(error)
            throw new Error(error)
        }
        context.userInfo = {
            ...user,
            ...context.userInfo
        }
        return user
    }
}


module.exports = {
    User
}

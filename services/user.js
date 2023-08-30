const {getCurrentTimeYYYYMMDDSS} = require("../utility/time-utility");
const {v4} = require("uuid")
const {USER} = require("../constants/user-constants");
const {ERROR} = require("../constants/error-constants");
const {UpdateProfileEvent} = require("../domain/log-events");

const isLoggedInOrThrow = (context) => {
    if (!context?.userInfo?.email || !context?.userInfo?.IDP) throw new Error(ERROR.NOT_LOGGED_IN);
}

class User {
    constructor(userCollection, logCollection, organizationService) {
        this.userCollection = userCollection;
        this.logCollection = logCollection;
        this.organizationService = organizationService;
    }

    // Note: This is a wrapper for the OrgService version which returns OrgInfo instead of Organization
    async listOrganizations(params, context) {
        isLoggedInOrThrow(context);
        if (context?.userInfo?.role !== USER.ROLES.ADMIN && context?.userInfo.role !== USER.ROLES.ORG_OWNER) {
            throw new Error(ERROR.INVALID_ROLE);
        }
        if (context.userInfo.role === USER.ROLES.ORG_OWNER && !context?.userInfo?.organization?.orgID) {
            throw new Error(ERROR.NO_ORG_ASSIGNED);
        }

        const filters = {};
        if (context?.userInfo?.role === USER.ROLES.ORG_OWNER) {
            filters["organization.orgID"] = context?.userInfo?.organization?.orgID;
        }

        const data = await this.organizationService.listOrganizations(filters);
        return (data || []).map(org => ({
            orgID: org._id,
            orgName: org.name,
            createdAt: org.createdAt,
            updateAt: org.updateAt,
        }));
    }

    async getUser(params, context) {
        isLoggedInOrThrow(context);
        if (!params.userID) {
            throw new Error(ERROR.INVALID_USERID);
        }
        if (context?.userInfo?.role !== USER.ROLES.ADMIN && context?.userInfo.role !== USER.ROLES.ORG_OWNER) {
            throw new Error(ERROR.INVALID_ROLE);
        }
        if (context.userInfo.role === USER.ROLES.ORG_OWNER && !context?.userInfo?.organization?.orgID) {
            throw new Error(ERROR.NO_ORG_ASSIGNED);
        }

        const filters = { _id: params.userID };
        if (context?.userInfo?.role === USER.ROLES.ORG_OWNER) {
            filters["organization.orgID"] = context?.userInfo?.organization?.orgID;
        }

        const result = await this.userCollection.aggregate([{
            "$match": filters
        }, {"$limit": 1}]);

        return (result?.length === 1) ? result[0] : null;
    }

    async listUsers(params, context) {
        isLoggedInOrThrow(context);
        if (context?.userInfo?.role !== USER.ROLES.ADMIN && context?.userInfo?.role !== USER.ROLES.ORG_OWNER) {
            throw new Error(ERROR.INVALID_ROLE);
        };
        if (context?.userInfo?.role === USER.ROLES.ORG_OWNER && !context?.userInfo?.organization?.orgID) {
            throw new Error(ERROR.NO_ORG_ASSIGNED);
        }

        const filters = {};
        if (context?.userInfo?.role === USER.ROLES.ORG_OWNER) {
            filters["organization.orgID"] = context?.userInfo?.organization?.orgID;
        }

        const result = await this.userCollection.aggregate([{
            "$match": filters
        }]);

        return result || [];
    }

    async createNewUser(context) {
        let sessionCurrentTime = getCurrentTimeYYYYMMDDSS();
        let email = context.userInfo.email;
        let emailName = email.split("@")[0];
        const aUser = {
            _id: v4(),
            email: email,
            IDP: context.userInfo.IDP,
            userStatus: USER.STATUSES.ACTIVE,
            role: USER.ROLES.USER,
            organization: {},
            firstName: context?.userInfo?.firstName || emailName,
            lastName: context.userInfo.lastName,
            createdAt: sessionCurrentTime,
            updateAt: sessionCurrentTime
        };
        await this.userCollection.insert(aUser);
    }

    async getMyUser(params, context) {
        isLoggedInOrThrow(context);
        let result = await this.userCollection.aggregate([
            {
                "$match": {
                    email: context.userInfo.email,
                    IDP: context.userInfo.IDP,
                }
            },
            {"$sort": {createdAt: -1}}, // sort descending
            {"$limit": 1} // return one
        ]);
        const isUserExits = result.length < 1;
        const aUser = isUserExits ? await this.createNewUser(context) : result[0];

        if (result.matchedCount < 1) {
            let error = "there is an error getting the result";
            console.error(error)
            throw new Error(error)
        }

        context.userInfo = {
            ...context.userInfo,
            ...aUser,
        }
        return aUser
    }

    async updateMyUser(params, context) {
        isLoggedInOrThrow(context);
        let sessionCurrentTime = getCurrentTimeYYYYMMDDSS();
        let user = await this.userCollection.find(context.userInfo._id);
        if (!user || !Array.isArray(user) || user.length < 1) throw new Error("User is not in the database")

        if (!context.userInfo._id) {
            let error = "there is no UserId in the session";
            console.error(error)
            throw new Error(error)
        }
        const updateUser ={
            _id: context.userInfo._id,
            firstName: params.userInfo.firstName,
            lastName: params.userInfo.lastName,
            updateAt: sessionCurrentTime
        }
        const updateResult = await this.userCollection.update(updateUser);
        // store user update log
        if (updateResult?.matchedCount > 0) {
            const prevUser = {firstName: user[0].firstName, lastName: user[0].lastName};
            const newProfile = {firstName: params.userInfo.firstName, lastName: params.userInfo.lastName};
            const log = UpdateProfileEvent.create(user[0]._id, user[0].email, user[0].IDP, prevUser, newProfile);
            await this.logCollection.insert(log);
        }
        // error handling
        if (updateResult.matchedCount < 1) {
            let error = "there is an error getting the result";
            console.error(error)
            throw new Error(error)
        }

        context.userInfo = {
            ...context.userInfo,
            ...updateUser,
            updateAt: sessionCurrentTime
        }
        return {
            ...user[0],
            firstName: params.userInfo.firstName,
            lastName: params.userInfo.lastName,
            updateAt: sessionCurrentTime
        }

    }

    async editUser(params, context) {
        isLoggedInOrThrow(context);
        if (context?.userInfo?.role !== USER.ROLES.ADMIN) {
            throw new Error(ERROR.INVALID_ROLE);
        }
        if (!params.userID) {
            throw new Error(ERROR.INVALID_USERID);
        }

        const sessionCurrentTime = getCurrentTimeYYYYMMDDSS();
        const user = await this.userCollection.aggregate([{ "$match": { _id: params.userID } }]);
        if (!user || !Array.isArray(user) || user.length < 1 || user[0]?._id !== params.userID) {
            throw new Error(ERROR.USER_NOT_FOUND);
        }

        const updatedUser = { _id: params.userID, updateAt: sessionCurrentTime };
        if (!params.organization && [USER.ROLES.ORG_OWNER, USER.ROLES.SUBMITTER].includes(params.role)) {
            throw new Error(ERROR.USER_ORG_REQUIRED);
        }
        if (params.organization && params.organization !== user[0]?.organization?.orgID) {
            const newOrg = await this.organizationService.getOrganizationByID(params.organization);
            if (!newOrg?._id || newOrg?._id !== params.organization) {
                throw new Error(ERROR.INVALID_ORG_ID);
            }

            updatedUser.organization = {
                orgID: newOrg._id,
                orgName: newOrg.name,
                createdAt: newOrg.createdAt,
                updatedAt: newOrg.updatedAt,
            };
        } else if (!params.organization) {
            updatedUser.organization = null;
        }
        if (params.role && Object.values(USER.ROLES).includes(params.role)) {
            updatedUser.role = params.role;
        }
        if (params.status && Object.values(USER.STATUSES).includes(params.status)) {
            updatedUser.userStatus = params.status;
        }

        const updateResult = await this.userCollection.update(updatedUser);
        if (updateResult?.matchedCount !== 1) {
            throw new Error(ERROR.UPDATE_FAILED);
        }

        return { ...user[0], ...updatedUser };
    }

    async getAdminUserEmails() {
        const orgOwnerOrAdminRole = {
            "userStatus": USER.STATUSES.ACTIVE,
            "$or": [{"role": USER.ROLES.ADMIN}, {"role": USER.ROLES.ORG_OWNER}]
        };
        return await this.userCollection.aggregate([{"$match": orgOwnerOrAdminRole}]) || [];
    }

    isAdmin(role) {
        return role && role === USER.ROLES.ADMIN;
    }
}


module.exports = {
    User
}

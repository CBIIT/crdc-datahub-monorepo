module.exports = Object.freeze({
    ERROR: {
        NOT_LOGGED_IN: "A user must be logged in to call this API",
        INVALID_USERID: "A userID argument is required to call this API",
        INVALID_ROLE: "You do not have the correct role to perform this operation",
        NO_ORG_ASSIGNED: "You do not have an organization assigned to your account",
        USER_NOT_FOUND: "The user you are trying to update does not exist",
        UPDATE_FAILED: "Unknown error occurred while updating object",
        INVALID_ORG_ID: "The organization ID you provided is invalid",
        INVALID_ROLE_ASSIGNMENT: "The role you are trying to assign is invalid",
    },
});

module.exports = Object.freeze({
    ERROR: {
        // TODO CRDC backend already has these error constants, let's merge it.
        NOT_LOGGED_IN: "A user must be logged in to call this API",
        INVALID_USER_STATUS: "A user with an invalid status is prohibited from logging in. Please, verify that your account is disabled.",
        INVALID_USERID: "A userID argument is required to call this API",
        INVALID_ROLE: "You do not have the correct role to perform this operation",
        NO_ORG_ASSIGNED: "You do not have an organization assigned to your account",
    },
});

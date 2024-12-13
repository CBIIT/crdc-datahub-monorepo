module.exports = Object.freeze({
    EMAIL_NOTIFICATIONS: {
        DATA_SUBMISSION: {
            SUBMIT: "data_submission:submitted",
            CANCEL: "data_submission:cancelled",
            RELEASE: "data_submission:released",
            COMPLETE: "data_submission:completed",
            DELETE: "data_submission:deleted",
            WITHDRAW: "data_submission:withdrawn",
            REMIND_EXPIRE: "data_submission:expiring"
        },
        SUBMISSION_REQUEST: {
            REQUEST_SUBMIT: "submission_request:submitted",
            REQUEST_READY_REVIEW: "submission_request:to_be_reviewed",
            REQUEST_REVIEW: "submission_request:reviewed",
            REQUEST_DELETE: "submission_request:deleted"
        },
        USER_ACCOUNT: {
            USER_REQUEST_ACCESS: "access:requested",
            USER_INACTIVATED: "account:inactivated",
            USER_INACTIVATED_ADMIN: "account:users_inactivated",
            USER_DISABLED_BY_ADMIN: "account:disabled"
        }
    },
    SUBMISSION_REQUEST: {
        VIEW: "submission_request:view",
        CREATE: "submission_request:create",
        SUBMIT: "submission_request:submit",
        REVIEW: "submission_request:review",
    },
    DATA_SUBMISSION: {
        REQUEST_ACCESS: "access:request",
        VIEW: "data_submission:view",
        CREATE: "data_submission:create",
        REVIEW: 'data_submission:review',
        ADMIN_SUBMIT: 'data_submission:admin_submit',
        CONFIRM: 'data_submission:confirm'
    },
    ADMIN: {
        MANAGE_USER : "user:manage",
        MANAGE_PROGRAMS: "program:manage",
        MANAGE_STUDIES: "study:manage",
        VIEW_DASHBOARD: "dashboard:view"
    }
});
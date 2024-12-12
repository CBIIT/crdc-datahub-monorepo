module.exports = Object.freeze({
    EMAIL_NOTIFICATIONS: {
        SUBMISSION: {
            SUBMIT: "Email Submit",
            CANCEL: "Email Cancel",
            RELEASE: "Email Release",
            COMPLETE: "Email Complete",
            DELETE: "Email Delete",
            WITHDRAW: "Email Withdraw",
            REMIND_EXPIRE: "Email Remind Expire"
        },
        APPLICATION: {
            REQUEST_SUBMIT: "RequestEmail Submit",
            REQUEST_READY_REVIEW: "RequestEmail Ready Review",
            REQUEST_REVIEW: "RequestEmail Review"
        }
    },
    // TODO By Mr. Peter
    APPLICATION_ACTION: {
        VIEW: "RequestAction View",
        CREATE: "RequestAction Create",
        SUBMIT: "RequestAction Submit",
        REVIEW: "RequestAction Review",
    },
    SUBMISSION_ACTION: {
        VIEW: "SubmissionAction View",
        CREATE: "SubmissionAction Create",
        VALIDATE: 'SubmissionAction Validate',
        REVIEW: 'SubmissionAction Review',
        ADMIN_SUBMIT: 'SubmissionAction AdminSubmit',
        CONFIRM: 'SubmissionAction Confirm'
    },
    OTHER_ACTION: {
        DASHBOARD_VIEW: "Dashboard View",
        MANAGE_PROGRAMS: "Manage Programs",
        MANAGE_STUDIES: "Manage Studies"
    },
    USER_ACTION: {
        MANAGE_USER : "Manage User",
        REQUEST_ACCESS: "User RequestAccess"
    }
});
module.exports = Object.freeze({
    // MongoDB Collections
    DATABASE_NAME: process.env.DATABASE_NAME || 'crdc-datahub',
    SESSION_COLLECTION: 'sessions',
    APPLICATION_COLLECTION: 'applications',
    DATA_SUBMISSIONS_COLLECTION: 'data_submissions',
    APPROVED_STUDIES_COLLECTION: 'approvedStudies',
    USER_COLLECTION: 'users',
    ORGANIZATION_COLLECTION: 'organization',
    LOG_COLLECTION: 'logs'
});

module.exports = Object.freeze({
    BATCH: {
        TYPE: {
            METADATA: "metadata",
            FILE: "file",
        },
        INTENTION: {
            NEW: "new",
            UPDATE: "update",
            DELETE: "delete",
        },
        STATUSES: {
            NEW: "New",
            UPLOADED: "Uploaded",
            FAILED: "Upload Failed",
            LOADED: "Loaded",
            REJECTED: "Rejected"
        }
    }
});

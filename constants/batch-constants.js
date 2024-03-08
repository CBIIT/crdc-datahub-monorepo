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
            UPLOADING: "Uploading",
            UPLOADED: "Uploaded",
            FAILED: "Upload Failed",
            LOADED: "Loaded",
            REJECTED: "Rejected"
        }
    },
    FILE: {
        UPLOAD_STATUSES: {
            NEW: "New",
            UPLOADED: "Uploaded",
            FAILED: "Failed",
        }
    }
});

#!/usr/bin/env python3
import json
from bento.common.utils import get_logger
from common.constants import  ADDITION_ERRORS, STATUS_ERROR, FAILED, STATUS_PASSED, STATUS, UPDATED_AT, DATA_COMMON_NAME, \
    NODE_TYPE, NODE_ID, VALIDATED_AT, ORIN_FILE_NAME, STUDY_ABBREVIATION, ID, SUBMISSION_STATUS_SUBMITTED, SUBMISSION_REL_STATUS_RELEASED
from common.utils import current_datetime, create_error

BATCH_SIZE = 1000

class CrossSubmissionValidator:
    def __init__(self, mongo_dao):
        self.log = get_logger('Cross Submission Validator')
        self.mongo_dao = mongo_dao
        self.model = None
        self.submission = None
        self.isError = None

    def validate(self, submission_id):
        #1. # get data common from submission
        submission = self.mongo_dao.get_submission(submission_id)
        if not submission:
            msg = f'Invalid submissionID, no submission found, {submission_id}!'
            self.log.error(msg)
            return FAILED
        if not submission.get(DATA_COMMON_NAME):
            msg = f'Invalid submission, no datacommon found, {submission_id}!'
            self.log.error(msg)
            return FAILED
        if submission.get(STATUS) not in [SUBMISSION_STATUS_SUBMITTED, SUBMISSION_REL_STATUS_RELEASED]:
            msg = f'Invalid submission, wrong status, {submission_id}!'
            self.log.error(msg)
            return FAILED
        self.submission = submission
        
        #2 retrieve data batch by batch
        start_index = 0
        validated_count = 0
        while True:
            data_records = self.mongo_dao.get_dataRecords_chunk(submission_id, None, start_index, BATCH_SIZE)
            if start_index == 0 and (not data_records or len(data_records) == 0):
                msg = f'No metadata to be validated.'
                self.log.error(msg)
                return FAILED
            
            count = len(data_records) 
            validated_count += self.validate_nodes(data_records, submission_id)
            if count < BATCH_SIZE: 
                self.log.info(f"{submission_id}: {validated_count} out of {count + start_index} nodes are validated.")
                return STATUS_ERROR if self.isError else STATUS_PASSED 
            start_index += count  
    
    def validate_nodes(self, data_records, submission_id):
        #2. loop through all records and call validateNode
        updated_records = []
        validated_count = 0
        try:
            for record in data_records:
                status, errors = self.validate_node(record, submission_id)
                if errors and len(errors) > 0:
                    self.isError = True
                # set status, errors and warnings
                record[ADDITION_ERRORS] = errors
                record[UPDATED_AT] = record[VALIDATED_AT] = current_datetime()
                updated_records.append(record)
                validated_count += 1
        except Exception as e:
            self.log.exception(e)
            msg = f'Failed to validate dataRecords for the submission, {submission_id}.'
            self.log.exception(msg) 
            self.isError = True 
        #3. update data records based on record's _id
        result = self.mongo_dao.update_data_records_addition_error(updated_records)
        if not result:
            #4. set errors in submission
            msg = f'Failed to update dataRecords for the submission, {submission_id}.'
            self.log.error(msg)
            self.isError = True

        return validated_count
    
    def validate_node(self, data_record, submission_id):
        # set default return values
        errors = []
        msg_prefix = f'[{data_record.get(ORIN_FILE_NAME)}: line {data_record.get("lineNumber")}]'
        node_type = data_record.get(NODE_TYPE)
        node_id = data_record.get(NODE_ID)
        try:
            # validate cross submission
            result, duplicate_submissions = self.mongo_dao.find_node_in_other_submissions_in_status(submission_id, self.submission[STUDY_ABBREVIATION], 
                        self.submission[DATA_COMMON_NAME], node_type, node_id, [SUBMISSION_STATUS_SUBMITTED, SUBMISSION_REL_STATUS_RELEASED])
            if result and duplicate_submissions and len(duplicate_submissions):
                error = {"conflictingSubmissions": [sub[ID] for sub in duplicate_submissions]}# add submission id to errors
                orig_error = create_error("Conflict Data found", f'{msg_prefix} Identical data found in other submissions', "", "Error", "", "")
                error.update(orig_error)
                
                errors.append(error)
                return STATUS_ERROR, errors
        except Exception as e:
            self.log.exception(e) 
            error = create_error("Internal error", f"{msg_prefix} metadata validation failed due to internal errors.  Please try again and contact the helpdesk if this error persists.",
                                 "M020", "Error", "", "")
            return STATUS_ERROR,[error]
        #  if there are neither errors nor warnings, return default values
        return STATUS_PASSED, errors
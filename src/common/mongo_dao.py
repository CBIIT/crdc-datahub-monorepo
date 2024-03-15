from pymongo import MongoClient, errors, ReplaceOne, DeleteOne, TEXT, DESCENDING
from bento.common.utils import get_logger
from common.constants import BATCH_COLLECTION, SUBMISSION_COLLECTION, DATA_COLlECTION, ID, UPDATED_AT, \
    SUBMISSION_ID, NODE_ID, NODE_TYPE, S3_FILE_INFO, STATUS, FILE_ERRORS, STATUS_NEW, NODE_ID, NODE_TYPE, \
    PARENT_TYPE, PARENT_ID_VAL, PARENTS, FILE_VALIDATION_STATUS, METADATA_VALIDATION_STATUS, TYPE, \
    FILE_MD5_COLLECTION, FILE_NAME, CRDC_ID, RELEASE_COLLECTION, UPDATED_AT, FAILED, DATA_COMMON_NAME
from common.utils import get_exception_msg, current_datetime, get_uuid_str

MAX_SIZE = 10000

class MongoDao:
    def __init__(self, connectionStr, db_name):
      self.log = get_logger("Mongo DAO")
      self.client = MongoClient(connectionStr)
      self.db_name = db_name
    """
    get batch by id
    """
    def get_batch(self, batchId):
        db = self.client[self.db_name]
        batch_collection = db[BATCH_COLLECTION]
        try:
            return batch_collection.find_one({ID: batchId})
        except errors.PyMongoError as pe:
            self.log.debug(pe)
            self.log.exception(f"Failed to find batch, {batchId}: {get_exception_msg()}")
            return None
        except Exception as e:
            self.log.debug(e)
            self.log.exception(f"Failed to find batch, {batchId}: {get_exception_msg()}")
            return None
        
    """
    find batch for uploaded data file
    """
    def find_batch_by_file_name(self, submissionID, batch_type, file_name):
        db = self.client[self.db_name]
        batch_collection = db[BATCH_COLLECTION]
        query = {
            SUBMISSION_ID: submissionID, 
            TYPE: batch_type, 
            "files.fileName": file_name,
            STATUS: "Uploaded"
        }
        try:
            results = list(batch_collection.find(query).sort("displayID", DESCENDING).limit(1))
            return results[0] if results and len(results) > 0 else None
        except errors.PyMongoError as pe:
            self.log.debug(pe)
            self.log.exception(f"Failed to find batch by file name, {submissionID}/{batch_type}/{file_name}: {get_exception_msg()}")
            return None
        except Exception as e:
            self.log.debug(e)
            self.log.exception(f"Failed to find batch by file name, {submissionID}/{batch_type}/{file_name}: {get_exception_msg()}")
            return None
    """
    get submission by id
    """   
    def get_submission(self, submissionId):
        db = self.client[self.db_name]
        submission_collection = db[SUBMISSION_COLLECTION]
        try:
            return submission_collection.find_one({ID: submissionId})
        except errors.PyMongoError as pe:
            self.log.debug(pe)
            self.log.exception(f"Failed to find submission, {submissionId}: {get_exception_msg()}")
            return None
        except Exception as e:
            self.log.debug(e)
            self.log.exception(f"Failed to find submission, {submissionId}: {get_exception_msg()}")
            return None

    """
    check node exists by node name and its value
    """
    def search_nodes_by_type_and_value(self, nodes):
        db = self.client[self.db_name]
        data_collection = db[DATA_COLlECTION]
        node_set, query = set(), []
        for node in nodes:
            node_type, node_key, node_value = node.get("type"), node.get("key"), node.get("value")
            if node_type and node_key and node_value is not None \
                    and (node_type, node_key, node_value) not in node_set:
                node_set.add(tuple([node_type, node_key, node_value]))
                query.append({"nodeType": node_type, "props." + node_key: node_value})
        try:
            return list(data_collection.find({"$or": query})) if len(query) > 0 else []
        except errors.PyMongoError as pe:
            self.log.debug(pe)
            self.log.exception(f"Failed to search nodes: {get_exception_msg()}")
            return None
        except Exception as e:
            self.log.debug(e)
            self.log.exception(f"Failed to search nodes: {get_exception_msg()}")
            return None
        
    """
    check node exists by node name and its value
    """
    def search_nodes_by_index(self, nodes, submission_id):
        db = self.client[self.db_name]
        data_collection = db[DATA_COLlECTION]
        query = []
        for node in nodes:
            node_type, node_key, node_value = node.get("type"), node.get("key"), node.get("value")
            if node_type and node_key and node_value is not None: 
                query.append({SUBMISSION_ID: submission_id, NODE_TYPE: node_type, NODE_ID: node_value})
        try:
            return list(data_collection.find({"$or": query})) if len(query) > 0 else []
        except errors.PyMongoError as pe:
            self.log.debug(pe)
            self.log.exception(f"{submission_id}: Failed to search nodes: {get_exception_msg()}")
            return None
        except Exception as e:
            self.log.debug(e)
            self.log.exception(f"{submission_id}: Failed to search nodes: {get_exception_msg()}")
            return None
        
    """
    check node exists by dataCommons, nodeType and nodeID
    """
    def search_node_by_index_crdc(self, data_commons, node_type, node_id):
        db = self.client[self.db_name]
        data_collection = db[DATA_COLlECTION]
        try:
            result = data_collection.find_one({DATA_COMMON_NAME: data_commons, NODE_TYPE: node_type, NODE_ID: node_id})
            return result
        except errors.PyMongoError as pe:
            self.log.debug(pe)
            self.log.exception(f"Failed to search node for crdc_id: {get_exception_msg()}")
            return None
        except Exception as e:
            self.log.debug(e)
            self.log.exception(f"Failed to search node for crdc_id {get_exception_msg()}")
            return None
        
    """
    get file in dataRecord collection by fileId
    """ 
    def get_file(self, fileId):
        db = self.client[self.db_name]
        file_collection = db[DATA_COLlECTION]
        try:
            return file_collection.find_one({ID: fileId})
        except errors.PyMongoError as pe:
            self.log.debug(pe)
            self.log.exception(f"Failed to find file, {fileId}: {get_exception_msg()}")
            return None
        except Exception as e:
            self.log.debug(e)
            self.log.exception(f"Failed to find file, {fileId}: {get_exception_msg()}")
            return None
    """
    get file in dataRecord collection by fileName
    """   
    def get_file_by_name(self, fileName):
        db = self.client[self.db_name]
        file_collection = db[DATA_COLlECTION]
        try:
            return file_collection.find_one({"S3FileInfo.fileName": fileName})
        except errors.PyMongoError as pe:
            self.log.debug(pe)
            self.log.exception(f"Failed to find file, {fileName}: {get_exception_msg()}")
            return None
        except Exception as e:
            self.log.debug(e)
            self.log.exception(f"Failed to find file, {fileName}: {get_exception_msg()}")
            return None    
    """
    get file records in dataRecords collection by submissionID
    """
    def get_files_by_submission(self, submission_id):
        db = self.client[self.db_name]
        file_collection = db[DATA_COLlECTION]
        try:
            return list(file_collection.find({SUBMISSION_ID: submission_id, S3_FILE_INFO: {"$nin": [None, ""]}}))
        except errors.PyMongoError as pe:
            self.log.debug(pe)
            self.log.exception(f"Failed to find file for the submission, {submission_id}: {get_exception_msg()}")
            return None
        except Exception as e:
            self.log.debug(e)
            self.log.exception(f"Failed to find file for the submission, {submission_id}: {get_exception_msg()}")
            return None
    
    def update_batch(self, batch):
        db = self.client[self.db_name]
        batch_collection = db[BATCH_COLLECTION]
        #update the batch 
        batch[UPDATED_AT] = current_datetime()
        # Using update_one() method for single updating.
        try:
            result = batch_collection.replace_one({ID : batch[ID]}, batch, False) 
            return result.matched_count > 0 
        except errors.PyMongoError as pe:
            self.log.debug(pe)
            self.log.exception(f"Failed to update batch, {batch[ID]}: {get_exception_msg()}")
            return False
        except Exception as e:
            self.log.debug(e)
            self.log.exception(f"Failed to update batch, {batch[ID]}: {get_exception_msg()}")
            return False
    """
    check if not duplications exist in dataRecords collection
    """    
    def check_metadata_ids(self, nodeType, ids, submission_id):
        #1. check if collection exist
        db = self.client[self.db_name]
        try:
            collection = db[DATA_COLlECTION]
            #2 check if keys existing in the collection
            result = collection.find_one({NODE_ID: {'$in': ids}, SUBMISSION_ID: submission_id, NODE_TYPE: nodeType})
            return False if result else True
        except errors.OperationFailure as oe: 
            self.log.debug(oe)
            self.log.exception(f"{submission_id}: Failed to query DB, {nodeType}: {get_exception_msg()}!")
        except Exception as e:
            self.log.debug(e)
            self.log.exception(f"{submission_id}: Failed to query DB, {nodeType}: {get_exception_msg()}!")
        return True
    
    """
    update a file record in dataRecords collection
    """
    def update_file (self, file_record):
        db = self.client[self.db_name]
        file_collection = db[DATA_COLlECTION]
        try:
            result = file_collection.replace_one({ID : file_record[ID]}, file_record, False)
            return result.matched_count > 0 
        except errors.PyMongoError as pe:
            self.log.debug(pe)
            self.log.exception(f"Failed to update file, {file_record[ID]}: {get_exception_msg()}")
            return False
        except Exception as e:
            self.log.debug(e)
            self.log.exception(f"Failed to update file, {file_record[ID]}: {get_exception_msg()}")
            return False  
    """
    update errors in submissions collection
    """   
    def set_submission_validation_status(self, submission, file_status, metadata_status, msgs):
        db = self.client[self.db_name]
        file_collection = db[SUBMISSION_COLLECTION]
        try:
            if msgs and len(msgs) > 0:
                submission[FILE_ERRORS] =  list(submission[FILE_ERRORS]).extend(msgs) if submission.get(FILE_ERRORS) \
                        and isinstance(submission[FILE_ERRORS], list) else msgs
            if file_status:
                submission[FILE_VALIDATION_STATUS] = file_status
            if metadata_status:
                if metadata_status == FAILED:
                    metadata_status = None
                submission[METADATA_VALIDATION_STATUS] = metadata_status
            submission[UPDATED_AT] = current_datetime()
            result = file_collection.replace_one({ID : submission[ID]}, submission, False)
            return result.matched_count > 0 
        except errors.PyMongoError as pe:
            self.log.debug(pe)
            self.log.exception(f"Failed to update submission, {submission[ID]}: {get_exception_msg()}")
            return False
        except Exception as e:
            self.log.debug(e)
            self.log.exception(f"Failed to update file, {submission[ID]}: {get_exception_msg()}")
            return False  

    """
    update data records based on _id in dataRecords
    """
    def update_files(self, file_records):
        db = self.client[self.db_name]
        file_collection = db[DATA_COLlECTION]
        try:
            result = file_collection.bulk_write([
                ReplaceOne( { ID: m[ID] },  m,  False)
                    for m in list(file_records)
                ])
            self.log.info(f'Total {result.modified_count} dataRecords are updated!')
            return result.modified_count > 0 
        except errors.PyMongoError as pe:
            self.log.debug(pe)
            self.log.exception(f"Failed to update file records, {get_exception_msg()}")
            return False
        except Exception as e:
            self.log.debug(e)
            self.log.exception(f"Failed to update file records, {get_exception_msg()}")
            return False 
    """
    update data records based on node ID in dataRecords
    """
    def update_data_records(self, data_records):
        db = self.client[self.db_name]
        file_collection = db[DATA_COLlECTION]
        try:
            result = file_collection.bulk_write([
                ReplaceOne( {ID: m[ID]}, remove_id(m),  upsert=True)
                    for m in list(data_records)
                ])
            self.log.info(f'Total {result.modified_count} dataRecords are updated!')
            return True, None
        except errors.PyMongoError as pe:
            self.log.debug(pe)
            msg = f"Failed to update metadata."
            self.log.exception(msg)
            return False, msg
        except Exception as e:
            self.log.debug(e)
            msg = f"Failed to update file records, {get_exception_msg()}"
            self.log.exception(msg)
            return False, msg 
   
    """
    delete dataRecords by nodeIDs
    """  
    def delete_data_records(self, nodes):
        db = self.client[self.db_name]
        file_collection = db[DATA_COLlECTION]
        try:
            result = file_collection.bulk_write([
                DeleteOne( { SUBMISSION_ID: m[SUBMISSION_ID], NODE_ID: m[NODE_ID], NODE_TYPE: m[NODE_TYPE] })
                    for m in list(nodes)
                ])
            self.log.info(f'Total {result.deleted_count} dataRecords are deleted!')
            return True, None
        except errors.PyMongoError as pe:
            self.log.debug(pe)
            msg = f"Failed to delete file records, {get_exception_msg()}"
            self.log.exception(msg)
            return False, msg
        except Exception as e:
            self.log.debug(e)
            msg = f"Failed to delete file records, {get_exception_msg()}"
            self.log.exception(msg)
            return False, msg
    """
    insert batch dataRecords
    """ 
    def insert_data_records (self, file_records):
        db = self.client[self.db_name]
        file_collection = db[DATA_COLlECTION]
        try:
            result = file_collection.insert_many(file_records)
            count = len(result.inserted_ids)
            self.log.info(f'Total {count} dataRecords are inserted!')
            return count > 0, None
        except errors.PyMongoError as pe:
            self.log.debug(pe)
            msg = f"Failed to insert data records, {get_exception_msg()}"
            self.log.exception(msg)
            return False, msg
        except Exception as e:
            self.log.debug(e)
            msg = f"Failed to insert data records, {get_exception_msg()}"
            self.log.exception(msg)
            return False, msg
    """
    retrieve dataRecords by submissionID and scope either New dataRecords or All
    """
    def get_dataRecords(self, submission_id, scope):
        db = self.client[self.db_name]
        file_collection = db[DATA_COLlECTION]
        try:
            query = {'submissionID': {'$eq': submission_id}} 
            if scope == STATUS_NEW:
                query[STATUS] = STATUS_NEW
            result = list(file_collection.find(query))
            count = len(result)
            self.log.info(f'Total {count} dataRecords are found for the submission, {submission_id} and scope of {scope}!')
            return result
        except errors.PyMongoError as pe:
            self.log.debug(pe)
            self.log.exception(f"{submission_id}: Failed to retrieve data records, {get_exception_msg()}")
            return None
        except Exception as e:
            self.log.debug(e)
            self.log.exception(f"{submission_id}: Failed to retrieve data records, {get_exception_msg()}")
            return None 

    """
    retrieve dataRecord by submissionID and scope either New dataRecords or All in batch
    """
    def get_dataRecords_chunk(self, submission_id, scope, start, size):
        db = self.client[self.db_name]
        file_collection = db[DATA_COLlECTION]
        try:
            query = {SUBMISSION_ID: {'$eq': submission_id}} 
            if scope == STATUS_NEW:
                query[STATUS] = STATUS_NEW
                result = list(file_collection.find(query).sort({SUBMISSION_ID: 1, "nodeType": 1, "nodeID": 1}).limit(size))
            else:
                result = list(file_collection.find(query).sort({SUBMISSION_ID: 1, "nodeType": 1, "nodeID": 1}).skip(start).limit(size))
            return result
        except errors.PyMongoError as pe:
            self.log.debug(pe)
            self.log.exception(f"{submission_id}: Failed to retrieve data records, {get_exception_msg()}")
            return None
        except Exception as e:
            self.log.debug(e)
            self.log.exception(f"{submission_id}: Failed to retrieve data records, {get_exception_msg()}")
            return None 
        
    """
    retrieve dataRecord by submissionID and nodeType
    """
    def get_dataRecords_chunk_by_nodeType(self, submission_id, node_type, start, size):
        db = self.client[self.db_name]
        file_collection = db[DATA_COLlECTION]
        try:
            query = {SUBMISSION_ID: {'$eq': submission_id}, NODE_TYPE: {'$eq': node_type}} 
            result = list(file_collection.find(query).sort({SUBMISSION_ID: 1, "nodeType": 1, "nodeID": 1}).skip(start).limit(size))
            return result
        except errors.PyMongoError as pe:
            self.log.debug(pe)
            self.log.exception(f"{submission_id}: Failed to retrieve data records, {get_exception_msg()}")
            return None
        except Exception as e:
            self.log.debug(e)
            self.log.exception(f"{submission_id}: Failed to retrieve data records, {get_exception_msg()}")
            return None 

    """
    retrieve dataRecord by nodeID
    """
    def get_dataRecord_by_node(self, nodeID, nodeType, submission_id):
        db = self.client[self.db_name]
        file_collection = db[DATA_COLlECTION]
        try:
            result = file_collection.find_one({SUBMISSION_ID: submission_id, NODE_ID: nodeID, NODE_TYPE: nodeType})
            return result
        except errors.PyMongoError as pe:
            self.log.debug(pe)
            self.log.exception(f"{submission_id}: Failed to retrieve data record, {get_exception_msg()}")
            return None
        except Exception as e:
            self.log.debug(e)
            self.log.exception(f"{submission_id}: Failed to retrieve data record, {get_exception_msg()}")
            return None   
    """
    find child node by type and id
    """
    def get_nodes_by_parents(self, parent_ids, submission_id):
        db = self.client[self.db_name]
        data_collection = db[DATA_COLlECTION]
        query = []
        for id in parent_ids:
            node_type, node_id = id.get(NODE_TYPE), id.get(NODE_ID)
            query.append({SUBMISSION_ID: submission_id, PARENTS: {"$elemMatch": {PARENT_TYPE: node_type, PARENT_ID_VAL: node_id}}})
        try:
            results = list(data_collection.find({"$or": query})) if len(query) > 0 else []
            return True, results
        except errors.PyMongoError as pe:
            self.log.debug(pe)
            self.log.exception(f"{submission_id}: Failed to retrieve child nodes: {get_exception_msg()}")
            return False, None
        except Exception as e:
            self.log.debug(e)
            self.log.exception(f"{submission_id}: Failed to retrieve child nodes: {get_exception_msg()}")
            return False, None
        
    """
    set dataRecords search index, 'submissionID_nodeType_nodeID'
    """
    def set_search_index_dataRecords(self, submission_index, crdc_index):
        db = self.client[self.db_name]
        data_collection = db[DATA_COLlECTION]
        try:
            index_dict = data_collection.index_information()
            if not index_dict.get(submission_index):
                result = data_collection.create_index([(SUBMISSION_ID), (NODE_TYPE),(NODE_ID)], \
                            name=submission_index)
            if not index_dict.get(crdc_index):
                result = data_collection.create_index([(DATA_COMMON_NAME), (NODE_TYPE),(NODE_ID)], \
                            name=crdc_index)
            return True
        except errors.PyMongoError as pe:
            self.log.debug(pe)
            self.log.exception(f"Failed to set search index: {get_exception_msg()}")
            return False
        except Exception as e:
            self.log.debug(e)
            self.log.exception(f"Failed to set search index: {get_exception_msg()}")
            return False
    
    """
    set release search index, 'dataCommons_nodeType_nodeID'
    """
    def set_search_release_index(self, dataCommon_index, crdcID_index):
        db = self.client[self.db_name]
        data_collection = db[RELEASE_COLLECTION]
        try:
            index_dict = data_collection.index_information()
            if not index_dict or not index_dict.get(dataCommon_index):
                result = data_collection.create_index([(DATA_COMMON_NAME), (NODE_TYPE),(NODE_ID)], \
                            name=dataCommon_index)
            if not index_dict or not index_dict.get(crdcID_index):
                result = data_collection.create_index([(CRDC_ID)], \
                            name=crdcID_index)
            return True
        except errors.PyMongoError as pe:
            self.log.debug(pe)
            self.log.exception(f"Failed to set search index in release collection: {get_exception_msg()}")
            return False
        except Exception as e:
            self.log.debug(e)
            self.log.exception(f"Failed to set search index in release collection: {get_exception_msg()}")
            return False
        
    """
    find cached file md5 by submissionID and fileName
    """
    def get_file_md5(self, submission_id, file_name):
        db = self.client[self.db_name]
        data_collection = db[FILE_MD5_COLLECTION]
        try:
            md5_info = data_collection.find_one({SUBMISSION_ID: submission_id, FILE_NAME: file_name})
            return md5_info
        except errors.PyMongoError as pe:
            self.log.debug(pe)
            self.log.exception(f"{submission_id}: Failed to retrieve file md5: {get_exception_msg()}")
            return None
        except Exception as e:
            self.log.debug(e)
            self.log.exception(f"{submission_id}: Failed to retrieve file md5: {get_exception_msg()}")
            return None
        
    """
    save file md5 info to fileMD5 collection
    """
    def save_file_md5(self, md5_info):
        db = self.client[self.db_name]
        data_collection = db[FILE_MD5_COLLECTION]
        try:
            result = data_collection.replace_one({ID: md5_info[ID]}, md5_info,  upsert=True)
            return (result and result.upserted_id)
        except errors.PyMongoError as pe:
            self.log.debug(pe)
            self.log.exception(f"{md5_info[SUBMISSION_ID]}: Failed to save file md5: {get_exception_msg()}")
            return False
        except Exception as e:
            self.log.debug(e)
            self.log.exception(f"{md5_info[SUBMISSION_ID]}: Failed to save file md5: {get_exception_msg()}")
            return False
        
    """
    get release by CRDC_ID
    """
    def get_release(self, crdc_id):
        db = self.client[self.db_name]
        data_collection = db[RELEASE_COLLECTION]
        try:
            result = data_collection.find_one({CRDC_ID: crdc_id})
            return result
        except errors.PyMongoError as pe:
            self.log.debug(pe)
            self.log.exception(f"Failed to find release record for {crdc_id}: {get_exception_msg()}")
            return False
        except Exception as e:
            self.log.debug(e)
            self.log.exception(f"Failed to find release record for {crdc_id}: {get_exception_msg()}")
            return False
    
    """
    insert release 
    """
    def insert_release(self, release):
        db = self.client[self.db_name]
        data_collection = db[RELEASE_COLLECTION]
        try:
            result = data_collection.insert_one(release)
            return (result and result.inserted_id)
        except errors.PyMongoError as pe:
            self.log.debug(pe)
            self.log.exception(f"Failed to insert crdcID record: {get_exception_msg()}")
            return False
        except Exception as e:
            self.log.debug(e)
            self.log.exception(f"Failed to insert crdcID record: {get_exception_msg()}")
            return False
    """
    update release 
    """
    def update_release(self, release):
        db = self.client[self.db_name]
        data_collection = db[RELEASE_COLLECTION]
        try:
            result = data_collection.replace_one({ID: release[ID]}, release)
            return True
        except errors.PyMongoError as pe:
            self.log.debug(pe)
            self.log.exception(f"Failed to update release record: {get_exception_msg()}")
            return False
        except Exception as e:
            self.log.debug(e)
            self.log.exception(f"Failed to update release record: {get_exception_msg()}")
            return False

    def search_node(self, data_commons, node_type, node_id):
        """
        Search release collection for given node, if not found, search it in dataRecord collection
        :param data_commons:
        :param node_type:
        :param node_id:
        :return:
        """
        db = self.client[self.db_name]
        data_collection = db[RELEASE_COLLECTION]
        try:
            result = data_collection.find_one({DATA_COMMON_NAME: data_commons, NODE_TYPE: node_type, NODE_ID: node_id})
            if not result:
                # search dataRecords
                result = self.search_node_by_index_crdc(data_commons, node_type, node_id)
            return result
        except errors.PyMongoError as pe:
            self.log.debug(pe)
            self.log.exception(f"Failed to find release record for {data_commons}/{node_type}/{node_id}: {get_exception_msg()}")
            return False
        except Exception as e:
            self.log.debug(e)
            self.log.exception(f"Failed to find release record for {data_commons}/{node_type}/{node_id}: {get_exception_msg()}")
            return False

    def search_released_node(self, data_commons, node_type, node_id):
        """
        Search release collection for given node
        :param data_commons:
        :param node_type:
        :param node_id:
        :return:
        """
        db = self.client[self.db_name]
        data_collection = db[RELEASE_COLLECTION]
        try:
            result = data_collection.find_one({DATA_COMMON_NAME: data_commons, NODE_TYPE: node_type, NODE_ID: node_id})
            return result
        except errors.PyMongoError as pe:
            self.log.debug(pe)
            self.log.exception(f"Failed to find release record for {data_commons}/{node_type}/{node_id}: {get_exception_msg()}")
            return False
        except Exception as e:
            self.log.debug(e)
            self.log.exception(f"Failed to find release record for {data_commons}/{node_type}/{node_id}: {get_exception_msg()}")
            return False
        
"""
remove _id from records for update
"""   
def remove_id (data_record):
    data = {}
    for k in data_record.keys():
        if k == ID:
            continue
        data[k] = data_record[k]
    return data

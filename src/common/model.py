from common.constants import IDS, NODES_LABEL, MODEL, RELATIONSHIPS, LIST_DELIMITER_PROP

class DataModel:
    def __init__(self, model):
        self.model = model

    # model connivent functions
    # """
    # get model id fields in the given model
    # """
    # def get_model_ids(self):       
    #         return self.model.get(IDS, None)
    """
    get nodes value
    """   
    def get_nodes(self): 
        return self.model.get(NODES_LABEL, {})
    """
    get id field of a given node in the model
    """   
    def get_node_id(self, node): 
        if self.model[NODES_LABEL].get(node):
            return self.model[NODES_LABEL][node].get("id_property", None)
        return None

    """
    get all node keys in the model
    """
    def get_node_keys(self):
        return self.model[NODES_LABEL].keys()

    """
    get properties of a node in the model
    """
    def get_node_props(self, node):
        if self.model[NODES_LABEL].get(node):
            return self.model[NODES_LABEL][node].get("properties", None)

    """
    get relationships of a node in the model
    """
    def get_node_relationships(self, node):
        if self.model[NODES_LABEL].get(node):
            return self.model[NODES_LABEL][node].get(RELATIONSHIPS, None)
        
    """
    get required properties of a node in the model
    """
    def get_node_req_props(self, node):
        props = self.get_node_props(node)
        if not props:
            return None
        return {k: v for (k, v) in props.items() if v.get("required") == True}
    
    """
    get file nodes in the model
    """
    def get_file_nodes(self):
        return self.model.get("file-nodes", {})
    
    """
    
    get main nodes in the model
    """
    def get_main_nodes(self):
        return self.model.get("main-nodes", {})
    
    """
    
    get file name property
    """
    def get_file_name(self):
        file_nodes_dict =  self.model.get("file-nodes", {})
        file_nodes_vals = list(file_nodes_dict.values())
        return file_nodes_vals[0]["name-field"] if len(file_nodes_vals) > 0 else None
    
    """
    get list delimiter
    """
    def get_list_delimiter(self):
        return self.model.get(LIST_DELIMITER_PROP)
    
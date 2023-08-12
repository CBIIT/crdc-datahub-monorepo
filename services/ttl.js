const { response } = require('../app');
const config = require('../config');

const getTTL = (req, res) => {
    if (req.sessionID){
        let expires = req.session.cookie.expires;
        let response
        if (!expires){
            response = {ttl: 0}
        }
        else {
            let dt = new Date(expires);
            let ttl = Math.round((dt.valueOf() - Date.now()));
            response = {ttl: ttl};
        }
        res.json(response)
        // console.log(response)
    } else {
        res.json({ttl: null, error: "An internal server error occurred, please contact the administrators"});
    }
}



module.exports = {
    getTTL
}
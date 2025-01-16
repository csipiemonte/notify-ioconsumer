var commons = require("../../commons/src/commons");
const conf = commons.merge(require('./conf/ioconsumer'), require('./conf/ioconsumer-' + (process.env.ENVIRONMENT || 'localhost')));
const obj = commons.obj(conf);

const logger = obj.logger();
const eh = obj.event_handler();
const utility = obj.utility();

const req_promise = require("request-promise");

function checkIoItalia(payloadMessage) {
    var res = [];

    if (!payloadMessage) {
        res.push("payload not present");
        return res;
    }
    if (typeof payloadMessage !== 'object' || Array.isArray(payloadMessage)) {
        res.push("payload element is not a valid object");
        return res;
    }

    if (!payloadMessage.id) res.push("id field is mandatory");//payloadMessage.id = Utility.uuid();
    if (!payloadMessage.user_id) res.push("user_id is mandatory");
    if (!payloadMessage.user_id.match(/^[A-Z]{6}[0-9LMNPQRSTUV]{2}[ABCDEHLMPRST][0-9LMNPQRSTUV]{2}[A-Z][0-9LMNPQRSTUV]{3}[A-Z]$/g)) res.push("user_id must be a correct fiscal code");
    if (!utility.checkNested(payloadMessage,"io.content")) res.push("io content is mandatory");
    if (utility.checkNested(payloadMessage,"io.time_to_live") && (typeof payloadMessage.io.time_to_live !== "number" || payloadMessage.io.time_to_live < 3600 || payloadMessage.io.time_to_live > 604800 )) res.push("io time_to_live is not in a valid range");
    if (!utility.checkNested(payloadMessage,"io.content.subject") || payloadMessage.io.content.subject.length < 10 || payloadMessage.io.content.subject.length > 120) res.push("io content.subject is not valid");
    if (!utility.checkNested(payloadMessage,"io.content.markdown") || payloadMessage.io.content.markdown.length < 80 || payloadMessage.io.content.markdown.length > 10000 ) res.push("io content.markdown is not valid");
    if (utility.checkNested(payloadMessage,"io.content.due_date") && !payloadMessage.io.content.due_date.match(/^(-?(?:[1-9][0-9]*)?[0-9]{4})-(1[0-2]|0[1-9])-(3[01]|0[1-9]|[12][0-9])T(2[0-3]|[01][0-9]):([0-5][0-9]):([0-5][0-9])(\.[0-9]+)?((Z)|([\+\-][0-5][0-9]\:[0-5][0-9])|([\+\-][0-5][0-9])|([\+\-][0-5][0-9][0-5][0-9]))?$/g)) res.push("io due_date is not in a valid ISO 8601 date");
    if (utility.checkNested(payloadMessage,"io.content.payment_data")){
        if (!utility.checkNested(payloadMessage,"io.content.payment_data.amount") || payloadMessage.io.content.payment_data.amount < 1 || payloadMessage.io.content.payment_data.amount > 9999999999  ) res.push("io content.payment_data.amount is not valid");
        if (!utility.checkNested(payloadMessage,"io.content.payment_data.notice_number") ||  !payloadMessage.io.content.payment_data.notice_number.match(/^[0123][0-9]{17}$/g) ) res.push("io content.payment_data.notice_number is not valid");
    }

    return res;
}

async function sendToIoItalia(body){
    
    if(!body.user.preferences.io) throw {client_source: "ioconsumer", type: "client_error", description: "ioitalia token is not setted", message: "ioitalia token is not setted", level: "warn" };
    
    let message = {
        id: body.payload.id,
        bulk_id: body.payload.bulk_id,
        user_id: body.payload.user_id,
        tag: body.payload.tag,
        correlation_id: body.payload.correlation_id,
        tenant: body.user.tenant ? body.user.tenant : conf.defaulttenant
    }
    
    eh.info("trying to send to ioitalia", JSON.stringify({
        message: message
    }));
    logger.debug("trying to send to ioitalia");
    
    try {
        let optionsProfile = {
            url: conf.ioitalia.api.url + "profiles/" + body.payload.user_id,
            method: 'GET',
            headers: {
                'Ocp-Apim-Subscription-Key': body.user.preferences.io
            },
            json:true
        };
        let profile = await req_promise(optionsProfile);
        logger.trace(profile);
        if(!profile.sender_allowed || profile.sender_allowed === false) throw {statusCode:200, type:"client_error", client_source:"ioconsumer", description:"sender not allowed", message: "error sender not allowed"};
    } catch(err) {
        
        if(err.error && err.error.detail) err.description = err.error.detail;
        err.client_source = "ioconsumer";
        if(err.statusCode === 400 || err.statusCode === 404 || err.statusCode === 200) {
            err.type = "client_error";
            err.level = "debug";
        } else {
            err.type = "system_error";
        }
        throw err;
    }

    try {
        let optionsMessage = {
            url: conf.ioitalia.api.url + "messages/" + body.payload.user_id,
            method: 'POST',
            headers: {
                'Ocp-Apim-Subscription-Key': body.user.preferences.io
            },
            body: body.payload.io,
            json: true
        };

        message.ioitalia = await req_promise(optionsMessage);
        eh.ok("ioitalia sent",JSON.stringify({
            sender: body.user.preference_service_name,
            message: message
        }));
        logger.info("ioitalia sent");

    } catch(err) {
        if(err.error && err.error.detail) err.description = err.error.detail;
        err.client_source = "ioconsumer";
        if(err.statusCode === 400)
            err.type = "client_error";
        else
            err.type = "system_error";
        throw err;
    }
}

logger.info("environment:", JSON.stringify(process.env, null, 4));
logger.info("configuration:", JSON.stringify(conf, null, 4));
obj.consumer("io", checkIoItalia, null, sendToIoItalia, true)();
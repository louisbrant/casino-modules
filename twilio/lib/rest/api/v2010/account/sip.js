"use strict";
/*
 * This code was generated by
 * ___ _ _ _ _ _    _ ____    ____ ____ _    ____ ____ _  _ ____ ____ ____ ___ __   __
 *  |  | | | | |    | |  | __ |  | |__| | __ | __ |___ |\ | |___ |__/ |__|  | |  | |__/
 *  |  |_|_| | |___ | |__|    |__| |  | |    |__] |___ | \| |___ |  \ |  |  | |__| |  \
 *
 * Twilio - Api
 * This is the public Twilio REST API.
 *
 * NOTE: This class is auto generated by OpenAPI Generator.
 * https://openapi-generator.tech
 * Do not edit the class manually.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.SipListInstance = void 0;
const util_1 = require("util");
const deserialize = require("../../../../base/deserialize");
const serialize = require("../../../../base/serialize");
const utility_1 = require("../../../../base/utility");
const credentialList_1 = require("./sip/credentialList");
const domain_1 = require("./sip/domain");
const ipAccessControlList_1 = require("./sip/ipAccessControlList");
function SipListInstance(version, accountSid) {
    if (!(0, utility_1.isValidPathParam)(accountSid)) {
        throw new Error("Parameter 'accountSid' is not valid.");
    }
    const instance = {};
    instance._version = version;
    instance._solution = { accountSid };
    instance._uri = `/Accounts/${accountSid}/SIP.json`;
    Object.defineProperty(instance, "credentialLists", {
        get: function credentialLists() {
            if (!instance._credentialLists) {
                instance._credentialLists = (0, credentialList_1.CredentialListListInstance)(instance._version, instance._solution.accountSid);
            }
            return instance._credentialLists;
        },
    });
    Object.defineProperty(instance, "domains", {
        get: function domains() {
            if (!instance._domains) {
                instance._domains = (0, domain_1.DomainListInstance)(instance._version, instance._solution.accountSid);
            }
            return instance._domains;
        },
    });
    Object.defineProperty(instance, "ipAccessControlLists", {
        get: function ipAccessControlLists() {
            if (!instance._ipAccessControlLists) {
                instance._ipAccessControlLists = (0, ipAccessControlList_1.IpAccessControlListListInstance)(instance._version, instance._solution.accountSid);
            }
            return instance._ipAccessControlLists;
        },
    });
    instance.toJSON = function toJSON() {
        return instance._solution;
    };
    instance[util_1.inspect.custom] = function inspectImpl(_depth, options) {
        return (0, util_1.inspect)(instance.toJSON(), options);
    };
    return instance;
}
exports.SipListInstance = SipListInstance;
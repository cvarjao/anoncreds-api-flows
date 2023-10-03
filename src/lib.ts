import { readFileSync } from 'fs'
import axios, {isCancel, AxiosError} from 'axios';
import qrcode from 'qrcode-terminal';
import path from 'path'
import Jimp from "jimp";
import QRCode from 'qrcode'
import { PersonCredential1 } from './mocks';
import querystring from 'querystring';


export const toLocalISOString = (date:Date) =>{
    const tzoffset = (new Date()).getTimezoneOffset() // offset in minutes
    const tzoffsetInHours = Math.floor(tzoffset / 60) //offset in hours
    const tzoffsetInMilliseconds = tzoffset * 60000; //offset in milliseconds
    return (new Date(date.getTime() - tzoffsetInMilliseconds)).toISOString().slice(0, -1) + '-' + new String(tzoffsetInHours).padStart(2, '0')
}


export const seconds_since_epoch = (date:Date) =>{
    return Math.floor( date.getTime() / 1000 )
}

const sanitize = (obj: any) => {
    Object.keys(obj).forEach(key => {
        if (obj[key] === undefined) {
          delete obj[key];
        }
      });
    return obj
}

export const waitFor = (ms:number) => {
    return new Promise ((resolve) => {
        setTimeout(() => {
            resolve(true)
        }, ms);
    })
}
function randomString(length: number) {
    // Declare all characters
    let chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';

    // Pick characers randomly
    let str = '';
    for (let i = 0; i < length; i++) {
        str += chars.charAt(Math.floor(Math.random() * chars.length));
    }

    return str;
}

export class SchemaBuilder {
    private schema_id?: string
    private schema_name?: string;
    private schema_version?: string;
    private attributes?: string[];
    getSchemaId() {
        return this.schema_id
    }
    setSchemaId(value:string) {
        this.schema_id = value
    }
    getName() {
        return this.schema_name
    }
    setName(name:string) : SchemaBuilder {
        this.schema_name = name
        return this
    }
    getVersion() {
        return this.schema_version
    }
    setVersion(name:string) : SchemaBuilder {
        this.schema_version = name
        return this
    }
    getAttributes() {
        return this.attributes
    }
    setAttributes(attributes:string[]) : SchemaBuilder {
        this.attributes = attributes
        return this
    }
    build() {
        return sanitize({
            "schema_name": this.schema_name,
            "schema_version": this.schema_version,
            "attributes": this.attributes
        })
    }
}

export class CredentialDefinitionBuilder {
    private schema_id?:string
    private support_revocation: boolean=false
    private tag?:string
    private _schema?: SchemaBuilder
    private _id?:string
    setId(value: any) {
        this._id = value
        return this
    }
    getId() {
        return this._id
    }
    setSchema(value:SchemaBuilder) {
        this._schema = value
        return this
    }
    getSchema() {
        return this._schema
    }
    public setSchemaId(value:string) {
        this.schema_id = value
        return this
    }
    public  getSchemaId() {
        return this.schema_id
    }
    public setSupportRevocation(value:boolean) {
        this.support_revocation = value
        return this
    }
    public getSupportRevocation() {
        return this.support_revocation
    }
    public setTag(value:string) {
        this.tag = value
        return this
    }
    public getTag() {
        return this.tag?? (this.support_revocation ? "revocable":"irrevocable")
    }
    public build() {
        return sanitize({
            "schema_id": this.schema_id??this._schema?.getSchemaId(),
            "support_revocation": this.support_revocation,
            "tag": this.getTag()
        })
    }
}

export class RequestAttributeBuilder {
    private names: string[] = [];
    private restrictions: any[] = []
    private nonRevoked?:any
    getNames() {
        return this.names
    }
    setNames(names:string[]) {
        this.names = names
        return this
    }
    setNonRevoked(value:number) {
        this.nonRevoked = { to: value}
        return this
    }
    addRestriction(retriction: any) {
        this.restrictions.push(retriction)
        return this
    }
    build() {
        console.log('nonRevoked')
        console.dir(this.nonRevoked)
        return sanitize({
            names: this.names,
            restrictions: this.restrictions,
            non_revoked: this.nonRevoked
        })
    }
}

export class IssueCredentialPreviewV1 {
    private attributes: any[] = []
    private _revocation_id?: string
    private _revoc_reg_id?: string
    private _credential_exchange_id?: string
    private _connection_id?: string
    setConnectionId(connection_id: any) {
        this._connection_id = connection_id
    }
    getConnectionId() {
        return this._connection_id
    }
    setRevocationId(revocation_id: string) {
        this._revocation_id = revocation_id
        return this
    }
    getRevocationId() {
        return this._revocation_id
    }
    setRevocationRegisttryId(revoc_reg_id: string) {
        this._revoc_reg_id = revoc_reg_id
        return this
    }
    getRevocationRegisttryId() {
        return this._revoc_reg_id
    }
    setCredentialExchangeId(credential_exchange_id: string) {
        this._credential_exchange_id = credential_exchange_id
        return this
    }
    getCredentialExchangeId() {
        return this._credential_exchange_id
    }
    getAttributes() {
        return this.attributes
    }
    addAttribute({name, value}: {name: string, value: string}) {
        this.attributes.push({name: name, value: value})
        return this
    }
    async build () {
        return {
            "@type": "issue-credential/1.0/credential-preview",
            "attributes": this.attributes,
        }
    }
}

export class ProofRequestBuilder {
    private name: string = "proof-request"
    private version: string = "1.0"
    private requested_attributes: any = {}
    private requested_predicates: any = {}
    private nonce:string = "1234567890" //randomString(10)

    getName() {
        return this.name
    }
    setName(name:string) {
        this.name = name
        return this
    }
    getVersion() {
        return this.version
    }
    setVersion(name:string) {
        this.version = name
        return this
    }

    addRequestedAttribute(group: string, attribute:RequestAttributeBuilder) {
        this.requested_attributes[group] = attribute.build()
        return this
    }
    build() {
        return sanitize({
            "name": this.name,
            "version": this.version,
            "nonce": this.nonce,
            "requested_attributes": this.requested_attributes,
            "requested_predicates": this.requested_predicates,
        })
    }
}
export const createPersonSchema =  async (config: any, state: any, schemaBuilder: SchemaBuilder) => {
    const schema = schemaBuilder.build()
    const schemas = await axios.get(`${config.base_url}/schemas/created`, {
        params:{schema_name: schema.schema_name, schema_version: schema.schema_version},
        headers:{
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${config.auth_token}`
        }
    })
    if (schemas.data.schema_ids.length === 0){
        console.log('Creating Schema ...')
        await axios.post(`${config.base_url}/schemas`, schema, {
            headers:{
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${config.auth_token}`
            }
        })
        .then((value)=>{
            schemaBuilder.setSchemaId(value.data.sent.schema_id)
            console.log(`Schema created '${value.data.sent.schema_id}'`)
            config.current_schema_id=value.data.sent.schema_id
        })
    } else {
        schemaBuilder.setSchemaId(schemas.data.schema_ids[0])
        console.log(`Schema found '${schemas.data.schema_ids[0]}'`)
        config.current_schema_id=schemas.data.schema_ids[0]
    }
}

export const createPersonSchemaCredDefinition =  async (config:any, state:any, credDefBuilder: CredentialDefinitionBuilder) => {
    const schemas = await axios.get(`${config.base_url}/credential-definitions/created`, {
        params:{schema_name: credDefBuilder.getSchema()?.getName(), schema_version: credDefBuilder.getSchema()?.getVersion()},
        headers:{
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${config.auth_token}`
        }
    })
    const credential_definitions:any[] = []
    if (schemas.data.credential_definition_ids.length > 0) {
        const credential_definition_ids:string[] = schemas.data.credential_definition_ids
        for (const credential_definition_id of credential_definition_ids) {
            const credential_definition = await axios.get(`${config.base_url}/credential-definitions/${credential_definition_id}`, {
                headers:{
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${config.auth_token}`
                }
            })
            const credDef = credential_definition.data
            if (!credDefBuilder.getSupportRevocation() && credDef.credential_definition.value.revocation === undefined){
                credential_definitions.push(credDef)
            } else if (credDefBuilder.getSupportRevocation() && credDef.credential_definition.value.revocation !== undefined){
                credential_definitions.push(credDef)
            }
        }
    }
    if (credential_definitions.length === 0){
        console.log('Creating Credential Definition ...')
        await axios.post(`${config.base_url}/credential-definitions`,credDefBuilder.build(), {
            headers:{
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${config.auth_token}`
            }
        })
        .then((value)=>{
            console.log('Created CredDef')
            console.dir(value.data, {depth: 5, maxStringLength: 50})
            const credential_definition_id = value.data.sent.credential_definition_id
            config.current_credential_definition_id=credential_definition_id
            console.log(`Credential Definition created '${credential_definition_id}'`)
        })
    } else {
        const credDef = credential_definitions[0].credential_definition
        const credential_definition_id = credDef.id
        credDefBuilder.setId(credDef.id)
        credDefBuilder.setTag(credDef.tag)
        console.log(`Credential Definition found '${credential_definition_id}'`)
        config.current_credential_definition_id=credential_definition_id
    }
}

export const createAuthToken =  async (config: any, state: any) => {
    await axios.post(`${config.base_url}/multitenancy/wallet/${config.wallet_id}/token`,{"wallet_key":config.wallet_key})
    .then((value)=>{
        config.auth_token = value.data.token
    })
}

export const showInvitationQRCodeInTerminal = async (config: any, state: any) => {
    qrcode.generate(config.current_invitation_url, {small: true});
}

export const saveInvitationQRCode4Android = async (config:any, state:any) => {
    return QRCode.toFile(
        '/Users/cvarjao/Library/Android/sdk/emulator/resources/custom.png',
        config.current_invitation_url,
    ).then (()=>{
        console.log('QRCode saved to ~/Library/Android/sdk/emulator/resources/custom.png')
        console.log(`invitation_url:${config.current_invitation_url}`)
    })
    //await QRCode.toDataURL(config.current_invitation_url, {})
}

export const createInvitationToConnect = async (config:any, state:any) => {
    await axios.post(`${config.base_url}/connections/create-invitation`,{
        "my_label": "Faber`s 😇",
        "image_url": "https://bc-wallet-demo-agent-admin.apps.silver.devops.gov.bc.ca/public/student/connection/best-bc-logo.png"
    }, {
        headers:{
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${config.auth_token}`
        }
    })
    .then((value)=>{
        console.dir(value.data)
        console.log(`invitation_url=${value.data.invitation_url}`)
        config.current_invitation=value.data.invitation
        config.current_invitation_url=value.data.invitation_url
        config.current_connection_id=value.data.connection_id
    })
}

export const acceptInvitationToConnect = async (config: any, state: any) => {
    await axios.post(`${config.base_url}/connections/receive-invitation`,config.current_invitation, {
        params: {
            "alias": "Alice",
        },
        headers:{
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${config.auth_token}`
        }
    })
    .then((value)=>{
        console.log('Acceppted connection')
        //console.dir(value.data)
    })
}
export const waitForProofRequest = async (config: any, state: any) => {
    //console.log(`/present-proof/records/${config.presentation_exchange_id}`)
    return axios.get(`${config.base_url}/present-proof/records/${config.presentation_exchange_id}`, {
        headers:{
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${config.auth_token}`
        }
    })
    .then((value)=>{
        console.log(`proof request state: ${value.data.state}`)
        if (!(value.data.state === 'verified' || value.data.state === 'abandoned')) {
            return new Promise ((resolve) => {
                setTimeout(() => {
                    resolve(waitForProofRequest(config, state))
                }, 2000);
            })
        }
    })
}

export const waitForConnectionReady = async (config: any, state: any) => {
    await axios.get(`${config.base_url}/connections/${config.current_connection_id}`, {
        headers:{
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${config.auth_token}`
        }
    })
    .then((value)=>{
        if (value.data.state !== 'active') {
            //console.log(`connection state: ${value.data.state}`)
            return new Promise ((resolve) => {
                setTimeout(() => {
                    resolve(waitForConnectionReady(config, state))
                }, 2000);
            })
        }
    })
}

export const waitForCredentialRevoked = async (config: any, state: any, cred: IssueCredentialPreviewV1) => {
    await axios.get(`${config.base_url}/revocation/credential-record`, {
        params: {
            //"cred_ex_id": cred.getCredentialExchangeId(),
            "cred_rev_id": cred.getRevocationId(),
            "rev_reg_id": cred.getRevocationRegisttryId()
        },
        headers:{
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${config.auth_token}`
        }
    })
    .then((value)=>{
        //console.log('waitForCredentialRevoked:')
        //console.dir(value.data, {depth: 5, maxStringLength: 50})
        console.log(`revocation status: ${value.data?.result?.state}`)
        if (value.data?.result?.state !== 'revoked') {
            //console.log(`connection state: ${value.data.state}`)
            return new Promise ((resolve) => {
                setTimeout(() => {
                    resolve(waitForCredentialRevoked(config, state, cred))
                }, 2000);
            })
        }
    })
}

export const waitForOfferAccepted = async (config: any, state: any, cred: IssueCredentialPreviewV1) => {
    await axios.get(`${config.base_url}/issue-credential/records/${cred.getCredentialExchangeId()}`, {
        headers:{
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${config.auth_token}`
        }
    })
    .then((value)=>{
        if (value.data.state !== 'credential_acked') {
            //console.log('Issued Credential:')
            //console.dir(value.data, {maxStringLength: 50, depth: 5})
            cred.setRevocationId(value.data.revocation_id)
            cred.setRevocationRegisttryId(value.data.revoc_reg_id)
            cred.setConnectionId(value.data.connection_id)

            //console.log(`connection state: ${value.data.state}`)
            return new Promise ((resolve) => {
                setTimeout(() => {
                    resolve(waitForOfferAccepted(config, state, cred))
                }, 2000);
            })
        }
    })
}

export const sendPersonCredential = async (config: any, state: any, cred: IssueCredentialPreviewV1) => {
    //const image =  await Jimp.read(path.join(__dirname, 'assets/photo.jpeg')).then((image)=> {return image.scale(1.5)}).then(image=>{return image.getBase64Async(image.getMIME())})
    //const photoValue = image
    //const photoValueSize = Buffer.byteLength(photoValue)
    //console.log(`photoValue:\n${photoValueSize} bytes / ${Math.round(photoValueSize /1024)} kb, ${photoValue.length} chars`)
    //console.log(`photoValue:\n${photoValue.substring(0, 100)}`)
    
    const data = {
        "auto_issue": true,
        "auto_remove": false,
        "connection_id": config.current_connection_id,
        "cred_def_id": config.current_credential_definition_id,
        "credential_preview": await cred.build(),
        "trace": false,
    }
    console.dir(data, {depth: 3, maxStringLength: 50})
    await axios.post(`${config.base_url}/issue-credential/send-offer`,data, {
        headers:{
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${config.auth_token}`
        }
    })
    .then((value)=>{
        cred.setCredentialExchangeId(value.data.credential_exchange_id)
        const credential_exchange_id = value.data.credential_exchange_id
        config.current_credential_exchange_id=credential_exchange_id
        console.log(`Credential offer sent!  ${credential_exchange_id}`)
    })
}
export const sendProofRequest = async (config: any, state: any, proofRequest: ProofRequestBuilder) => {
    await axios.post(`${config.base_url}/present-proof/send-request`,{
        "trace": false,
        "auto_verify": false,
        "comment": "Hello",
        "connection_id": config.current_connection_id,
        "proof_request": proofRequest.build()
    }, {
        headers:{
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${config.auth_token}`
        }
    })
    .then((value)=>{
        console.log('sendProofRequest:')
        console.dir(value.data, {depth: 6, maxStringLength: 50})
        config.presentation_exchange_id = value.data.presentation_exchange_id 
        //const credential_exchange_id = value.data.credential_exchange_id
        //config.current_credential_exchange_id=credential_exchange_id
        //console.log(`Credential offer sent!  ${credential_exchange_id}`)
    })
}

export class Context {
    private config: any;
    private state: any;

    constructor(config:any){
        this.config = config
        this.state = config
    }
    acceptInvitationToConnect() {
        return acceptInvitationToConnect(this.config, this.state)
    }
    sendProofRequest(builder: ProofRequestBuilder) {
        return sendProofRequest(this.config, this.state, builder)
    }
    waitForOfferAccepted(cred: IssueCredentialPreviewV1) {
        return waitForOfferAccepted(this.config, this.state, cred)
    }
    sendCredential(cred: IssueCredentialPreviewV1) {
        return sendPersonCredential(this.config, this.state, cred)
    }
    waitForConnectionReady() {
        return waitForConnectionReady(this.config, this.state)
    }
    showInvitationQRCodeInTerminal() {
        return showInvitationQRCodeInTerminal(this.config, this.state)
    }
    public async saveInvitationQRCode4Android() {
        return saveInvitationQRCode4Android(this.config, this.state)
    }
    public async createInvitationToConnect() {
        return createInvitationToConnect(this.config, this.state)
        .then(()=>{
            return this
        })
    }
    public async createAuthToken() {
        return createAuthToken(this.config, this.state)
    }
    public async createSchema( builder: SchemaBuilder) : Promise<Context> {
        return createPersonSchema(this.config, this.state, builder)
        .then(()=>{
            return this
        })
    }
    public async createCredentialDefinition(credDefBuilder: CredentialDefinitionBuilder) : Promise<Context> {
        return createPersonSchemaCredDefinition(this.config, this.state, credDefBuilder)
        .then(()=>{
            return this
        })
    }
    public async sendConnectionlessProofRequest(builder: ProofRequestBuilder) {
        const proofRequest = builder.build()
        const wallet = await axios.get(`${this.config.base_url}/wallet/did/public`, {
            params: {},
            headers:{
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${this.config.auth_token}`
            }
        })
        .then ((response) => {
            console.log(`> ${response.request.path}`)
            console.dir(response.data)
            console.log(`recipient_keys = [${response.data.result.verkey}`)
            return response.data
        })
        // serviceEndpoint: 'https://traction-acapy-dev.apps.silver.devops.gov.bc.ca'

        //throw new Error("Stop here")
        const proof = await axios.post(`${this.config.base_url}/present-proof/create-request`,{
            "auto_remove": true,
            "auto_verify": false,
            "comment": "string",
            "trace": false,
            proof_request: proofRequest
        }, {
            params: {},
            headers:{
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${this.config.auth_token}`
            }
        })
        .then ((response) => {
            console.log(`> ${response.request.path}`)
            console.dir(response.data, {depth: 5, maxStringLength: 50})
            return response.data
        })
        /*
        const exchangeRecord = await axios.get(`${this.config.base_url}/present-proof/records/${proof.presentation_exchange_id}`, {
            params: {},
            headers:{
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${this.config.auth_token}`
            }
        })
        .then ((response) => {
            console.log(`> ${response.request.path}`)
            console.dir(response.data)
            return response.data
        })
        */
        //const attachments = proof.presentation_request_dict['request_presentations~attach']
        const proofReqString = JSON.stringify(proof.presentation_request)
        console.log(`proofReqString:${proofReqString}`)
        const proofReqEncoded = Buffer.from(proofReqString).toString('base64')
        console.log(`Decoded proofReqString:${Buffer.from(proofReqEncoded, 'base64').toString('utf-8')}`)
        const attachments = [{
            "@id": "libindy-request-presentation-0",
            "mime-type": "application/json",
            "data": {
              "base64": proofReqEncoded
            }
          }]
        
        console.log('attachments')
        console.dir(attachments, {depth: 5, maxStringLength: 50})
        return Promise.resolve({
            "@id": proof.thread_id,
            "@type": 'did:sov:BzCbsNYhMrjHiqZDTUASHg;spec/present-proof/1.0/request-presentation',
            "request_presentations~attach": attachments,
            "comment": null,
            "~service": {
                "recipientKeys": [wallet.result.verkey],
                "routingKeys": null,
                "serviceEndpoint": "https://traction-acapy-dev.apps.silver.devops.gov.bc.ca"
              }
        }).then(value => {
            console.log('invitation:')
            console.log(JSON.stringify(value, undefined, 2))
            //console.dir(value, {depth: 5, maxStringLength: 80})
            this.config.current_invitation_url='https://traction-acapy-dev.apps.silver.devops.gov.bc.ca?c_i='+querystring.escape(Buffer.from(JSON.stringify(value)).toString('base64'))
            return value
        })
        
    }
    public async sendOOBProofRequest(builder: ProofRequestBuilder) {
        const proofRequest = builder.build()
        return axios.post(`${this.config.base_url}/present-proof/create-request`,{
            "auto_remove": true,
            "auto_verify": false,
            "comment": "string",
            "trace": false,
            proof_request: proofRequest
        }, {
            params: {},
            headers:{
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${this.config.auth_token}`
            }
        })
        .then ((response) => {
            //console.log(`> ${response.request.path}`)
            //console.dir(response.data)
            return response
        })
        .then ((response) => {
            const data = response.data
            this.config.presentation_exchange_id = data.presentation_exchange_id
            return axios.post(`${this.config.base_url}/out-of-band/create-invitation`, {
                "accept": [
                    "didcomm/aip1",
                    "didcomm/aip2;env=rfc19"
                  ],
                "alias": "Barry",
                "my_label": "Invitation to Barry",
                "protocol_version": "1.1",
                "use_public_did": false,
                "attachments": [
                    {
                      "id": data.presentation_exchange_id,
                      "type": "present-proof"
                    }
                  ],
            }, {
                params: {},
                headers:{
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${this.config.auth_token}`
                }
            })
        })
        .then ((response) => {
            const data = response.data
            //console.log(`> ${response.request.path}`)
            //console.dir(response.data)
            this.config.current_invitation=data.invitation
            this.config.current_invitation_url=data.invitation_url
            return response
        })
    }
    public async waitForPresentation() {
        console.log(`Waiting for Presentation ...`)
        return waitForProofRequest(this.config, this.state)
    }
    public async revokeCredential(personCred: IssueCredentialPreviewV1) {
        const response = await axios.post(`${this.config.base_url}/revocation/revoke`, {
            "comment": "You have been bad!",
            "connection_id": personCred.getConnectionId(),
            "cred_rev_id": personCred.getRevocationId(),
            "notify": true,
            "notify_version": "v1_0",
            "publish": true,
            "rev_reg_id": personCred.getRevocationRegisttryId()
          }, {
            params: {},
            headers:{
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${this.config.auth_token}`
            }
        })
        return Promise.resolve(response.data)
    }
    public async waitForCredentialRevoked(cred: IssueCredentialPreviewV1) {
        return waitForCredentialRevoked(this.config, this.state, cred)
    }
}
import { readFileSync } from 'fs'
import axios, {isCancel, AxiosError} from 'axios';
import qrcode from 'qrcode-terminal';
import path from 'path'
import Jimp from "jimp";
import QRCode from 'qrcode'


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

export const createPersonSchema =  async (config: any, state: any) => {
    const schema_name = 'Person'
    const schema_version = '1.0'
    const schemas = await axios.get(`${config.base_url}/schemas/created`, {
        params:{schema_name: schema_name, schema_version: schema_version},
        headers:{
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${config.auth_token}`
        }
    })
    if (schemas.data.schema_ids.length === 0){
        console.log('Creating Schema ...')
        await axios.post(`${config.base_url}/schemas`,{
            "schema_name": schema_name,
            "schema_version": schema_version,
            "attributes": ["given_names", "family_name", "picture"]
        }, {
            headers:{
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${config.auth_token}`
            }
        })
        .then((value)=>{
            console.log(`Schema created '${value.data.sent.schema_id}'`)
            config.current_schema_id=value.data.sent.schema_id
        })
    } else {
        console.log(`Schema found '${schemas.data.schema_ids[0]}'`)
        config.current_schema_id=schemas.data.schema_ids[0]
    }
}

export const createPersonSchemaCredDefinition =  async (config:any, state:any) => {
    const schema_name = 'Person'
    const schema_version = '1.0'
    const schemas = await axios.get(`${config.base_url}/credential-definitions/created`, {
        params:{schema_name: schema_name, schema_version: schema_version},
        headers:{
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${config.auth_token}`
        }
    })
    if (schemas.data.credential_definition_ids.length === 0){
        console.log('Creating Credential Definition ...')
        await axios.post(`${config.base_url}/credential-definitions`,{
            "schema_id": config.current_schema_id,
            "support_revocation": false,
            "tag": "default"
        }, {
            headers:{
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${config.auth_token}`
            }
        })
        .then((value)=>{
            console.log(value.data)
            const credential_definition_id = value.data.sent.credential_definition_id
            config.current_credential_definition_id=credential_definition_id
            console.log(`Credential Definition created '${credential_definition_id}'`)
            
        })
    } else {
        const credential_definition_id = schemas.data.credential_definition_ids[0]
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
        "my_label": "Faber",
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
    console.log(`/present-proof/records/${config.presentation_exchange_id}`)
    return axios.get(`${config.base_url}/present-proof/records/${config.presentation_exchange_id}`, {
        headers:{
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${config.auth_token}`
        }
    })
    .then((value)=>{
        console.log(`proof request state: ${value.data.state}`)
        if (value.data.state !== 'verified') {
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

export const waitForOfferAccepted = async (config: any, state: any) => {
    await axios.get(`${config.base_url}/issue-credential/records/${config.current_credential_exchange_id}`, {
        headers:{
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${config.auth_token}`
        }
    })
    .then((value)=>{
        if (value.data.state !== 'credential_acked') {
            //console.dir(value.data)
            //console.log(`connection state: ${value.data.state}`)
            return new Promise ((resolve) => {
                setTimeout(() => {
                    resolve(waitForOfferAccepted(config, state))
                }, 2000);
            })
        }
    })
}

export const sendPersonCredential = async (config: any, state: any) => {
    const image =  await Jimp.read(path.join(__dirname, 'assets/photo.jpeg')).then((image)=> {return image.scale(1)}).then(image=>{return image.getBase64Async(image.getMIME())})
    const photoValue = image
    const photoValueSize = Buffer.byteLength(photoValue)
    console.log(`photoValue:\n${photoValueSize} bytes / ${Math.round(photoValueSize /1024)} kb, ${photoValue.length} chars`)
    console.log(`photoValue:\n${photoValue.substring(0, 100)}`)
    await axios.post(`${config.base_url}/issue-credential/send-offer`,{
        "auto_issue": true,
        "auto_remove": false,
        "connection_id": config.current_connection_id,
        "cred_def_id": config.current_credential_definition_id,
        "credential_preview": {
            "@type": "issue-credential/1.0/credential-preview",
            "attributes": [
                {name: "given_names", value: "John"},
                {name: "family_name", value: "Doe"},
                {name: "picture", value: photoValue},
            ],
        },
        "trace": false,
    }, {
        headers:{
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${config.auth_token}`
        }
    })
    .then((value)=>{
        const credential_exchange_id = value.data.credential_exchange_id
        config.current_credential_exchange_id=credential_exchange_id
        console.log(`Credential offer sent!  ${credential_exchange_id}`)
    })
}
export const sendProofRequest = async (config: any, state: any) => {
    await axios.post(`${config.base_url}/present-proof/send-request`,{
        "trace": false,
        "auto_verify": false,
        "comment": "Hello",
        "connection_id": config.current_connection_id,
        "proof_request": {
            "name": "proof-request",
            "nonce": "1234567890",
            "version": "1.0",
            "requested_attributes": {
                "studentInfo": {
                    "names": [
                        "given_names",
                        "family_name"
                    ],
                    "restrictions": [
                        {
                            "schema_name": "Person"
                        }
                    ]
                }
            },
            "requested_predicates": {}
        }
    }, {
        headers:{
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${config.auth_token}`
        }
    })
    .then((value)=>{
        console.dir(value.data)
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
    sendProofRequest() {
        return sendProofRequest(this.config, this.state)
    }
    waitForOfferAccepted() {
        return waitForOfferAccepted(this.config, this.state)
    }
    sendPersonCredential() {
        return sendPersonCredential(this.config, this.state)
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
    public async createPersonSchema() : Promise<Context> {
        return createPersonSchema(this.config, this.state)
        .then(()=>{
            return this
        })
    }
    public async createPersonSchemaCredDefinition() : Promise<Context> {
        return createPersonSchemaCredDefinition(this.config, this.state)
        .then(()=>{
            return this
        })
    }
    public async sendOOBProofRequest() {
        const proofRequest = {
            "name": "proof-request",
            "version": "1.0",
            "requested_attributes": {
               "person_attrs": {
                  "names": [
                    "given_names",
                    "family_name"
                     ],
                     "restrictions": [
                        {
                            "schema_name": "Person"
                        }
                    ]
               }
            },
            "requested_predicates": {}
         }
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
        return waitForProofRequest(this.config, this.state)
    }
}
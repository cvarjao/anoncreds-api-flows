import { readFileSync } from 'fs'
import axios, {isCancel, AxiosError} from 'axios';
import qrcode from 'qrcode-terminal';
import path from 'path'
import Jimp from "jimp";
import QRCode from 'qrcode'

const config = require('../local.env.json')

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

const createPersonSchema =  async () => {
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

const createPersonSchemaCredDefinition =  async () => {
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

const createAuthToken =  async () => {
    await axios.post(`${config.base_url}/multitenancy/wallet/${config.wallet_id}/token`,{"wallet_key":config.wallet_key})
    .then((value)=>{
        config.auth_token = value.data.token
    })
}

const showInvitationQRCodeInTerminal = async () => {
    qrcode.generate(config.current_invitation_url, {small: true});
}

const saveInvitationQRCode4Android = async () => {
    await QRCode.toFile(
        '/Users/cvarjao/Library/Android/sdk/emulator/resources/custom.png',
        config.current_invitation_url,
      )
      console.log('QRCode saved to ~/Library/Android/sdk/emulator/resources/custom.png')
    //await QRCode.toDataURL(config.current_invitation_url, {})
}

const createInvitationToConnect = async () => {
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

const acceptInvitationToConnect = async () => {
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
const waitForConnectionReady = async () => {
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
                    resolve(waitForConnectionReady())
                }, 2000);
            })
        }
    })
}

const waitForOfferAccepted = async () => {
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
                    resolve(waitForOfferAccepted())
                }, 2000);
            })
        }
    })
}

const sendPersonCredential = async () => {
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
const sendProofRequest = async () => {
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
(async () => {
    try {
        await createAuthToken()
        await createPersonSchema()
        await createPersonSchemaCredDefinition()
        await createInvitationToConnect()
        await saveInvitationQRCode4Android()
        await showInvitationQRCodeInTerminal()
        //await acceptInvitationToConnect()
        await waitForConnectionReady()
        await sendPersonCredential()
        await waitForOfferAccepted()
        //console.dir(config)
        await sendProofRequest()
    } catch (e) {
        console.error(e)
        // Deal with the fact the chain failed
    }
    // `text` is not available here
})();
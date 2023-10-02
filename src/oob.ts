import * as lib from './lib'
import { CredentialDefinitionBuilder } from './lib';
import { PersonSchema1 } from './mocks';

(async () => {
    const config = require('../local.env.json')
    const ctx = new lib.Context(config)
    try {
        const schema = new PersonSchema1()
        const credDef = new CredentialDefinitionBuilder().setSchema(schema).setSupportRevocation(true)
        await ctx.createAuthToken()
        await ctx.createSchema(schema)
        await ctx.createCredentialDefinition(credDef)
        //await ctx.createInvitationToConnect()
        //await ctx.saveInvitationQRCode4Android()
        //await ctx.showInvitationQRCodeInTerminal()
        //await ctx.acceptInvitationToConnect()
        //await ctx.waitForConnectionReady()
        //await ctx.sendPersonCredential()
        //await ctx.waitForOfferAccepted()
        //console.dir(config)
        await ctx.sendOOBProofRequest()
        await ctx.saveInvitationQRCode4Android()
        //await ctx.showInvitationQRCodeInTerminal()
        //await ctx.waitForConnectionReady()
        await ctx.waitForPresentation()
        //await ctx.sendProofRequest()
    } catch (e) {
        console.error(e)
        // Deal with the fact the chain failed
    }
    // `text` is not available here
})();
import * as lib from './lib'

(async () => {
    const config = require('../local.env.json')
    const ctx = new lib.Context(config)
    try {
        await ctx.createAuthToken()
        await ctx.createPersonSchema()
        await ctx.createPersonSchemaCredDefinition()
        await ctx.createInvitationToConnect()
        await ctx.saveInvitationQRCode4Android()
        await ctx.showInvitationQRCodeInTerminal()
        //await acceptInvitationToConnect()
        await ctx.waitForConnectionReady()
        await ctx.sendPersonCredential()
        await ctx.waitForOfferAccepted()
        //console.dir(config)
        await ctx.sendProofRequest()
    } catch (e) {
        console.error(e)
        // Deal with the fact the chain failed
    }
    // `text` is not available here
})();
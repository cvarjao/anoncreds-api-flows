import * as lib from './lib'
import { CredentialDefinitionBuilder, ProofRequestBuilder, RequestAttributeBuilder, seconds_since_epoch, waitFor } from './lib';
import { PersonCredential1, PersonSchema1 } from './mocks';

(async () => {
    const config = require('../local.env.json')
    const ctx = new lib.Context(config)
    try {
        const schema = new PersonSchema1()
        const credDef = new CredentialDefinitionBuilder().setSchema(schema).setSupportRevocation(true)
        await ctx.createAuthToken()
        await ctx.createSchema(schema)
        await ctx.createCredentialDefinition(credDef)
        await ctx.sendConnectionlessProofRequest(new ProofRequestBuilder()
            .addRequestedAttribute("0_student_info",
                new RequestAttributeBuilder()
                    .setNames(["given_names", "family_name"])
                    .addRestriction({"schema_name": schema.getName()})
                    .setNonRevoked(seconds_since_epoch(new Date()))
            )
        )
        await ctx.saveInvitationQRCode4Android()
        //await ctx.showInvitationQRCodeInTerminal()
        //await ctx.createInvitationToConnect()
        //await ctx.saveInvitationQRCode4Android()
        //await ctx.showInvitationQRCodeInTerminal()
        //await acceptInvitationToConnect()
        //await ctx.waitForConnectionReady()
        //const personCred = new PersonCredential1()
        //await ctx.sendCredential(personCred)
        //await ctx.waitForOfferAccepted(personCred)
        //console.log('personCred:')
        //console.dir(personCred, {maxStringLength: 50})
        //console.dir(config)
        /*
        await ctx.sendProofRequest(new ProofRequestBuilder()
            .addRequestedAttribute("studentIndo",
                new RequestAttributeBuilder().setNames(["given_names", "family_name"]).addRestriction({"schema_name": schema.getName()})
            )
        )
        await ctx.waitForPresentation()
        await ctx.sendProofRequest(new ProofRequestBuilder()
            .addRequestedAttribute("studentIndo",
                new RequestAttributeBuilder()
                    .setNames(["given_names", "family_name"])
                    .addRestriction({"schema_name": schema.getName()})
                    .setNonRevoked(seconds_since_epoch(new Date()))
            )
        )
        await ctx.waitForPresentation()
        */
    } catch (e) {
        console.error(e)
        // Deal with the fact the chain failed
    }
    // `text` is not available here
})();
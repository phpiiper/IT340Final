import mainDAO from '../dao/mainDAO.js'
import jwt from 'jsonwebtoken'
import bcrypt from "bcrypt";

export default class MainController {
    // USER TOOLS
    static async apiRegister(req, res, next){
        await mainDAO.log(3, "apiRegister", "Called API", "")
        const body = req.body
        if (!body?.username || !body?.email || !body?.password) {
            await mainDAO.log(3, "apiRegister", "Error in Registering", "Missing info")
            return res.json({
                success: false, error: true,
                 message: "Missing info...!",
                req: req.body
            })
        }
        const {error, message} = await mainDAO.createUser(body)
        if (error) {
            await mainDAO.log(2, "apiRegister", "Error in Registering", message)
            return res.json({
                success: false, error: true, message
            })
        }
        await mainDAO.log(3, "apiRegister", "Successfully registered user", `Called by ${body?.username})`)
        let response = {
            res: "register",
            success: !error,
            error,
            message
        }
        res.json(response)
    }
    // AUTH TOOLS
    /*
        new login...
     */
     static async apiNewLogin(req, res, next){
        try {
            await mainDAO.log(3, "apiNewLogin", "Called API", "")
            // get user
            const {error, message, user} = await mainDAO.getUserByPassword(req?.body?.email, req?.body?.password)
            if (error){
                return res.json({success: false, error: true, message})
            }
            // then send code
            const {error: scError, message: scMessage} = await mainDAO.sendCode(user)
            if (scError){ return res.json({success: false, error: true, message: scMessage}) }

            return res.json({success: true, error: false, message: "Successfully sent code to user!"})
        } catch (e){
            await mainDAO.log(1, "apiNewLogin", "Catch Error", e.message)
            res.json({success: false, error: true, message: e})
        }
     }
     static async apiVerifyLogin(req, res, next){
         try {
            // re-verify user
             await mainDAO.log(3, "apiVerifyLogin", "Called API", "")
             const {email, password, code} = req?.body
             if (!email || !password || !code) { return res.json({success: false, error: true, message: "Missing keys in payload!"}) }

             const {error, message, user} = await mainDAO.getUserByPassword(email, password)
             if (error){ return res.json({success: false, error: true, message}) }
             // check for valid request
             const {error: vcError, message: vcMessage} = await mainDAO.verifyCode(user, code)
             if (vcError) { return res.json({success: false, error: true, message: vcMessage}) }

             // now create cookie
             const jwtToken = jwt.sign(
                 {
                     id: user._id,
                     username: user.username,
                     role: user.role,
                 },
                 process.env.JWT_SECRET,
                 {
                     algorithm: "HS256",
                     expiresIn: '4h'
                 })
             // set cookie
             res.cookie(process.env.COOKIE_NAME, jwtToken, {
                 httpOnly: true,
                 secure: false,
                 sameSite: "lax",
                 maxAge: 14400000
             })

             await mainDAO.log(3, "apiVerifyLogin", "Successful MFA verified  user", `Called by user ${user._id}`)
             return res.json({success: true, error: false, message: "Successfully verified user!"})
         } catch (e){
             await mainDAO.log(1, "apiVerifyLogin", "Catch Error", e.message)
             res.json({success: false, error: true, message: e})
         }
     }
    static async apiCheckLogin(req,res,next) {
        //
        try {
            const verify = jwt.verify(req.cookies[process.env.COOKIE_NAME], process.env.JWT_SECRET)
            await mainDAO.log(3, "apiCheckLogin", "Successful Get of Login Info", `Called by user ${verify.id}`)
            let response = {
                res: "logIn",
                verify: verify,
                success: true, error: false
            }
            res.json(response)
        } catch(e){
            await mainDAO.log(1, "apiCheckLogin", "Catch Error", e.message)
            let response = {
                res: "logIn",
                verify: null,
                success: false,
                error: e?.message || e, // replace to "true"
                message: e?.message || e
            }
            res.json(response)
        }
    }
    static async apiSignOut(req,res,next) {
        //
        try {
            await mainDAO.log(3, "apiSignOut", "Called API", "")
            res.clearCookie(process.env.COOKIE_NAME)
            let response = {
                res: "signOut",
                success: true, error: false,
            }
            res.json(response)
        } catch(e){
            await mainDAO.log(1, "apiSignOut", "Catch Error", e.message)
            let response = {
                res: "signOut",
                verify: null,
                error: e, success: false
            }
            res.json(response)
        }
    }

    // FETCH DATA
    static async apiGetCards(req, res, next){
        await mainDAO.log(3, "apiGetCards", "Called API", "")
        let constr = {
            filters: {
                expansion: req.query?.expansion,
                types: req.query?.types,
            },
            page: (!isNaN(req.query?.page) && req.query.page.length > 0) ? JSON.parse(req.query.page) : 0,
            itemsPerPage: (!isNaN(req.query?.itemsPerPage) && req.query.itemsPerPage.length > 0) ? JSON.parse(req.query.itemsPerPage) : 20,
        }
        const {cardsList, totalNumCards} = await mainDAO.getCards(constr)
        let response = {
            cards: cardsList,
            page: constr.page,
            filters: constr.filters,
            itemsPerPage: constr.itemsPerPage,
            total_results: totalNumCards
        }
        res.json(response)
    }
    static async apiGetDeck(req, res, next){
        await mainDAO.log(3, "apiGetDeck", "Called API", "")
        const body = req.body
        if (!body?.id){
            return res.json({
                success: false, message: "Missing info...!",
                req: req.body
            })
        }
        const {deck, isOwner, error, success, message} = await mainDAO.getDeck(req.cookies[process.env.COOKIE_NAME], body.id, body?.password)
        let response = {
            deck,
            error, success,
            message,
            isOwner
        }
        res.json(response)

    }
    static async apiGetUserDecks(req, res, next){
        try {
            await mainDAO.log(3, "apiGetUserDecks", "Called API", "")
            if (!req.cookies[process.env.COOKIE_NAME]){
                return res.json({success: false, error: true, message: "Must be signed in!"})
            }
            const {decks, error: deckError, message: deckMessage} = await mainDAO.getUserDecks(req.cookies[process.env.COOKIE_NAME])
            if (deckError){
                return res.json({success: false, error: true, message: deckMessage})
            }
            let response = {
                res: "getUserDecks",
                decks: decks,
                success: true, error: false,
                message: "Decks found!"
            }
            return res.json(response)
        } catch (e){
            await mainDAO.log(1, "apiGetUserDecks", "Catch Error", e.message)
            console.log(e)
            return res.json({success: false, error: true, message: e.message, decks: []})
        }
    }


    static async apiGetUserAuth(req, res, next){
        try {
            await mainDAO.log(3, "apiGetUserAuth", "Called API", "")
            const verify = jwt.verify(req.cookies[process.env.COOKIE_NAME], process.env.JWT_SECRET)
            if (!verify){
                return res.json({success: false, error: true, message: "User not authenticated!"})
            }
            const {user, error, message} = await mainDAO.getUser(verify)
            if (error){
                return res.json({success: false, error: true, message})
            }
            let response = {
                res: "getUserAuth",
                userInfo: user,
                success: true, error: false,
                message: "User Authenticated!"
            }
            res.json(response)
        } catch (e){
            res.json({success: false, error: true, message: e})
            await mainDAO.log(1, "apiGetUserAuth", "Catch Error", e.message)
        }
    }

    static async apiCreateDeck(req, res, next){
        try {
            await mainDAO.log(3, "apiCreateDeck", "Called API", "")
            const verify = jwt.verify(req.cookies[process.env.COOKIE_NAME], process.env.JWT_SECRET)
            if (!verify){
                return res.json({success: false, error: true, message: "User not authenticated!"})
            }
            const {user} = await mainDAO.getUser(verify)
            const {deckId, error, message} = await mainDAO.createDeck(user._id, req.body)
            if (error){
                await mainDAO.log(2, "apiCreateDeck", "Error in Creating Deck", `${user._id} encountered error (${message}) when creating a deck.`)
                return res.json({success: false, error: true, message})
            }
            await mainDAO.log(3, "apiCreateDeck", "Successfully created deck", `${user._id} created new deck (${deckId}).`)
            let response = {
                res: "createDeck",
                deckId: deckId,
                success: true, error: false,
                message: "Deck created!"
            }
            res.json(response)
        } catch (e){
            console.log(e)
            await mainDAO.log(1, "apiCreateDeck", "Catch Error", e.message)
            res.json({success: false, error: true, message: e.message})
        }
    }

    static async apiUpdateDeck(req, res, next){
        try {
            await mainDAO.log(3, "apiUpdateDeck", "Called API", "")
            const cookie = req.cookies[process.env.COOKIE_NAME]
            if (!req?.body?.deck || !req?.body?.method){
                return res.json({success: false, error: true, message: "Missing deck in payload!"})
            }
            const {error, success, message, deckId} = await mainDAO.updateDeck(req.body.deck?._id, cookie, req.body.method, req.body.deck)
            if (error){
                await mainDAO.log(2, "apiUpdateDeck", "Error Updating Deck", `${cookie.id} encountered error (${message}) when creating a deck.`)
            }
            return res.json({success, error, message, deckId})

        } catch (e){
            console.log(e)
            await mainDAO.log(1, "apiUpdateDeck", "Catch Error", e.message)
            res.json({success: false, error: true, message: e.message})
        }
    }

    static async apiExportDeck(req, res, next){
        try {
            await mainDAO.log(3, "apiExportDeck", "Called API", "")
            const cookie = req.cookies[process.env.COOKIE_NAME]
            if (!req?.body?.deckID){
                return res.json({success: false, error: true, message: "Missing deckID in payload!"})
            }
            const {error, message, deck} = await mainDAO.exportDeck(cookie, req?.body?.deckID, req?.body?.password)
            if (error){
                return res.json({success: false, error: true, message})
            }

            const date = new Date().toISOString().split("T")[0]
            const name = `[DeckExport] - ${deck.name} - ${date}.js`

            const myBlob = new Blob([JSON.stringify(deck, null, 2)], { type: 'application/javascript' });
            const buffer = Buffer.from(await myBlob.arrayBuffer());

            await mainDAO.log(1, "apiAdminUpdateUser", "Exporting Deck", `${req?.body?.deckID} was exported to JSON`)
            // Set headers to trigger a browser download
            res.setHeader('Content-Disposition',`attachment; filename="${name}"`);
            res.setHeader('Content-Type', 'text/plain');
            res.send(buffer);

        } catch (e){
            console.log(e)
            await mainDAO.log(1, "apiExportDeck", "Catch Error", e.message)
            res.json({success: false, error: true, message: e.message})
        }
    }


    static async apiImportDeck(req, res, next){
        try {
            await mainDAO.log(3, "apiImportDeck", "Called API", "")
            const cookie = req.cookies[process.env.COOKIE_NAME]
            if (!req?.body?.deck){
                return res.json({success: false, error: true, message: "Missing deck in payload!"})
            }
            const {error, message, deck} = await mainDAO.importDeck(cookie, req.body.deck)
            if (error){
                return res.json({success: false, error: true, message})
            }

            res.json({success: true, error: false, message: "Imported Deck!", deck})

        } catch (e){
            console.log(e)
            await mainDAO.log(1, "apiImportDeck", "Catch Error", e.message)
            res.json({success: false, error: true, message: e.message})
        }
    }

    static async apiCopyDeck(req, res, next){
        try {
            await mainDAO.log(3, "apiCopyDeck", "Called API", "")
            const cookie = req.cookies[process.env.COOKIE_NAME]
            if (!req?.body?.deckID){
                return res.json({success: false, error: true, message: "Missing deckID in payload!"})
            }
            const {error, message, deckId, deck} = await mainDAO.copyDeck(cookie, req.body.deckID, req?.body?.password)
            if (error){
                return res.json({success: false, error: true, message})
            }

            res.json({success: true, error: false, message: "Copied Deck!", deckId, deck})

        } catch (e){
            console.log(e)
            await mainDAO.log(1, "apiCopyDeck", "Catch Error", e.message)
            res.json({success: false, error: true, message: e.message})
        }
    }

    static async apiFetchAdminData(req, res, next){
        try {
            await mainDAO.log(3, "apiFetchAdminData", "Called API", "")
            const cookie = req.cookies[process.env.COOKIE_NAME]
            const {user, error, message} = await mainDAO.getUserAuth(cookie)
            if (error){
                return res.json({success: false, error: true, message})
            }
            if (user?.role !== "A"){
                await mainDAO.log(2, "apiFetchAdminData", "Unauthorized Access Error", `${user ? user._id : "Guest Account"} attempted to fetch admin data.`)
                return res.json({success: false, error: true, message: "Unauthorized!"})
            }

            /*
                [FETCH DATA]
                - Users
                - Logs
             */

             const {users, error: aguError, message: aguMessage} = await mainDAO.adminGetUsers(user)
                 if (aguError){return res.json({success: false, error: true, message: aguMessage})}
             const {logs, error: aglError, message: aglMessage} = await mainDAO.adminGetLogs(user)
                if (aglError){return res.json({success: false, error: true, message: aglMessage})}

            await mainDAO.log(3, "apiAdminUpdateUser", "Successful get of admin data", `${user._id} fetched admin data.`)
             res.json({
                success: true, error: false, message: "Successfully fetched admin data!",
                users: users || [],
                logs: logs || []
             })

        } catch (e){
            console.log(e)
            await mainDAO.log(1, "apiFetchAdminData", "Catch Error", e.message)
            res.json({success: false, error: true, message: e.message})
        }
    }

    static async apiAdminUpdateUser(req, res, next){
        try {
            await mainDAO.log(3, "apiAdminUpdateUser", "Called API", "")
            const cookie = req.cookies[process.env.COOKIE_NAME]
            const {user, error, message} = await mainDAO.getUserAuth(cookie)
            if (error){
                await mainDAO.log(2, "apiAdminUpdateUser", "Error Retrieving User", message)
                return res.json({success: false, error: true, message})
            }
            if (user?.role !== "A"){
                await mainDAO.log(2, "apiAdminUpdateUser", "Unauthorized to User", `${user._id} attempted to update user.`)
                return res.json({success: false, error: true, message: "Unauthorized!"})
            }

            /*
                Update User
                - check values + validation
                - check user exists
             */
             const userId = req?.body?.id;
             const updateKey = req?.body?.key;
             const updateValue = req?.body?.value;
             const {user: updateUser, error: guError, message: guMessage} = await mainDAO.getUser(cookie, userId)
             if (guError){
                 await mainDAO.log(2, "apiAdminUpdateUser", "Error Retrieving User", `${user._id} attempted to retrieve user ${userId}.`)
                 return res.json({error: guError, message: guMessage})
             }
             // VALIDATE //
             if (!["username","password","email"].includes(updateKey)){
                 throw Error("Invalid update key.")
             }
             const {error: vuuError, message: vuuMessage} = await mainDAO.validateUpdateUser(userId, updateKey, updateValue)
             if (vuuError){
                 return res.json({
                     success: false, error: true, message: vuuMessage
                 })
             }

             // NOW... update value
             let finalValue = updateValue;
             if (updateKey === "password"){
                // HASH
                finalValue = bcrypt.hashSync(updateValue, 10)
             }

             const {error: uuError, message: uuMessage} = await mainDAO.updateUser(updateKey, finalValue, cookie, userId)
             if (uuError){
                 return res.json({
                     success: false, error: true, message: uuMessage
                 })
             }

            await mainDAO.log(3, "apiAdminUpdateUser", "Successful update of user", `${userId} updated [${updateKey}]`)
             res.json({
                success: true, error: false, message: "Successfully updated user!"
             })

        } catch (e){
            console.log(e)
            await mainDAO.log(1, "apiAdminUpdateUser", "Catch Error", e.message)
            res.json({success: false, error: true, message: e.message})
        }
    }

    static async apiUpdateUser(req, res, next){
        try {
            await mainDAO.log(3, "apiUpdateUser", "Called API", "")
            const cookie = req.cookies[process.env.COOKIE_NAME]
            const {user, error, message} = await mainDAO.getUserAuth(cookie, req?.body?.id)
            if (error){
                await mainDAO.log(2, "apiUpdateUser", "Error Retrieving User", message)
                return res.json({success: false, error: true, message})
            }
            /*
                Update User
                - check values + validation
                - check user exists
             */
             const userId = req?.body?.id;
             const updateKey = req?.body?.key;
             const updateValue = req?.body?.value;
             const {user: updateUser, error: guError, message: guMessage} = await mainDAO.getUser(cookie, userId)
             if (guError){
                 await mainDAO.log(2, "apiAdminUpdateUser", "Error Retrieving User", `${user._id} attempted to retrieve user ${userId}.`)
                 return res.json({error: guError, message: guMessage})
             }
             // VALIDATE //
             if (!["username","password","email"].includes(updateKey)){
                 throw Error("Invalid update key.")
             }
             const {error: vuuError, message: vuuMessage} = await mainDAO.validateUpdateUser(userId, updateKey, updateValue)
             if (vuuError){
                 return res.json({
                     success: false, error: true, message: vuuMessage
                 })
             }

             // NOW... update value
             let finalValue = updateValue;
             if (updateKey === "password"){
                // HASH
                finalValue = bcrypt.hashSync(updateValue, 10)
             }

             const {error: uuError, message: uuMessage} = await mainDAO.updateUser(updateKey, finalValue, cookie, userId)
             if (uuError){
                 return res.json({
                     success: false, error: true, message: uuMessage
                 })
             }

            await mainDAO.log(3, "apiUpdateUser", "Successful update of user", `${userId} updated [${updateKey}]`)
             res.json({
                success: true, error: false, message: "Successfully updated user!"
             })

        } catch (e){
            console.log(e)
            await mainDAO.log(1, "apiUpdateUser", "Catch Error", e.message)
            res.json({success: false, error: true, message: e.message})
        }
    }

    static async apiSuggestDeck(req, res, next){
        try {
            await mainDAO.log(3, "apiSuggestDeck", "Called API", "")
            const cookie = req.cookies[process.env.COOKIE_NAME]
            if (!cookie || typeof req?.body?.message !== "string"){
                return res.json({success: false, error: true, message: `Invalid payload. ${req?.body?.message}`})
            }
            const {success, error, message} = await mainDAO.suggestDeck(cookie, req?.body?.message)
            await mainDAO.log(3, "apiSuggestDeck", "Returned result", "")
            return res.json({success, error, message})

        } catch (e){
            console.log(e)
            await mainDAO.log(1, "apiSuggestDeck", "Catch Error", e.message)
            return res.json({success: false, error: true, message: e.message})
        }
    }

}
import mainDAO from '../dao/mainDAO.js'
import jwt from 'jsonwebtoken'

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
    static async apiLogin(req,res,next) {
        try {
            await mainDAO.log(3, "apiLogin", "Called API", "")
            // CHECK FOR INFO
            const {error, message, user} = await mainDAO.getUserByPassword(req?.body?.email, req?.body?.password)
            if (error){
                return res.json({success: false, error: true, message})
            }
            // CREATE COOKIE
            const jwtToken = jwt.sign(
                {
                    id: user._id,
                    username: user.username,
                    role: user.role,
                },
                process.env.JWT_SECRET,
                {
                    algorithm: "HS256",
                    expiresIn: '1h'
                })
            // set cookie
            res.cookie(process.env.COOKIE_NAME, jwtToken, {
                httpOnly: true,
                secure: process.env.NODE_ENV === "production",
                sameSite: "strict",
                maxAge: 3600000
            })
            // return response
            await mainDAO.log(3, "apiLogin", "Successful log in", `Called by user ${user._id}`)
            res.json({
                success: true, error: false,
                message: "Login successful!",
                token: jwtToken,
                user
            })
        } catch(e) {
            await mainDAO.log(1, "apiLogin", "Catch Error", e.message)
            res.json({success: false, error: true, message: e})
        }
    }
    static async apiCheckLogin(req,res,next) {
        //
        try {
            const verify = jwt.verify(req.cookies[process.env.COOKIE_NAME], process.env.JWT_SECRET)
            await mainDAO.log(3, "apiCheckLogin", "Successful Get of Login", `Called by user ${verify._id}`)
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
        const {deck, error, success, message} = await mainDAO.getDeck(req.cookies[process.env.COOKIE_NAME], body.id, body?.password)
        let response = {
            deck: deck,
            error, success,
            message
        }
        res.json(response)

    }
    static async apiGetUserDecks(req, res, next){
        try {
            await mainDAO.log(3, "apiGetUserDecks", "Called API", "")
            const verify = jwt.verify(req.cookies[process.env.COOKIE_NAME], process.env.JWT_SECRET)
            if (!verify) {
                return res.json({success: false, error: true, message: "User not authenticated!"})
            }
            const {decks, error: deckError, message: deckMessage} = await mainDAO.getUserDecks(verify)
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
            return res.json({success: false, error: true, message: e.message})
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

    static async apiExportDeck(req, res, next){
        try {
            await mainDAO.log(3, "apiExportDeck", "Called API", "")
            const cookie = req.cookies[process.env.COOKIE_NAME]
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
            res.setHeader('Content-Disposition',`'attachment; filename="${name}"`);
            res.setHeader('Content-Type', 'text/plain');

            res.send(buffer);

        } catch (e){
            console.log(e)
            await mainDAO.log(1, "apiExportDeck", "Catch Error", e.message)
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
                users,
                logs
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
                return res.json({success: false, error: true, message})
            }
            if (user?.role !== "A"){
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
                 return res.json({error: guError, message: guMessage})
             }
             // VALIDATE //
             if (!["username","password"].includes(updateKey)){
                 throw Error("Invalid update key.")
             }
             if (updateKey === "username"){
                if (typeof updateValue !== "string" || updateKey.replaceAll(" ","").length > 3){
                    throw Error("Invalid update value.")
                }
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

}
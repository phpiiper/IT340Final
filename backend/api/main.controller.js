import mainDAO from '../dao/mainDAO.js'
import jwt from 'jsonwebtoken'

export default class MainController {
    // USER TOOLS
    static async apiRegister(req, res, next){
        const body = req.body
        if (!body?.username || !body?.email || !body?.password) {
            return res.json({
                success: false, error: true,
                 message: "Missing info...!",
                req: req.body
            })
        }
        const {error, message} = await mainDAO.createUser(body)
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
            res.json({
                success: true, error: false,
                message: "Login successful!",
                token: jwtToken,
                user
            })
        } catch(e) {
            res.json({success: false, error: true, message: e})
        }
    }
    static async apiCheckLogin(req,res,next) {
        //
        try {
            const verify = jwt.verify(req.cookies[process.env.COOKIE_NAME], process.env.JWT_SECRET)
            let response = {
                res: "logIn",
                verify: verify,
                success: true, error: false
            }
            res.json(response)
        } catch(e){
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
            res.clearCookie(process.env.COOKIE_NAME)
            let response = {
                res: "signOut",
                success: true, error: false,
            }
            res.json(response)
        } catch(e){
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
        const body = req.body
        if (!body?.id){
            return res.json({
                success: false, message: "Missing info...!",
                req: req.body
            })
        }
        const {deck, error, success, message} = await mainDAO.getDeck(body.id, body?.password)
        let response = {
            deck: deck,
            error, success,
            message
        }
        res.json(response)

    }
    static async apiGetUserDecks(req, res, next){
        try {
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
            console.log(e)
            return res.json({success: false, error: true, message: e.message})
        }
    }


    static async apiGetUserAuth(req, res, next){
        try {
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
        }
    }

    static async apiCreateDeck(req, res, next){
        try {
            const verify = jwt.verify(req.cookies[process.env.COOKIE_NAME], process.env.JWT_SECRET)
            if (!verify){
                return res.json({success: false, error: true, message: "User not authenticated!"})
            }
            const {user} = await mainDAO.getUser(verify)
            const {deckId, error, message} = await mainDAO.createDeck(user._id, req.body)
            if (error){
                return res.json({success: false, error: true, message})
            }
            let response = {
                res: "createDeck",
                deckId: deckId,
                success: true, error: false,
                message: "Deck created!"
            }
            res.json(response)
        } catch (e){
            console.log(e)
            res.json({success: false, error: true, message: e.message})
        }
    }

}
// import PokemonDAO from '../dao/pokemonDAO.js'
import jwt from 'jsonwebtoken'
import cookieParser from 'cookie-parser'


export default class MainController {
    static async apiRegister(req,res,next) {
        //
        const jwtToken = jwt.sign(
            {
                username: "piper"
            },
            process.env.JWT_SECRET,
             {
                algorithm: "HS256",
                expiresIn: '1h'
            })
        let response = {
            "token": jwtToken,
            "res": "login"
        }
        res.cookie(process.env.COOKIE_NAME, jwtToken, {
            httpOnly: true,
            secure: process.env.NODE_ENV === "production",
            sameSite: "strict",
            maxAge: 3600000
        })
        res.json(response)
    }
    static async apiCheckLogin(req,res,next) {
        console.log(req)
        //
        try {
            const verify = jwt.verify(req.cookies[process.env.COOKIE_NAME], process.env.JWT_SECRET)
            let response = {
                res: "logIn",
                verify: verify
            }
            res.json(response)
        } catch(e){
            let response = {
                res: "logIn",
                verify: null,
                error: e
            }
            res.json(response)
        }
    }
    static async apiSignOut(req,res,next) {
        //
        try {
            const verify = jwt.verify(req.cookies[process.env.COOKIE_NAME], process.env.JWT_SECRET)
            res.clearCookie(process.env.COOKIE_NAME)
            let response = {
                res: "signOut",
                verify: verify
            }
            res.json(response)
        } catch(e){
            let response = {
                res: "signUp",
                verify: null,
                error: e
            }
            res.json(response)
        }
    }

}
import bcrypt from "bcrypt";
import fs from "fs/promises";
import path from "path";
let cards;
let users;
let decks;
let mfa;
import mongodb from "mongodb"
import jwt from "jsonwebtoken";
const ObjectId = mongodb.ObjectId
// import { GoogleGenAI } from "@google/genai";
import { AIProjectClient } from "@azure/ai-projects";
import { DefaultAzureCredential } from "@azure/identity";

const levels = ["Severe", "Warning", "Info"]

export default class MainDAO {
    static async injectDB(conn) {
        // CARDS
        if (cards) {
            return
        }
        try {
            cards = await conn.db(process.env.ATLAS_NAME).collection(process.env.CARDS)
        } catch (e) {
            console.error(`unable to connect in MainDAO: ${e}`)
        }
        // USERS
        if (users) {
            return
        }
        try {
            users = await conn.db(process.env.ATLAS_NAME).collection(process.env.USERS)
        } catch (e) {
            console.error(`unable to connect in MainDAO: ${e}`)
        }
        // DECKS
        if (decks) {
            return
        }
        try {
            decks = await conn.db(process.env.ATLAS_NAME).collection(process.env.DECKS)
        } catch (e) {
            console.error(`unable to connect in MainDAO: ${e}`)
        }
        // MFAS
        if (mfa) {
            return
        }
        try {
            mfa = await conn.db(process.env.ATLAS_NAME).collection(process.env.MFA)
        } catch (e) {
            console.error(`unable to connect in MainDAO: ${e}`)
        }
    }

    static async doesUserExist(username, email) {
        if (!username || !email) {
            return false
        }
        return await users.findOne({username}) || await users.findOne({email})
    }

    static async getUserByPassword(email, password) {
        if (!email || !password) {
            return {error: true, message: `Missing info! ${email} | ${password}`}
        }
        const user = await users.findOne({email})
        if (!user) {
            return {error: true, message: "User doesn't exist!"}
        }
        // check for password
        let match = bcrypt.compareSync(password, user.password)
        if (!match) {
            return {error: true, message: "Password doesn't match!"}
        }
        return {user}
    }

    static async getUserAuth(cookie) {
        if (!cookie){
            return {success: false, error: true, message: "Cookie not found!"}
        }
        const verify = jwt.verify(cookie, process.env.JWT_SECRET)
        if (!verify){
            return {success: false, error: true, message: "User not authenticated!"}
        }
        const {user, error, message} = await this.getUser(verify)
        if (error){
            return {success: false, error: true, message}
        }
        return {message, success: true, error: false, user}
    }

    static async createUser(user) {
        try {
            const {username, email, password} = user
            // Check if info is fine
            if (!username || !email || !password) {
                return {error: true, message: "Missing info!"}
            }
            // Check if user exists (email or username)
            const userExists = await this.doesUserExist(username, email)
            if (userExists) {
                return {error: true, message: "User already exists!"}
            }
            if (username.length < 3) {
                return {error: true, message: "Username must be at least 3 characters long!"}
            }
            if (password.length < 8) {
                return {error: true, message: "Password must be at least 8 characters long!"}
            }
            const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
            if (!emailRegex.test(email)) {
                return {error: true, message: "Invalid email address!"}
            }
            // Hash password
            let hashedPassword = bcrypt.hashSync(password, 10)
            // Save user to db
            await users.insertOne({
                username,
                email,
                password: hashedPassword,
                role: "U"
            })
            return {error: false, message: "User created!"}

        } catch (e) {
            return {error: true, message: e.message}
        }
    }


    static async getCards({filters = {}, page = 0, itemsPerPage = 20,} = {}) {
        if (!cards) {
            return {error: true, message: "Cannot connect to DB!", cardsList: [], totalNumCards: 0}
        }
        let query = {}
        if (filters && Object.keys(filters).filter(x => typeof filters[x] === "string").length > 0) {
            if ("expansion" in filters && filters["expansion"]?.length > 0) {
                query.expansion = filters["expansion"]
            }
            if ("name" in filters && filters["name"]?.length > 0) {
                query.name = {"$regex": filters["name"], "$options": "i"}
            }
            if ("types" in filters && filters["types"]?.length > 0) {
                query.types = {"$regex": filters["types"], "$options": "i"}
            }
        }
        let cursor
        try {
            cursor = await cards
                .find(query)
                .limit(itemsPerPage)
                .skip(itemsPerPage * page)
                .sort({name: 1})
            const cardsList = await cursor.toArray()
            const totalNumCards = await cards.countDocuments(query)
            return {cardsList, totalNumCards}
        } catch (e) {
            console.error(`Unable to issue find command, ${e}`)
            console.error(e)
            return {cardsList: [], totalNumCards: 0}
        }
    }

    static async getUser(userCookie, findUserId) {
        // assume cookie is decoded as object
        let cookie = userCookie;
        try {
            cookie = jwt.verify(userCookie, process.env.JWT_SECRET)
        } catch (e){}

        try {
            if (typeof cookie !== "object" && !cookie?.id) {
                return {error: true, message: "User not authenticated!"}
            }
            let user = await users.findOne({_id: new ObjectId(cookie.id)})
            if (user?.role === "A" && findUserId){
                user = await users.findOne({_id: new ObjectId(findUserId)})
            }
            if (!user) {
                return {error: true, message: "User doesn't exist!"}
            }
            return {user, success: true, error: false, message: "User Authenticated!"}
        } catch (e) {
            return {error: true, message: e.message}
        }
    }

    static async getDeck(cookies, deckId, password) {
        const {user, error, message} = await this.getUserAuth(cookies);
        if (!decks) {
            return {error: true, message: "Cannot connect to DB!", deck: null}
        }
        let deck = await decks.findOne({_id: new ObjectId(deckId)})
        if (!deck) {
            return {error: true, message: "Deck doesn't exist!"}
        }
        if (!user && ["Private","Password"].includes(deck.type)){
            return {error: true, message: "Deck doesn't exist!"}
        }
        else if (user?.role === "U" && deck.password && deck.type === "Private") {
            if (!password){ return {error: true, message: "Password required!"}  }
            const pwdMatch = bcrypt.compareSync(password, deck.password)
            if (!pwdMatch) {
                return {error: true, message: "Password doesn't match!"}
            }
        }
        else if (user?.role === "U" && deck.type === "Private" && deck.author.toString() !== user._id.toString()) {
             return {error: true, message: "Deck cannot be accessed!"}
         }
        const finCards = await cards.find({_id: {$in: deck.cards.map(x => new ObjectId(x))}}).toArray()
        const finDeck = {...deck, cards: finCards}
        return {user, deck: finDeck, success: true, error: false, message: "Deck found!"}
    }

    static async getUserDecks(userCookies) {
        try {
            if (!decks) {
                return {error: true, message: "Cannot connect to DB!", deck: null}
            }
            const {user, error, message} = await this.getUserAuth(userCookies);

            if (error){
                return {error, message, decks: []}
            }

            const userId = user?._id?.toString();
            let allDecks = await decks.find({author: new ObjectId(userId) }).toArray()

            if (!allDecks) {
                return {error: true, message: "Decks don't exist!", decks: []}
            }

            return {
                decks: allDecks,
                success: true, error: false,
                message: "Decks found!"
            }
        } catch (e) {
            return {error: true, message: e.message, decks: []}
        }
    }

    static async verifyDeck(deck){
        if (!decks){ return {error: true, message: "Cannot connect to DB!"}}
        const {cards, maxCards, tags, name, type, password} = deck
        if (cards?.length > maxCards){ return {error: true, message: "Deck is too big!"}}
        if (name?.length > 30){ return {error: true, message: "Deck name is too long!"}}
        if (name?.length < 3){ return {error: true, message: "Deck name is too short!"}}
        if (!Array.isArray(tags) || tags.find(x => typeof x !== "string")){ return {error: true, message: "Incorrect tag format! Must be an array of strings."}}
        if (!["Public","Private","Password"].includes(type)){
            return {error: true, message: "Incorrect tag type!"}
        }
        if (type === "Password" && (!password || password?.length > 3)){
            return {error: true, message: "Invalid deck password! Must be at least 3 characters long!"}
        }
        // CHECK CARDS
        // ???

        return {success: true, error: false, message: "Deck is valid!"}
    }
    static async updateDeck(deckId, cookies, mode, newDeck){
        if (!decks){ return {error: true, message: "Cannot connect to DB!"}}
        const {deck, user, error, message} = await this.getDeck(cookies, deckId);
        if (error){ return {error, message, deck: null} }
        if (user._id.toString() !== deck._id.toString() && user.role !== "A") {
            return {error, message: "Cannot access deck!"}
        }
        // assume user is OWNER of deck OR user is ADMIN
        if (mode === "delete"){
            // assume deletion of deck
            await decks.deleteOne({_id: new ObjectId(deck._id)})
            return {error: false, success: true, message: "Deck successfully deleted!"}
        } else if (mode === "update"){
            // update deck to all values
            // CHECK validity
            const {success, message} = await this.verifyDeck(newDeck);
            if (!success) { return {error: true, message} }
            let finDeck = {...newDeck}
            // if password exists... hash + update password!
            if (finDeck.password){
                if (finDeck.type !== "Password"){ delete finDeck.password; }
                else {
                    finDeck.password = bcrypt.hashSync(finDeck.password, 10)
                }
            }
            decks.updateOne({_id: new ObjectId(deck._id)}, finDeck)

            return {error: false, success: true, message: "Deck successfully updated!"}
        } else {
            return {error: true, message: "Invalid mode given!"}
        }
    }


    static async createDeck(userId, deck){
        if (!userId){return {error: true, message: "User not authenticated!"}}
        if (!deck){ return {error: true, message: "Deck not provided!"}}
        if (!decks){ return {error: true, message: "Cannot connect to DB!"}}
        try {
            /*
                REQ
                - cards[] -- IDs of cards
                - maxCards -- int max of cards
                - tags[] -- string of user-defined tags
                - name -- string name

                - description
                - mode
             */
            const {cards, maxCards, tags, name, password, type} = deck
            const {error, message} = await this.verifyDeck(deck)
            if (error){return {error: true, message}}
            let hashedPassword = null
            if (type === "Private" && password){
                hashedPassword = bcrypt.hashSync(password, 10)
            }
            const deckId = new ObjectId()
            await decks.insertOne({
                _id: deckId,
                author: userId,
                cards: cards.map(x => x?._id?.toString() || x),
                maxCards,
                tags,
                name,
                password: hashedPassword,
                type: type
            })
            return {success: true, error: false, message: "Deck created!", deckId}
        } catch (e) {
            return {error: true, message: e.message}
        }
    }

    static async copyDeck(cookie, deckID,password){
        // CHECK FOR PERMS
        const {deck, user, error, message} = await this.getDeck(cookie,deckID,password)
        if (error){return {error: true, message}}
        // COPY VARIABLES
        // name (Copy Of), cards, maxCards, tags, type=Private
        const newDeck = {...deck,
            name: "Copy of " + deck.name,
            type: "Private",
            author: user.id,
            password: null, _id: null
        }
        const {error: cdError, message: cdMessage} = await this.createDeck(user._id, newDeck)
        if (cdError){ return {error: cdError, success: false, message: cdMessage} }

        return {success: true, error: false, message: "Copied deck!", deck}
    }

    static async exportDeck(cookie, deckID, password){
        // CHECK FOR PERMS
        const {deck, user, error, message} = await this.getDeck(cookie,deckID,password)
        if (error){return {error: true, message}}
        // remove unncessary keys
        if (deck?.password) {delete deck.password}
        if (deck?.author) {delete deck.author}
        if (deck?._id) {delete deck._id}
        if (deck?.type) {delete deck.type}
        return {success: true, error: false, message: "Deck exported!", deck: {...deck, cards: deck.cards.map(x => x._id)}}
    }

    static async importCards(cardList){
        if (Array.isArray(cardList) && cardList.length > 0){
            const finCards = await cards.find({
                _id: {$in: cardList.map(x => new ObjectId(x))}
            }).toArray()
            return finCards
        } else {
            return []
        }
    }

    static async importDeck(cookie, importJSON){
        // CHECK COOKIE (get user)
        const {error, message, user} = await this.getUserAuth(cookie);
        if (error){
            return {error, message}
        }
        // CHECK IMPORT FILE STRUCT
        const jsonKeys = Object.keys(importJSON)
        const reqKeys = ["cards","maxCards","name", "tags"]
        const allIncluded = jsonKeys.every(item => reqKeys.includes(item));
        if (!allIncluded) {return {success: false, error: true, message: "Missing keys from deck!"}}
            // Check for valid MAXCARDS
            if (typeof importJSON.maxCards !== "number"){
                return {success: false, error: true, message: "maxCards must be a number!"}
            }
            // Check for valid CARDS format
            if (!Array.isArray(importJSON.cards) || importJSON.cards.length > importJSON.maxCards || importJSON.cards.find(x => typeof x !== "string")){
                return {success: false, error: true, message: "Cards do not follow correct deck formatting!"}
            }
            // Check for valid TAGS format
            if (!Array.isArray(importJSON.tags) || importJSON.tags.find(x => typeof x !== "string")){
                return {success: false, error: true, message: "Tags in deck do not follow correct deck formatting!"}
            }
            // Check for valid NAME format (is string)
            if (typeof importJSON.name !== "string" && importJSON.name.length < 3){
                return {success: false, error: true, message: "Name in deck does not follow correct deck formatting!"}
            }
            // THEN createDeck() -- default to private deck
            const newCards = await this.importCards(importJSON.cards)
            const newDeck = {...importJSON,
                type: "Private",
                cards: newCards
            }
            const {error: cdError, message: cdMessage, deckId} = await this.createDeck(user._id, newDeck)
            if (cdError){
                return {success: false, error: true, message: cdMessage}
            }
            // else, deck should be fine!
        const deck = {...newDeck, _id: deckId, author: user._id}
        return {success: true, error: false, message: "Deck imported!", deck}

    }

    /*
        2FA --- email
        sendCode
        verifyCode
     */
    static async sendCode(cookie) {
        // CHECK COOKIE
        const {error, message, user} = await this.getUserAuth(cookie);
        if (error){
            return {error, message}
        }
        // GENERATE CODE
        const code = Math.random().toString(16).substring(6,12).toUpperCase()
        const hashedCode = bcrypt.hashSync(code, 10)
        // EXPIRE ALL OTHER CODES BY USER
        mfa.updateMany({
            user: user.id
        },
        {
            $set: { expires_at: Date.now() }
        })
        // INSERT INTO MONGO DB
        const codeInsert = mfa.insertOne({
            created_at: new Date().toISOString(),
            expires_at: new Date().toISOString(),
            user: user.id,
            code: hashedCode
        })

        try {
            // <SEND CODE> | reuse whatever in coldfusion
            const req = await fetch("https://api.brevo.com/v3/smtp/email", {
                method: "POST",
                headers: {
                    accept: "application/json",
                    "api-key": process.env.BREVO_API_KEY,
                },
                body: JSON.stringify({
                    sender: {
                        name: "DOM Picker",
                        email: process.env.BREVO_EMAIL
                    },
                    to: [{
                        email: user.email
                    }],
                    subject: "2FA Request",
                    htmlContent: `<html><head></head><body>
<p>Hello, ${user.name}</p><p>This is a 2FA request for Dominion Picker. To sign in, use the code [ <strong> ${code} </strong> ] to sign in.</p></body></html>`
                })
            })
            if (!req.ok) {
                console.error(req)
                return {error: true, message: "Error in sending message", req}
            }
        } catch (e) {
            mfa.updateOne({
                _id: codeInsert.id
            }, {
               $set: { expires_at: Date.now() }
            })
            return {error: true, message: e.message}
        }

        return {success: true, error: false, message: `Email sent to ${user.id}!`}
    }
    static async verifyCode(cookie,code){
        // CHECK USER
        // GET USER CODE
        // COMPARE 'code' to userCode --- like password
        // IF CORRECT, expire code AND return true
    }


    /*
            ADMIN APIs
     */

     static async adminGetUsers(user){
        if (!user || user?.role !== "A") {return {error: true, message: "Unauthorized..!"}}
        const agu = await users.find({role: "U"}, {
            projection: {_id: 1, email: 1, role: 1, username: 1}
        }).toArray()
        //await decks.find({author: new ObjectId(userId) }).toArray()
        return {success: true, error: false, message: "Fetched users!", users: agu};
     }
     // admin/fetchLog
     static async adminGetLogs(user){
         if (!user || user?.role !== "A") {return {error: true, message: "Unauthorized...!"}}
        try {
            const logFile = path.join(process.cwd(), "logs", "log.jsonl")
            const data = await fs.readFile(logFile, "utf8")
            const logs = data.split("\n").filter((line) => line.trim() !== "").map((line, index) => {
                const l = JSON.parse(line)
                return {...l,
                    id: index,
                    date: new Date(l.date).toLocaleString(),
                    level: levels[l.level]
                }
            }).reverse()
            return {success: true, message: "Fetched logs successfully!", logs}
        } catch (e){
            console.error("Cannot fetch logs!",e)
            return {error: true, message: e.message || "Unknown error..."}
        }
     }

    static async validateUpdateUser(id, key, value){
        try {
            if (["username","email"].includes(key)){
                // Check length of value
                if (typeof value !== "string" || value.length < 3){
                    return {error: true, message: "Invalid input (must be at least 3 characters long)!"}
                }
                // check if in use
                const user = await users.findOne({[key]: value})
                if (user && user._id.toString() !== id) {
                    return {error: true, message: `[${key}] is already in use.`};
                }
                if (key === "email"){
                    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
                    if (!emailRegex.test(value)) {
                        return {error: true, message: "Invalid email address!"}
                    }
                }
                return {success: true, message: `[${key}] passes test.`}
            } else if (key === "password"){
                if (value.length < 8) {
                    return {error: true, message: "Password must be at least 8 characters long!"}
                }
            } else {
                return {error: true, message: "No valid key supplied to validate."}
            }
            return {success: true, message: `[${key}] passes test.`}
        } catch (e){
            console.error("validate update user: ", e)
            return {error: true, message: e.message || "Unknown error..."}
        }
    }

    static async updateUser(key, value, userCookie, findUserId){
        // dont cookie is decoded as object
        let cookie = userCookie;
        try {cookie = jwt.verify(userCookie, process.env.JWT_SECRET)
        } catch (e){}
        try {
            if (!key || !value || !cookie) {
                return {error: true, message: "Missing keys!"}
            }

            if (typeof cookie !== "object" && !cookie?.id) {
                return {error: true, message: "User not authenticated!"}
            }
            let user = await users.findOne({_id: new ObjectId(cookie.id)})
            if (user?.role === "A" && findUserId){
                user = await users.findOne({_id: new ObjectId(findUserId)})
            }
            if (!user) {
                return {error: true, message: "User doesn't exist!"}
            }

            // UPDATE USER
            await users.updateOne({
                _id: new ObjectId(user._id)
            }, {
                $set: {[key]: value}
            })
            return {error: false, success: true, message: `Updated [${key}] for user ${user._id}!`}
        } catch (e){
            console.error("update user: ", e)
            return {error: true, message: e.message || e || "Unknown error..."}
        }
    }

    static async log(level, api, action, description){
        try {
            const logsDir = path.join(process.cwd(), "logs")
            const logFile = path.join(logsDir, "log.jsonl")
            await fs.mkdir(logsDir, {recursive: true})

            const date = new Date().toISOString()
            const logEntry = {
                level, api, action, description, date
            }

            await fs.appendFile(logFile, JSON.stringify(logEntry) + "\n", "utf8");
        } catch (e){
            console.error("Failed to write to log: ", e)
        }
    }


    /*
            AI STUFF
     */
     static async suggestDeck(userCookie, message){
        // check if verified
         const auth = await this.getUserAuth(userCookie)
         if (auth.error){
            return {success: false, error: true, message: auth.message}
         }
        // then send message
        /*
         const ai = new GoogleGenAI({});
         const response = await ai.models.generateContent({
             model: "gemini-3-flash-preview",
             contents: "Explain how AI works in a few words",
         });
         */
         const project = new AIProjectClient(process.env.PROJECT_ENDPOINT, new DefaultAzureCredential());

         const openAIClient = await project.getOpenAIClient();
         const response = await openAIClient.responses.create({
             input: (message || "Generate a deck by selecting two cards at random and create the deck around their abilities/types.") + " Ensure response is JSON parseable.",
             store: false,
             agent_reference: {
                 name: process.env.AGENT_NAME,
                 version: process.env.AGENT_VERSION,
                 type: "agent_reference",
             },
         });
         let res;
         try {
             res = JSON.parse(response?.output_text);
             res = res.deck
         } catch (e){
                console.log(e, response?.output_text);
             return {success: false, error: true, message: `Could not parse response.`}
         }
         // check if it is usable...
         const {error: vdError, message: vdMessage} = await this.verifyDeck({...res,
            type: "Private"
         })
         if (vdError) {
             console.log(res);
            return {success: false, error: vdError, message: `Response was not valid: ${vdMessage}`}
         }

         return {
            success: true, error: false, message: res
         }
     }
}
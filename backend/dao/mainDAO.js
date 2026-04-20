import bcrypt from "bcrypt";

let cards;
let users;
let decks;
import mongodb from "mongodb"
import jwt from "jsonwebtoken";
const ObjectId = mongodb.ObjectId

export default class MainDAO {
    static async injectDB(conn) {
        // CARDS
        if (cards) {
            return
        }
        try {
            cards = await conn.db(process.env.ATLAS_NAME).collection("cards")
        } catch (e) {
            console.error(`unable to connect in MainDAO: ${e}`)
        }
        // USERS
        if (users) {
            return
        }
        try {
            users = await conn.db(process.env.ATLAS_NAME).collection("card_users")
        } catch (e) {
            console.error(`unable to connect in MainDAO: ${e}`)
        }
        // USERS
        if (decks) {
            return
        }
        try {
            decks = await conn.db(process.env.ATLAS_NAME).collection("card_decks")
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

    static async getUserAuth() {

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
            const cardsList = await cursor.toArray()
            const totalNumCards = await cards.countDocuments(query)
            return {cardsList, totalNumCards}
        } catch (e) {
            console.error(`Unable to issue find command, ${e}`)
            console.error(e)
            return {cardsList: [], totalNumCards: 0}
        }
    }

    static async getUser(userCookie) {
        // assume cookie is decoded as object
        try {
            if (typeof userCookie !== "object" && !userCookie?.id) {
                return {error: true, message: "User not authenticated!"}
            }
            const user = await users.findOne({_id: new ObjectId(userCookie.id)})
            if (!user) {
                return {error: true, message: "User doesn't exist!"}
            }
            return {user, success: true, error: false, message: "User Authenticated!"}
        } catch (e) {
            return {error: true, message: e.message}
        }
    }

    static async getDeck(deckId, password) {
        if (!decks) {
            return {error: true, message: "Cannot connect to DB!", deck: null}
        }
        let deck = await decks.findOne({_id: new ObjectId(deckId)})
        if (!deck) {
            return {error: true, message: "Deck doesn't exist!"}
        }
        if (deck.password) {
            if (!password){ return {error: true, message: "Password required!"}  }
            const pwdMatch = bcrypt.compareSync(password, deck.password)
            if (!pwdMatch) {
                return {error: true, message: "Password doesn't match!"}
            }
        }
        const finCards = await cards.find({_id: {$in: deck.cards.map(x => new ObjectId(x))}}).toArray()
        const finDeck = {...deck, cards: finCards}
        return {deck: finDeck, success: true, error: false, message: "Deck found!"}
    }

    static async getUserDecks(userCookies) {
        try {
            if (!decks) {
                return {error: true, message: "Cannot connect to DB!", deck: null}
            }
            const {user} = await this.getUser(userCookies);

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
        const {cards, maxCards, tags, name} = deck
        if (cards?.length > maxCards){ return {error: true, message: "Deck is too big!"}}
        if (name?.length > 30){ return {error: true, message: "Deck name is too long!"}}
        if (!Array.isArray(tags) || tags.find(x => typeof x !== "string")){ return {error: true, message: "Incorrect tag format! Must be an array of strings."}}
        // CHECK CARDS
        // ???

        return {success: true, error: false, message: "Deck is valid!"}
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
             */
            const {cards, maxCards, tags, name, password} = deck
            const {error, message} = await this.verifyDeck(deck)
            if (error){return {error: true, message}}
            let hashedPassword = null
            if (password){
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
                password: hashedPassword
            })
            return {success: true, error: false, message: "Deck created!", deckId}
        } catch (e) {
            return {error: true, message: e.message}
        }
    }


}
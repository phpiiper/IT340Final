import express from 'express'
import MainController from './main.controller.js'

const router = express.Router()
/*
    AUTH
 */
router.route('/auth/checkLogin')
    .get(MainController.apiCheckLogin)
router.route('/auth/login')
    .post(MainController.apiLogin)
    // {email, password}
router.route('/auth/signOut')
    .get(MainController.apiSignOut)
router.route('/auth/register')
    .post(MainController.apiRegister)
    // {email, username, password}
 /*
    USER
  */
router.route('/user/decks')
    .get(MainController.apiGetUserDecks)
//      router.route('/user/update')
//          .put(MainController.apiLogin)
/*
    DECK + CARDs
 */
router.route('/cards')
    .get(MainController.apiGetCards)
router.route('/deck')
    .post(MainController.apiGetDeck)
    // {id, password}
router.route("/user/auth")
    .get(MainController.apiGetUserAuth)
    // debugging purposes ONLY
router.route('/deck/create')
    .post(MainController.apiCreateDeck)
    // {}
router.route('/deck/user')
    .get(MainController.apiGetUserDecks)
// router.route("/token").get(MainController.apiGetLoginToken)
export default router

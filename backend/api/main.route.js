import express from 'express'
import MainController from './main.controller.js'

const router = express.Router()
router.route('/auth/checkLogin')
    .get(MainController.apiCheckLogin)
router.route('/auth/register')
    .get(MainController.apiRegister)
router.route('/auth/signOut')
    .get(MainController.apiSignOut)

// router.route("/token").get(MainController.apiGetLoginToken)
export default router
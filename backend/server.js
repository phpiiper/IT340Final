import express from 'express';
import mainRoute from './api/main.route.js';
import dotenv from "dotenv"
import cookieParser from 'cookie-parser'
import cors from 'cors'
const app = express();
dotenv.config()
const allowedOrigin = process.env.FRONTEND_URL;

app.use(cors({
    origin: process.env.FRONTEND_URL,
    credentials: true,
    methods: ["GET","POST","OPTIONS"],
    allowedHeaders: ["Content-Type","Authorization"]
 }));

app.options(/.*/,cors({
    origin: allowedOrigin,
    credentials: true
}))

app.use(express.json())
app.use(cookieParser())
app.use("/api",mainRoute)

export default app;

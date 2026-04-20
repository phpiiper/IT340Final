import express from 'express';
import mainRoute from './api/main.route.js';
import dotenv from "dotenv"
import cookieParser from 'cookie-parser'
import cors from 'cors'

const app = express();
dotenv.config()

app.use(express.json());
app.use(cookieParser());
app.use(cors({
    origin: "http://localhost:4200",
    credentials: true
 }));
app.use('/api', mainRoute);

export default app;